import os
import json
import automation.factories.factories as factories
from django.shortcuts import get_object_or_404
from django.http import Http404
import redis
import pulsar

import sys
import uuid

from data_collection.models import Event


class ScenarioScripts:
    def __init__(self):
        redis_ip = os.environ.get("REDIS_IP", "redis")
        redis_port = os.environ.get("REDIS_PORT", "6379")
        self.redis_client = redis.Redis(
            host=redis_ip, port=redis_port, decode_responses=True
        )
        self.pulsar_client = pulsar.Client("pulsar://pulsar:6650")
        self.delay_seconds = 0

    def schedule_events(self, event):
        scripts = event.trial.scenario.scripts
        if len(scripts.all()) == 0:
            return

        if len(event.trial.script_run_count.all()) == 0:
            self.init_trial_script_run_count(event.trial, scripts)

        try:
            producer = self.pulsar_client.create_producer(
                "public/default/_create_script_event"
            )
        except Exception:  # Pulsar doesn't provide a subtype of Exception
            # abort the pulsar message if pulsar is not available
            return

        self.delay_seconds = 0

        for script in scripts.all():
            if (
                event.event_type in script.initiating_event_types.all()
                and script.scripted_event_head
                and self.check_script_condition(script, event)
            ):
                # because of the recursive algorithm, we need to set python's recursion
                # limit to the depth of the script
                self.set_recursion_limit(script)

                cond_passed = self.check_script_condition(
                    script.scripted_event_head, event
                )
                self.schedule_scripted_event(
                    producer, script.scripted_event_head, event, cond_passed
                )
                self.increment_script_run_count(event.trial, script)

                if script.auto_repeat_count:
                    self.schedule_script_repeat(
                        script, event, producer, cond_passed, script.auto_repeat_count
                    )
                else:
                    self.delay_seconds = 0  # reset delay
            elif event.event_type == script.cancelling_event_type:
                self.cancel_scheduled_events(producer)

        producer.close()
        return

    def schedule_script_repeat(
        self, script, event, producer, condition_passed, repeat_count
    ):
        if condition_passed and repeat_count > 0:
            repeat_count = repeat_count - 1
            cond_passed = self.check_script_condition(script.scripted_event_head, event)
            self.schedule_scripted_event(
                producer, script.scripted_event_head, event, cond_passed
            )
            self.increment_script_run_count(event.trial, script)

            self.schedule_script_repeat(
                script, event, producer, cond_passed, repeat_count
            )
        return

    def init_trial_script_run_count(self, trial, scripts):
        for script in scripts.all():
            factories.ScriptRunCountFactory(
                trial=trial,
                script=script,
                count=0,
            )

        return

    def increment_script_run_count(self, trial, script):
        count = trial.script_run_count.get(script__id=script.id)
        count.count = count.count + 1
        count.save()
        return

    def check_script_condition(self, script, event):
        cond_passed = False

        # check if the script's run limit has been met
        try:
            run_count = get_object_or_404(
                event.trial.script_run_count.all(), script__id=script.id
            )
            if run_count and run_count.count == script.run_limit:
                return False
        except (Http404, AttributeError):
            pass  # do nothing because it's evaluating a scripted event, not a script

        # if scripted event has no conditions, set true
        if len(script.conditions.all()) == 0:
            cond_passed = True
        else:
            cond_passed_list = []
            for cond in script.conditions.all():
                temp_passed = False

                # check if trial contains event in condition
                if cond.trial_has_event:
                    qry = Event.objects.filter(
                        trial__id=event.trial.id, event_type__id=cond.trial_has_event.id
                    )

                    # check if the event contains/excludes required metadata (if described)
                    if cond.event_metadata_contains:
                        qry = qry.filter(
                            metadata__icontains=cond.event_metadata_contains
                        )
                    if cond.event_metadata_excludes:
                        qry = qry.exclude(
                            metadata__icontains=cond.event_metadata_excludes
                        )

                    events = qry.values_list(*["id"])
                    if len(events) > 0:
                        temp_passed = True

                # check if trial is missing event in condition
                if cond.trial_missing_event:
                    qry = Event.objects.filter(
                        trial__id=event.trial.id, event_type__id=cond.trial_has_event.id
                    ).values_list(*["id"])
                    if len(qry) == 0:
                        temp_passed = True

                # check if the triggering metadata contains/excludes specified substring
                meta_str = json.dumps(event.metadata)
                if cond.trigger_metadata_contains:
                    if cond.trigger_metadata_contains in meta_str:
                        temp_passed = True
                if cond.trigger_metadata_excludes:
                    if cond.trigger_metadata_excludes not in meta_str:
                        temp_passed = True

                cond_passed_list.append(temp_passed)

            if script.conditions_pass_if_any:
                cond_passed = any(cond_passed_list)
            else:
                cond_passed = all(cond_passed_list)

        return cond_passed

    def schedule_scripted_event(self, producer, script, event, condition_passed):

        if condition_passed:

            metadata = script.add_event_metadata

            if script.copy_trigger_metadata:
                for key, val in event.metadata.items():
                    metadata[key] = val

            event_data = {
                "trial": f"/api/trials/{event.trial.id}/",
                "event_type": script.event_type.name,
                "metadata": metadata,
            }

            self.delay_seconds = self.delay_seconds + script.delay_seconds

            if self.delay_seconds == 0 and script.delay_seconds == 0:
                producer.send_async(json.dumps(event_data).encode("utf-8"), None)
            else:
                deliver_time = (
                    int(event.modified_datetime.timestamp() + self.delay_seconds) * 1000
                )
                event_data["deliver_at"] = deliver_time
                producer.send_async(
                    json.dumps(event_data).encode("utf-8"),
                    self.scheduled_message_callback,
                    deliver_at=deliver_time,
                )

        if script.next_scripted_event:
            cond_passed = self.check_script_condition(script.next_scripted_event, event)
            self.schedule_scripted_event(
                producer, script.next_scripted_event, event, cond_passed
            )

        return

    def cancel_scheduled_events(self, producer):
        # scheduled_events = self.redis_client.hgetall("scheduled_message_map")
        cancel_msg = {"cancel": "all"}
        producer.send_async(json.dumps(cancel_msg).encode("utf-8"), None)

    def scheduled_message_callback(self, res, msg_id):
        unique_id = str(uuid.uuid4())
        self.redis_client.hset("scheduled_message_map", unique_id, msg_id.serialize())
        self.redis_client.lpush("scheduled_message_keys", unique_id)
        print(unique_id + " scheduled.")
        return

    def set_recursion_limit(self, script):
        # get depth of script
        script_depth = self.get_script_depth(script)
        recursion_count = script_depth * (script.auto_repeat_count + 1)

        if recursion_count > sys.getrecursionlimit():
            sys.setrecursionlimit(recursion_count)

    def get_script_depth(self, script):
        scripted_event = script.scripted_event_head

        depth = 1
        while scripted_event.next_scripted_event:
            depth = depth + 1
            scripted_event = scripted_event.next_scripted_event

        return depth
