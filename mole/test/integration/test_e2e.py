import json
import time
import requests

import redis


def test_node_message(node_message_fixture):
    """
    Test a simulated message from a node
    """
    test_message = {
        "node_physical_id": "pi23",
        "agent_physical_id": "test_agent",
        "agent_payload": None,
        "timestamp": time.time(),
        "msg_type": "asdasdasd",
        "event_type": "Agent In",
    }

    _redis_pub = redis.Redis(host="redis", decode_responses=True)
    _redis_pub.publish("/node/data", json.dumps(test_message))
    time.sleep(1)
    data = requests.get("http://django:8000/api/events/").json()
    assert data["results"][0]["event_type"]["name"] == "Agent In"


def test_caching_bug(caching_bug_fixture):
    test_message_dict1 = {
        "physical_id": "pi10",
        "state": "unregistered",
    }
    test_message_dict2 = {
        "physical_id": "pi34",
        "state": "unregistered",
    }

    _redis_pub = redis.Redis(host="redis", decode_responses=True)
    _redis_pub.publish("/fiducials/status", json.dumps(test_message_dict1))
    _redis_pub.publish("/fiducials/status", json.dumps(test_message_dict2))
    time.sleep(1)

    data = requests.get("http://django:8000/api/events/").json()

    # Events are ordered in descending start datetime, i.e. newest first
    message1_result = data["results"][1]["metadata"]["triggered_value"]
    message2_result = data["results"][0]["metadata"]["triggered_value"]

    assert message1_result != message2_result


def test_eval_trigger_multi_key_single_channel(multi_trigger_eval_fixture):
    """
    Multiple triggers on the same channel evaluating True should create an event
    of their own default event type if the message doesn't
    contain an event type, not the event type of the previous trigger
    """

    # Notice the message doesn't have a provided event_type key
    dict_to_test = {
        "field1": True,
    }

    _redis_pub = redis.Redis(host="redis", decode_responses=True)
    _redis_pub.publish("channel1", json.dumps(dict_to_test))
    time.sleep(1)
    r = requests.get("http://django:8000/api/events/")

    # Since both triggers evaluate True, the two events should be different, since
    # the default event types for the triggers are different
    assert (
        r.json()["results"][1]["event_type"]["name"]
        != r.json()["results"][0]["event_type"]["name"]
    )
