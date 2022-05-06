import json
import time
import requests

import redis


def test_requested_data_key(req_data_key_fixture):
    """
    Test requested data missing a key it needs
    """
    _redis_pub = redis.Redis(host="redis", decode_responses=True)

    test_message = {
        "unused_field": "unused_field",
        "field": "test",
        "field2": "test2",
    }
    _redis_pub.publish("/topic", json.dumps(test_message))
    time.sleep(1)
    data = requests.get("http://django:8000/api/events/").json()
    assert "field" in data["results"][0]["metadata"]
    assert "field2" in data["results"][0]["metadata"]

    test_message = {
        "unused_field": "unused_field",
        "field": "test",
    }
    _redis_pub.publish("/topic", json.dumps(test_message))
    time.sleep(1)
    data = requests.get("http://django:8000/api/events/").json()
    assert "field" in data["results"][0]["metadata"]
    assert "field2" not in data["results"][0]["metadata"]

    test_message = {
        "unused_field": "unused_field",
        "field2": "test2",
    }
    _redis_pub.publish("/topic", json.dumps(test_message))
    time.sleep(1)
    data = requests.get("http://django:8000/api/events/").json()
    assert "field" not in data["results"][0]["metadata"]
    assert "field2" in data["results"][0]["metadata"]
