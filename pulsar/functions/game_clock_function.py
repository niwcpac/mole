#!/usr/bin/env python3

from pulsar import Function

import requests
import json
import time

### FUNCTION DESCRIPTION: This function receives messages from django topics that the
# game clock cares about, and then pushes an update to the game_clock topic if the
# game clock state is likely to have changed.


### DEVELOPMENT: commands to delete and rebuild from pulsar container
# DELETE: bin/pulsar-admin functions delete --fqfn public/default/game_clock_function
# CREATE: ./create_functions.py game_clock_function

body = {
    # The fully qualified function name (tenant/namespace/function_names)
    "fqfn": "public/default/game_clock_function",
    # The location of the python module for the pulsar function
    "py": "/pulsar/functions/game_clock_function.py",
    # The name of the class for the pulsar function
    # Note: the filename is necessary but not included in the class name
    # The class name will be used as the default name of the function and corresponding
    # fully qualified function name if one is not specified (Example in this case)
    "className": "game_clock_function.GameClock",
    # a list of input topics for this function to monitor
    "inputs": [
        "persistent://public/default/_event_log",
        "persistent://public/default/_trial_log",
        "persistent://public/default/_clock_config_log",
        "persistent://public/default/_clock_phase_log",
    ],
    # the output topic for any return values to be propagated to
    # if this isn't set, no output is written
    # "output": "persistent://public/default/game_clock",
    # the topic where logs for the pulsar function are produced
    "logTopic": "persistent://public/default/log_topic",
}


class GameClock(Function):
    def __init__(self):
        # Any one-off initialization can be done here
        self.error_output = '{\
            "detail": "No clock state for current trial.",\
            "minor": {"detail": "No clock state for minor trial."},\
            "major": {"detail": "No clock state for major trial."},\
        }'
        self.calltime = 0
        pass

    def publish(self, context, data):
        data_obj = json.loads(data)
        data_obj["calltime"] = str(self.calltime)
        data = json.dumps(data_obj)
        context.get_logger().info(data)
        context.publish("persistent://public/default/game_clock", data)

    def process(self, input, context):
        logger = context.get_logger()

        self.calltime = int(time.time() * 1000.0)

        # The input should be encoded in UTF-8, UTF-16 or UTF-32
        data = json.loads(input)

        logger.info(data)

        # start with update flag, then check message for condition to send update
        update_clock_state = False

        topic = context.get_current_message_topic_name()

        # message received due to event create or update
        if topic == "persistent://public/default/_event_log":

            if data["event_type_id"]:

                try:
                    # put all clock phases in a string for quick check for event type
                    clock_phases_request = requests.get(
                        "http://django:8000/api/clock_phases"
                    )
                    clock_phases = clock_phases_request.text
                    clock_phases_str = "".join(clock_phases)

                    # only push clock state update if event is referenced in a clock phase
                    if data["update"]:
                        update_clock_state = True
                    else:
                        event_type_url = f"/api/event_types/{data['event_type_id']}"
                        if event_type_url in clock_phases_str:
                            update_clock_state = True

                except requests.exceptions.RequestException as e:
                    self.publish(context, self.error_output)
                    return

        # message received due to trial create or update
        if topic == "persistent://public/default/_trial_log":
            update_clock_state = True

        # message received due to game clock config/phase create or update
        if (
            topic == "persistent://public/default/_clock_config_log"
            or topic == "persistent://public/default/_clock_phase_log"
        ):
            update_clock_state = True

        # perform clock state update
        if update_clock_state:
            try:
                current_trial_request = requests.get(
                    "http://django:8000/api/trials/current"
                )
                current_trial = json.loads(current_trial_request.text)
                trial_id = current_trial["id"]

            except requests.exceptions.RequestException as e:
                self.publish(context, self.error_output)
                return

            if trial_id:
                try:
                    clock_state_request = requests.get(
                        f"http://django:8000/api/trials/{trial_id}/clock_state"
                    )
                    clock_state = clock_state_request.text
                    self.publish(context, clock_state)
                except requests.exceptions.RequestException as e:
                    self.publish(context, self.error_output)

        return update_clock_state
