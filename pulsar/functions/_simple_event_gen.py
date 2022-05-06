#!/usr/bin/env python3
import urllib.parse
import re
import json
import datetime

import pulsar
from pulsar import Function

import redis
import requests
from asteval import Interpreter

# This function should not be modified
class TriggerEvaluator(Function):
    def __init__(self):
        self.r = redis.Redis(host="redis", port=6379, decode_responses=True, db=2)
        self.client = pulsar.Client("pulsar://pulsar_proxy:6650")

    def process(self, input, context):
        logger = context.get_logger()
        topic = context.get_current_message_topic_name().split("/")[-1]
        my_message_dict = json.loads(input)
        my_message_dict["processed_datetime"] = datetime.datetime.now(
            tz=datetime.timezone.utc
        )

        reader = self.client.create_reader(
            context.get_current_message_topic_name(), pulsar.MessageId.earliest
        )
        msg = reader.read_next(timeout_millis=5000)
        while msg.message_id() != context.get_message_id():
            msg = reader.read_next(timeout_millis=5000)
        publish_timestamp = msg.publish_timestamp()
        reader.close()

        logger.info(f"Message is: {my_message_dict}")
        logger.info(f"Topic is: {topic}")
        keys_to_check = self.r.smembers(topic)
        logger.info(
            f"Trigger keys associated with this topic is: {list(keys_to_check)}"
        )
        if not keys_to_check:
            logger.info("No keys associated with topic, skipping evaluation")
            return

        params = urllib.parse.urlencode({"key": keys_to_check}, doseq=True)
        url = f"http://django:8000/api/triggers/?{params}"
        r = requests.get(url)
        if not isinstance(r.json(), list):
            logger.warn(f"error retrieving triggers: {url}")
            return

        pattern = re.compile(r"(?P<var_name>\w+) ?: ?(?P<topic>.+)\.(?P<field>\w+)")
        for trig in r.json():
            logger.info(f"Checking trigger key: {trig['key']}...")
            trig_interpreter = Interpreter()
            trig_interpreter.symtable["msg"] = {}

            error_msg = ""
            for cv in trig["cond_vars"]:
                m = pattern.match(cv)
                topic = m.group("topic").replace("/", "_")
                cached_msgs = self.r.xrevrange(
                    name=f"event_gen:{topic}:cache", max=publish_timestamp, count=1,
                )
                if not cached_msgs:
                    error_msg = f"No cached messages for topic: {topic}"
                    break
                unencoded_dict = json.loads(cached_msgs[0][1]["encoded"])
                if m.group("field") not in unencoded_dict:
                    error_msg = (
                        f"Message on topic: {topic} missing field: {m.group('field')}"
                    )
                    break
                trig_interpreter.symtable["msg"][topic] = unencoded_dict
            if error_msg:
                logger.warn(error_msg)
                logger.info(
                    f"Condition check for trigger key: {trig['key']} has FAILED"
                )
                continue
            for cv in trig["converted_cond_vars"]:
                trig_interpreter(cv)

            # Evaluate the condition by passing in the string to the interpreter
            result = trig_interpreter(trig["condition"])
            if not result:
                logger.info(
                    f"Condition check for trigger key: {trig['key']} has FAILED"
                )
                continue

            logger.info(f"Condition check for trigger key: {trig['key']} PASSED")

            # Grab primary key if condition was sparked by an event POST/PATCH
            event_id = my_message_dict.get("provided_pk", None)

            if trig["creates_event"]:
                # If message has event_type, use that
                # otherwise use the default event_type of the trigger
                if "event_type" in my_message_dict:
                    event_type_name = my_message_dict["event_type"]
                    event_type_id = self.r.hget(
                        "event_gen:event_type_id_map", event_type_name
                    )
                    if not event_type_id:
                        event_type_url = f"http://django:8000/api/event_types/"
                        r = requests.get(url)
                        if isinstance(r.json(), list):
                            for entry in r.json():
                                self.r.hset(
                                    "event_gen:event_type_id_map",
                                    key=entry["name"],
                                    value=entry["id"],
                                )
                            event_type_id = self.r.hget(
                                "event_gen:event_type_id_map", event_type_name
                            )
                            if not event_type_id:
                                logger.warn(
                                    f"No id found for event type: {event_type_name}"
                                )
                                continue
                        else:
                            logger.warn(f"error retrieving event types: {url}")
                    event_type_url = (
                        f"http://localhost:8000/api/event_types/{event_type_id}/"
                    )
                else:
                    event_type_url = trig["event_type"]

                trigger_url = trig["url"]

                try:
                    start_time = my_message_dict["start_datetime"]
                except KeyError:
                    start_time = datetime.datetime.now(tz=datetime.timezone.utc)

                data = {
                    "event_type": event_type_url,
                    "trigger": trigger_url,
                    "start_datetime": start_time,
                }
                try:
                    response = requests.post(
                        "http://django:8000/api/events/",
                        data=data,
                        auth=("auto", "auto"),
                    )
                    logger.info(
                        f"event created from trigger key {trig['key']}: {response.json()['url']}"
                    )
                except requests.RequestException as e:
                    logger.warn(e)
                    logger.warn(data)

                event_id = response.json()["id"]

            event_url = f"http://django:8000/api/events/{event_id}/"
            accumulated_payload = {}
            for r_data in trig["req_data"]:
                # Make a copy of the dict to replace values
                payload_to_apply = dict(r_data["payload"])
                for key in r_data["payload"]:
                    if r_data["payload"][key] == "$EVENT$":
                        # field : $EVENT$"
                        payload_to_apply[key] = event_url
                    elif r_data["payload"][key] == "$TIME$":
                        # field : $TIME$
                        payload_to_apply[key] = datetime.datetime.now(
                            tz=datetime.timezone.utc
                        ).isoformat()
                    elif r_data["payload"][key].startswith("["):
                        # field : static_url_data
                        # ex. field : [http://localhost:8000/api/pose_sources/1/]
                        payload_to_apply[key] = r_data["payload"][key].strip("[]")
                    else:
                        # field : topic.source_field

                        # Split into topic and source field
                        fields = r_data["payload"][key].split(".")
                        if len(fields) != 2:
                            logger.warn(
                                f"requested data {r_data['payload'][key]} formatted incorrectly"
                            )
                            continue

                        cached_msgs = self.r.xrevrange(
                            name=f"event_gen:{fields[0]}:cache",
                            max=publish_timestamp,
                            count=1,
                        )
                        if not cached_msgs:
                            logger.warn(f"No cached messages for topic: {fields[0]}")
                            payload_to_apply.pop(key, None)
                            continue
                        unencoded_dict = json.loads(cached_msgs[0][1]["encoded"])
                        if fields[1] not in unencoded_dict:
                            logger.warn(
                                f"Message on topic: {topic} missing field: {fields[1]}"
                            )
                            payload_to_apply.pop(key, None)
                            continue
                        payload_to_apply[key] = unencoded_dict[fields[1]]

                # grab associated event with the event_id we have and update its metadata
                if r_data["destination_url"] == "$EVENT$":
                    # $EVENT$ means use the provided event id as destination url
                    # add payload dict to accumulated dict to apply later
                    accumulated_payload.update(payload_to_apply)
                else:
                    # use the destination url provided in the requested data instance
                    logger.info(
                        f"will post to destination url: {r_data['destination_url']}"
                    )
                    try:
                        # For now, assume that there is a user with these credentials
                        response = requests.post(
                            r_data["destination_url"],
                            data=payload_to_apply,
                            auth=("auto", "auto"),
                        )
                    except requests.RequestException as e:
                        logger.warn(
                            f"Failed to post to destination url: {r_data['destination_url']}\npayload: {payload_to_apply}"
                        )

            # Submit accumulated payload
            if accumulated_payload:
                logger.info(
                    f"will post payload: {accumulated_payload} to event: {event_url}"
                )
                try:
                    # For now, assume that there is a user with these credentials
                    response = requests.patch(
                        event_url,
                        data={"metadata": json.dumps(accumulated_payload)},
                        auth=("auto", "auto"),
                    )
                except requests.RequestException as e:
                    logger.warn(
                        f"Failed to post to destination url: {event_url}\npayload: {accumulated_payload}"
                    )

            return json.dumps({"event_id": event_id})
