#!/usr/bin/env python3
import json
import datetime
import os

import pulsar
import redis
import requests

import time

body = {
    "fqfn": "public/default/create_script_event",
    "py": "/pulsar/functions/create_script_event.py",
    "className": "create_script_event.CreateScriptEvent",
    "inputs": ["persistent://public/default/_create_script_event",],
    # "output": "persistent://public/default/output",
    "logTopic": "persistent://public/default/create_script_event_log",
}

# Listen to log:
# bin/pulsar-client consume persistent://public/default/create_script_event_log -n 0 -s create_script_event_log


class CreateScriptEvent(pulsar.Function):
    def __init__(self):
        self.delaySeconds = 900  # wait 15 minutes from run start event

        redis_ip = os.environ.get("REDIS_IP", "redis")
        redis_port = os.environ.get("REDIS_PORT", "6379")
        self.redis_client = redis.Redis(
            host=redis_ip, port=redis_port, decode_responses=False
        )
        self.ip = os.environ.get("DJANGO_IP", "django")
        self.port = os.environ.get("DJANGO_PORT", "8000")

    def post_event(self, logger, input_dict):
        logger.info("Create event request received, creating event.")
        event_type_id = self.redis_client.hget(
            "event_type_map", input_dict["event_type"]
        )
        event_type_id = event_type_id.decode("utf-8")

        if event_type_id:
            input_dict["event_type"] = f"/api/event_types/{event_type_id}/"
        else:
            return

        logger.info("Posting event")
        r = requests.post(
            f"http://{self.ip}:{self.port}/api/events/",
            auth=("auto", "auto"),
            json=input_dict,
        )
        if r.status_code > 201:
            logger.warn(f"{r.status_code} - {r.content} - {input_dict}")
            raise Exception(
                f"Was not able to post event, {r.status_code} - {r.content} - {input_dict}"
            )
        url = r.json()["url"]
        to_return = f"{r.status_code} - {url}"
        logger.info(to_return)

    def test_event_type_map(self):
        event_type_test = self.redis_client.hgetall("event_type_map")
        if not event_type_test:
            url = f"http://{self.ip}:{self.port}/api/event_types/"
            r = requests.get(url)
            if r.status_code > 200:
                error_string = f"{url} - {r.status_code} - {r.content}"
                logger.warn(error_string)
                raise Exception(error_string)

            for event_type in r.json():
                self.redis_client.hset(
                    "event_type_map", event_type["name"], event_type["id"]
                )

    def process(self, input, context):
        self.test_event_type_map()

        logger = context.get_logger()
        topic = context.get_current_message_topic_name()
        message_id = context.get_message_id()
        input_dict = json.loads(input)

        if "cancel" in input_dict.keys():
            logger.info("Beginning cancel event process")
            # scheduled_events = self.redis_client.hgetall("scheduled_message_map")

            while self.redis_client.llen("scheduled_message_keys") != 0:
                key = self.redis_client.lpop("scheduled_message_keys")
                scheduled_event = self.redis_client.hget("scheduled_message_map", key)
                msg_id = message_id.deserialize(scheduled_event)
                context.ack(msg_id, topic)
                logger.info(str(msg_id) + " cancelled")
                self.redis_client.hdel("scheduled_message_map", key)

        if "event_type" in input_dict.keys():
            logger.info("Beginning create event process")
            self.post_event(logger, input_dict)

            # remove scheduled message from redis because it was processed
            self.redis_client.hdel("scheduled_message_map", *[str(message_id)])
