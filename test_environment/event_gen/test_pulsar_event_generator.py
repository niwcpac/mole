import pulsar
import requests
import json
import time

# setup django triggers
# Send pulsar message
# check results

django_ip = "django"
django_port = 8000


def test_event_gen_requested_data():
    """
    Check that requested data is correctly attached to the right events
    """
    status_topic_data = {
        "field1": "status_topic_value",
    }
    aux_topic_data = {
        "aux_field": "aux_field_value",
    }

    client = pulsar.Client("pulsar://pulsar:6650")

    producer_aux_topic = client.create_producer("public/default/aux_topic")
    producer_aux_topic.send(json.dumps(aux_topic_data).encode())
    producer_status_topic = client.create_producer("public/default/status_topic")
    producer_status_topic.send(json.dumps(status_topic_data).encode())
    time.sleep(7)

    events = requests.get(f"http://{django_ip}:{django_port}/api/events/")
    event = events.json()["results"][0]
    assert event["metadata"]["final_field1"] == "status_topic_value"
    assert event["metadata"]["final_field2"] == "aux_field_value"

    status_topic_data["field1"] = "new_value"
    producer_status_topic.send(json.dumps(status_topic_data).encode())
    time.sleep(7)

    events = requests.get(f"http://{django_ip}:{django_port}/api/events/")
    event = events.json()["results"][0]
    assert event["metadata"]["final_field1"] == "new_value"
    assert event["metadata"]["final_field2"] == "aux_field_value"

    status_topic_data["field1"] = "new_status_value"
    aux_topic_data["aux_field"] = "new_aux_value"
    producer_aux_topic.send(json.dumps(aux_topic_data).encode())
    producer_status_topic.send(json.dumps(status_topic_data).encode())
    time.sleep(7)

    events = requests.get(f"http://{django_ip}:{django_port}/api/events/")
    event = events.json()["results"][0]
    assert event["metadata"]["final_field1"] == "new_status_value"
    assert event["metadata"]["final_field2"] == "new_aux_value"

    client.close()


def test_event_gen_multiple_cond_vars():
    """
    Check if a condition with multiple condition variables is checked correctly
    Also check that the correct trigger is associated with the event
    """
    data1 = {
        "field": "value1",
    }
    data2 = {
        "other_field": "value2",
    }
    client = pulsar.Client("pulsar://pulsar:6650")
    producer1 = client.create_producer("public/default/random_topic")
    producer2 = client.create_producer("public/default/other_random_topic")

    current_trial = requests.get(
        f"http://{django_ip}:{django_port}/api/trials/current/"
    )
    current_trial = current_trial.json()["url"]

    event_count_before = requests.get(f"{current_trial}event_count")
    event_count_before = event_count_before.json()["total_events"]

    producer1.send(json.dumps(data1).encode())
    producer2.send(json.dumps(data2).encode())
    time.sleep(7)

    event_count_after = requests.get(f"{current_trial}event_count")
    event_count_after = event_count_after.json()["total_events"]

    assert event_count_after == event_count_before + 1

    events = requests.get(f"http://{django_ip}:{django_port}/api/events/")
    event = events.json()["results"][0]
    assert event["event_type"]["name"] == "Type Two"
    assert event["trigger"]["key"] == "key2"

    client.close()


def test_event_gen_create_event():
    """
    Check if a passing condition on a trigger creates an event
    if it's configured to
    """

    data = {
        "key": True,
    }

    client = pulsar.Client("pulsar://pulsar:6650")
    producer1 = client.create_producer("public/default/testtopic")

    current_trial = requests.get(
        f"http://{django_ip}:{django_port}/api/trials/current/"
    )
    current_trial = current_trial.json()["url"]

    event_count_before = requests.get(f"{current_trial}event_count")
    event_count_before = event_count_before.json()["total_events"]

    producer1.send(json.dumps(data).encode())
    time.sleep(7)

    event_count_after = requests.get(f"{current_trial}event_count")
    event_count_after = event_count_after.json()["total_events"]

    assert event_count_after == event_count_before + 1

    events = requests.get(f"http://{django_ip}:{django_port}/api/events/")
    event = events.json()["results"][0]
    assert event["event_type"]["name"] == "Test Event Type"
    assert event["trigger"]["key"] == "key3"

    client.close()


def test_event_gen_dont_create_event():
    """
    Check if a passing condition on a trigger doesn't creates an event
    if it's not configured to
    """
    data = {
        "key": "no_create",
    }

    client = pulsar.Client("pulsar://pulsar:6650")
    producer1 = client.create_producer("public/default/testtopic")

    current_trial = requests.get(
        f"http://{django_ip}:{django_port}/api/trials/current/"
    )
    current_trial = current_trial.json()["url"]

    event_count_before = requests.get(f"{current_trial}event_count")
    event_count_before = event_count_before.json()["total_events"]

    producer1.send(json.dumps(data).encode())
    time.sleep(7)

    event_count_after = requests.get(f"{current_trial}event_count")
    event_count_after = event_count_after.json()["total_events"]

    assert event_count_after == event_count_before
    client.close()
