import time

import pytest
import redis

from data_collection.factories import factories


@pytest.fixture()
def weather_and_trial():
    factories.TrialFactory(id_major=1, id_minor=2, id_micro=3)
    factories.WeatherFactory(name="Thunderstorm")


@pytest.fixture()
def node_message_fixture(weather_and_trial):
    cv = factories.ConditionVariableFactory(
        name="Condition variable for activating dsa dedicated to event creating",
        variable="unused_var : /node/data.msg_type",
    )
    new_trigger = factories.TriggerFactory(
        name="Event Creation Trigger",
        key="make_event",
        description="Create an event in response to a message",
        is_active=True,
        is_manual=False,
        creates_event=True,
        condition="True",
        condition_variables=[cv],
        event_type=factories.EventTypeFactory(name="Agent In"),
        trigger_transport="redis",
    )

    _redis_pub = redis.Redis(host="redis", decode_responses=True)
    _redis_pub.publish("/triggers_modified", "test string from node_message_fixture")
    # need time for trigger setup to do its thing
    time.sleep(3)

    yield  # provide the fixture value (which is None)

    # now clean up


@pytest.fixture()
def caching_bug_fixture(weather_and_trial):
    fiducial_state_var = factories.ConditionVariableFactory(
        name="fiducial_state_var",
        variable="fiducial_state_var : /fiducials/status.state",
    )

    fiducial_phys_id_triggered_value_requested_data = factories.RequestedDataFactory(
        name="Fiducial Physical ID",
        destination_url="$EVENT$",
        payload={"triggered_value": "/fiducials/status.physical_id"},
    )

    fiducial_register_trigger = factories.TriggerFactory(
        name="Test Fiducial Register Trigger",
        key="fiducial_register",
        is_active=True,
        is_manual=False,
        creates_event=True,
        condition='fiducial_state_var == "unregistered"',
        condition_variables=[fiducial_state_var],
        requested_dataset=[fiducial_phys_id_triggered_value_requested_data],
        event_type=factories.EventTypeFactory(name="Fiducial Unconfig"),
        trigger_transport="redis",
    )

    _redis_pub = redis.Redis(host="redis", decode_responses=True)
    _redis_pub.publish("/triggers_modified", "test string from caching_bug_fixture")
    # need time for trigger setup to do its thing
    time.sleep(3)

    yield  # provide the fixture value (which is None)

    # now clean up


@pytest.fixture()
def multi_trigger_eval_fixture(weather_and_trial):
    test_condition_var1 = factories.ConditionVariableFactory(
        variable="test_condition_var1 : channel1.field1"
    )

    event_type_name = "Interuption"
    event2_type_name = "Interuption2"
    factories.TriggerFactory(
        name="Yet Another Test Trigger",
        key="key_tetmksc",
        is_active=True,
        creates_event=True,
        condition="True",
        condition_variables=[test_condition_var1],
        event_type=factories.EventTypeFactory(name=event_type_name),
        trigger_responses=[],
    )
    factories.TriggerFactory(
        name="Yet Another Test Trigger 2",
        key="key_tetmksc2",
        is_active=True,
        creates_event=True,
        condition="True",
        condition_variables=[test_condition_var1],
        event_type=factories.EventTypeFactory(name=event2_type_name),
        trigger_responses=[],
    )

    _redis_pub = redis.Redis(host="redis", decode_responses=True)
    _redis_pub.publish(
        "/triggers_modified", "test string from multi_trigger_eval_fixture"
    )
    # need time for trigger setup to do its thing
    time.sleep(3)

    yield  # provide the fixture value (which is None)

    # now clean up


@pytest.fixture()
def req_data_key_fixture(weather_and_trial):
    cv = factories.ConditionVariableFactory(variable="unused_var : /topic.unused_field")

    req_data = factories.RequestedDataFactory(
        destination_url="$EVENT$",
        payload={"field": "/topic.field", "field2": "/topic.field2"},
    )

    new_trigger = factories.TriggerFactory(
        name="Requested Data Missing Key Trigger",
        key="req_data",
        description="Test message missing key for requested data",
        is_active=True,
        creates_event=True,
        condition="True",
        condition_variables=[cv],
        requested_dataset=[req_data],
        event_type=factories.EventTypeFactory(),
        trigger_transport="redis",
    )

    _redis_pub = redis.Redis(host="redis", decode_responses=True)
    _redis_pub.publish("/triggers_modified", "test string from req_data_key_fixture")
    # need time for trigger setup to do its thing
    time.sleep(3)

    yield  # provide the fixture value (which is None)

    # now clean up
