#!/usr/bin/python3
import json
import time
import re
import logging
import random
from string import ascii_lowercase
import datetime
import os

import requests
import redis
import pulsar
from requests_toolbelt import MultipartEncoder

pulsar_ip = os.environ.get("PULSAR_IP", "pulsar")
pulsar_http_port = 8080

django_ip = os.environ.get("DJANGO_IP", "django")
django_port = 8000

redis_ip = os.environ.get("REDIS_IP", "redis")
redis_port = 6379

logger = logging.getLogger(__name__)


class MessageProcesser(object):
    def __init__(self):
        self.client = pulsar.Client(f"pulsar://{pulsar_ip}:6650")

        # Wait for pulsar function workers to be ready
        while True:
            r = None
            try:
                r = requests.get(
                    f"http://{pulsar_ip}:{pulsar_http_port}/admin/v2/worker/cluster/leader/ready"
                )
            except requests.RequestException as e:
                print(e)
                print("Pulsar not up, waiting...")
                time.sleep(1)
            if r and r.ok:
                break

        # wait for django to spin up to retrieve triggers
        n = 1
        while True:
            triggers = None
            try:
                triggers = requests.get(
                    f"http://{django_ip}:{django_port}/api/triggers/"
                )
            except requests.RequestException as e:
                n = min(64, (2**n))
                print(f"Django web server not up yet, waiting {n} seconds")
                time.sleep(n)
            if triggers and triggers.ok:
                break
        self.redis_client = redis.Redis(
            host=redis_ip, port=redis_port, decode_responses=True, db=2
        )
        self.redis_client.flushdb()
        pattern = re.compile(r"(?P<var_name>\w+) ?: ?(?P<topic>.+)\.(?P<field>\w+)")

        for trig in triggers.json():
            for cv in trig["cond_vars"]:
                m = pattern.match(cv)
                topic = m.group("topic").replace("/", "_")
                # list of all topics to listen to
                # tenant assumed to be "public"
                # namespace assumed to be "default"
                self.redis_client.sadd("event_gen:all_topics", topic)

                # associate trigger key with topic
                # so we don't have to check all triggers for all received messages
                if trig["is_active"]:
                    self.redis_client.sadd(topic, trig["key"])

            # we also want requested data topics
            for rq in trig["req_data"]:
                for value in rq["payload"].values():
                    parts = value.split(".")
                    if len(parts) != 2:
                        continue
                    topic = parts[0].replace("/", "_")
                    self.redis_client.sadd("event_gen:all_topics", topic)

        list_of_topics = [
            "".join(["public/default/", x])
            for x in self.redis_client.smembers("event_gen:all_topics")
        ]
        logger.info(list_of_topics)
        random_suffix = "".join(random.choices(population=ascii_lowercase, k=8))
        self.consumer = self.client.subscribe(
            topic=list_of_topics,
            subscription_name=f"event_generator_{random_suffix}",
            message_listener=self.cache_message,
        )

        body = {
            "fqfn": "public/default/_simple_event_gen",
            "py": "/pulsar/functions/_simple_event_gen.py",
            "className": "_simple_event_gen.TriggerEvaluator",
            "inputs": [
                # to be filled out when triggers are retrieved
            ],
            "output": "persistent://public/default/trigger_responses",
            "logTopic": "persistent://public/default/event_gen_log",
        }
        function_url = (
            f"http://{pulsar_ip}:{pulsar_http_port}/admin/v3/functions/{body['fqfn']}"
        )

        # Make sure the function doesn't exist yet
        r = requests.get(function_url)
        if r.ok:
            # skip creating the pulsar function
            print(f"Pulsar function already exists, skipping creation: {function_url}")
        else:
            print(f"Pulsar function does not exist, creating now...: {body['fqfn']}")

            body["inputs"] = [
                "".join(["public/default/", x])
                for x in self.redis_client.smembers("event_gen:all_topics")
            ]
            mp_encoder = MultipartEncoder(
                fields={
                    "url": f"file://{body['py']}",
                    "functionConfig": (None, json.dumps(body), "application/json"),
                }
            )
            headers = {"Content-Type": mp_encoder.content_type}

            while True:
                print(f"posting function: {body['fqfn']}")
                if not body["inputs"]:
                    print("no inputs detected, skipping event gen function creation")
                    break
                r = requests.post(function_url, data=mp_encoder, headers=headers)
                if r.ok:
                    print(f"Successfully posted: {body['fqfn']}")
                    break
                print(r.status_code, r.content)
                time.sleep(1)

    def cache_message(self, consumer, message):
        logger.info(message.value())
        # topic_name() returns tenant/namespace/topic
        # We want just the topic
        topic = message.topic_name().split("/")[-1]
        my_message_dict = json.loads(message.value())
        # publish timestamp is in milliseconds
        my_message_dict["published_datetime_stamp"] = message.publish_timestamp()
        my_message_dict["published_datetime"] = datetime.datetime.fromtimestamp(
            message.publish_timestamp() / 1000.0, tz=datetime.timezone.utc
        ).isoformat()

        logger.info(f"Message is: {my_message_dict}")
        logger.info(f"Topic is: {topic}")
        # print(json.dumps(my_message_dict, sort_keys=True, indent=4))

        n = 0
        while True:
            try:
                self.redis_client.xadd(
                    name=f"event_gen:{topic}:cache",
                    fields={"encoded": json.dumps(my_message_dict)},
                    id=f"{message.publish_timestamp()}-{n}",
                )
                break
            except redis.exceptions.ResponseError:
                # This error happens if there are multiple messages
                # within the same millisecond, increment
                # the secondary id to deconflict
                n += 1

        consumer.acknowledge(message)

    def start(self):
        self.consumer.resume_message_listener()


if __name__ == "__main__":
    message_processor = MessageProcesser()
    print("Finished initializing message processor")
    message_processor.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Interrupted.")
