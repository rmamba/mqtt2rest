const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');
const axios =require('axios');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const DEBUG = (process.env.DEBUG || 'false') === 'true';
const HEADER_API_KEY = process.env.HEADER_API_KEY || 'x-api-key';
const WEBUI_PORT = parseInt(process.env.WEBUI_PORT || '38900');
const MQTT_CLIENT_ID = process.env.MQTT_CLIENT_ID || 'wizLights';
const MQTT_SERVER = process.env.MQTT_SERVER || '127.0.0.1';
const MQTT_PORT = process.env.MQTT_PORT || '1883';
const MQTT_SUB = process.env.MQTT_SUB || 'mqtt2rest/#';

const REDIS_REST_URI_BASE = process.env.REDIS_REST_URI_BASE || 'http://localhost:3333';
const REDIS_REST_API_KEY = process.env.REDIS_REST_API_KEY;

let UPDATE_INTERVAL = parseInt(process.env.UPDATE_INTERVAL || '1000');
if (UPDATE_INTERVAL < 250) {
    UPDATE_INTERVAL = 250;
}

let mqttClient;
const cache = {};

const updateCache = (path, data) => {
    const d = path.split('/');
    let c = cache;
    d.forEach((s, i) => {
        if (!c[s]) {
            c[s] = {};
        }
        if (i < d.length-1) {
            c = c[s];
            return;
        }
        c[s] = data;
    });
}

const publishData = async (topic, payload, headers) => {
    try {
        const start = Date.now();
        const resp = await axios
            .post(
                `${REDIS_REST_URI_BASE}/publish/${topic}`,
                payload,
                headers
            );
        if (DEBUG) {
            console.log(`${topic}: ${Date.now() - start}ms`);
        }
    } catch (err) {
        console.error(err);
    }
    
};

const run = async () => {
    const mqttConfig = {
        clientId: MQTT_CLIENT_ID,
        rejectUnauthorized: false,
        keepalive: 15,
        connectTimeout: 1000,
        reconnectPeriod: 500,
    };

    if (process.env.MQTT_USER) {
        mqttConfig.username = process.env.MQTT_USER;
    }
    if (process.env.MQTT_PASS) {
        mqttConfig.password = process.env.MQTT_PASS;
    }

    console.log(`Connecting to MQTT server ${MQTT_SERVER}:${MQTT_PORT} ...`);
    mqttClient = mqtt.connect(`mqtt://${MQTT_SERVER}:${MQTT_PORT}`, mqttConfig);

    // mqttClient.on('connect', () => {
    //     console.log('.');
    // });
    
    mqttClient.on('error', (err) => {
        console.log(err);
        process.exit(1);
    });

    mqttClient.on('message', (topic, buffer) => {
        let payload = buffer.toString();
        let isJSON = false;
        if (payload.startsWith('{')) {
            payload = JSON.parse(payload);
            isJSON = true;
        }
        updateCache(topic, payload);
        const requestHeaders = {
            'content-type': 'text/json'
        };
        if (REDIS_REST_API_KEY) {
            requestHeaders[HEADER_API_KEY] = REDIS_REST_API_KEY;
        }
        publishData(
            topic,
            isJSON ? JSON.stringify(payload) : payload.toString(),
            {
                headers: requestHeaders,
            },
        );
    });
    
    while (!mqttClient.connected) {
        await sleep(1000);
    }

    console.log();
    console.log('MQTT server connected...');
    const subs = MQTT_SUB.split('|');
    subs.forEach(sub => {
        console.log(`Subscribing too ${sub}`);
        mqttClient.subscribe(sub);
    });

    console.log(`Setting up express server on port ${WEBUI_PORT}...`);
    const app = express();
    app.use(express.json());
    app.use(cors());

    app.get('/', function (req, res) {
        res.setHeader("Content-Type", "application/json");
        res.status(200);
        res.json(cache);
    });

    app.listen(WEBUI_PORT)
    console.log('Done...');
}

run();
