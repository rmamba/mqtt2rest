# WHAT is mqtt2rest?

This container will update Redis values everytime MQTT data changes and send it to REST endpoint.

# MQTT Configuration

You can define MQTT server via env variables like so:
```
MQTT_SERVER=127.0.0.1
MQTT_PORT=1883
MQTT_USER=
MQTT_PASS=
MQTT_SUB=DDS238/#
```
The values listed are default so you can only use the env variable if you want to change it.
`MQTT_SUB` accepts string separated by `|` to listen to multiple paths.

# REST Configuration

You can define POST requests via env variables like so:
```
REDIS_REST_URI_BASE=http://localhost:3333
REDIS_REST_API_KEY=
```
The values listed are default so you can only use the env variable if you want to change it.
If `REDIS_REST_API_KEY` is specified it will be attached to the outgoing POST requests.

# Data collection

You can use my [rest2redis](https://github.com/rmamba/rest2redis) project to capture data and push it to REDIS.

# Docker

Start your container with this command replacing values to match your system:
```
docker run --name mqtt2rest -v /mnt/cache/appdata/mqtt2rest:/openvpn -e MQTT_SERVER=192.168.13.37 -e MQTT_USER=user -e MQTT_PASS=password -e REDIS_CONNECTION=redis://localhost:6379 -e REDIS_PASS=1337 -e REDIS_DB=10 -d rmamba/mqtt2rest
```
