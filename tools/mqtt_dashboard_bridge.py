"""
MQTT to Dashboard Bridge for SecureNodeX.
Subscribes to Mosquitto on port 1883 and forwards device telemetry messages
directly to the Web Dashboard stream at http://localhost:8443/v1/telemetry/publish.
"""

import base64
import json
import logging
import sys
import time
import urllib.request
import paho.mqtt.client as mqtt

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("mqtt-bridge")

API_PUBLISH_URL = "http://localhost:8443/v1/telemetry/publish"
BROKER_HOST = "localhost"
BROKER_PORT = 1883
TOPIC = "snx/v1/dev/+/telemetry"


def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        logger.info(f"Connected to Mosquitto broker at {BROKER_HOST}:{BROKER_PORT}")
        client.subscribe(TOPIC)
        logger.info(f"Subscribed to topic: {TOPIC}")
    else:
        logger.error(f"Failed to connect to Mosquitto, rc={rc}")


def on_message(client, userdata, msg):
    try:
        topic = msg.topic
        payload_str = msg.payload.decode("utf-8")
        data = json.loads(payload_str)
        logger.info(f"Received MQTT msg from {data.get('d', 'unknown')} on {topic}")

        # Post to dashboard stream endpoint
        req = urllib.request.Request(
            API_PUBLISH_URL,
            data=json.dumps(data).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=3) as resp:
            logger.info(f"Forwarded to Dashboard stream: HTTP {resp.status}")
    except Exception as e:
        logger.warning(f"Error handling MQTT message: {e}")


def main():
    logger.info("Starting SecureNodeX MQTT -> Dashboard Bridge...")
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = on_connect
    client.on_message = on_message

    try:
        client.connect(BROKER_HOST, BROKER_PORT, 60)
        client.loop_forever()
    except KeyboardInterrupt:
        logger.info("Stopping bridge.")
    except Exception as e:
        logger.error(f"Bridge error: {e}")


if __name__ == "__main__":
    main()
