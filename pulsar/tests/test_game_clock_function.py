from unittest.mock import patch, MagicMock, call
from unittest import mock

from functions import game_clock_function

import json

### BUILD CONTAINER FOR CHANGES TO BE REFLECTED: docker-compose build pulsar
### RUN TESTS: docker-compose -f docker-compose-tests.yml up

test_game_clock_state = {
    "message": "Test message",
    "base_time": "2021-03-03 11:51:41.122740",
    "minor": {
        "message": "Test message",
        "base_time": "2021-03-03 11:51:41.122740"
    },
    "major": {
        "message": "Test message",
        "base_time": "2021-03-03 11:51:41.122740"
    } 
}

clock_phases_url = "http://django:8000/api/clock_phases"
current_trial_url = "http://django:8000/api/trials/current"
clock_state_url = "http://django:8000/api/trials/1/clock_state"


# This method will be used by the mock to replace requests.get from pulsar function
def mocked_requests_get(*args, **kwargs):
    class MockResponse:
        def __init__(self, json_data, status_code):
            self.json = json_data
            self.text = json.dumps(json_data)
            self.status_code = status_code

    if args[0] == clock_phases_url:
        return MockResponse(
            {
                "starts_with_event_type": "/api/event_types/1"
            }, 200)

    elif args[0] == current_trial_url:
        return MockResponse({"id": "1"}, 200)

    elif args[0] == clock_state_url:
        return MockResponse(test_game_clock_state, 200)

    return MockResponse(None, 404)


def mock_context_topic(topic_name):
    return 'persistent://public/default/'+topic_name


# Test route on receipt of message from event topic
# The mock message contains an event type the clock cares about, so the result should 
# be true.
@mock.patch('requests.get', side_effect=mocked_requests_get)
def test_game_clock_event_topic_truthy_route(mock_get):
    pulsar_function = game_clock_function.GameClock()

    # verify route of event topic
    truthy_event_test_input = json.dumps({
        "event_type_id": 1,
        "update": False
    }).encode("utf-8")

    with MagicMock() as mock_context:
        mock_context.get_current_message_topic_name.return_value = mock_context_topic('_event_log')
        truthy_event_result = pulsar_function.process(truthy_event_test_input, mock_context)

        # ensure appropriate API calls happen
        mock_get.assert_has_calls([
            call(clock_phases_url), 
            call(current_trial_url), 
            call(clock_state_url)
        ])

        # ensure a game clock message is sent
        assert truthy_event_result == True


# Test route on receipt of message from event topic
# The mock message contains an event type the clock doesn't care about, so the result  
# should be false.
@mock.patch('requests.get', side_effect=mocked_requests_get)
def test_game_clock_event_topic_falsey_route(mock_get):
    pulsar_function = game_clock_function.GameClock()

    # verify route of event topic
    falsey_event_test_input = json.dumps({
        "event_type_id": 99,
        "update": False
    }).encode("utf-8")

    with MagicMock() as mock_context:
        mock_context.get_current_message_topic_name.return_value = mock_context_topic('_event_log')
        falsey_event_result = pulsar_function.process(falsey_event_test_input, mock_context)

        # ensure only appropriate API calls happen
        mock_get.assert_called_once_with(clock_phases_url)

        # ensure a websocket message did not happen
        assert falsey_event_result == False


# Any message coming from the clock_phase topic should result in true
@mock.patch('requests.get', side_effect=mocked_requests_get)
def test_game_clock_clock_phase_topic_route(mock_get):
    pulsar_function = game_clock_function.GameClock()
    # verify route of event topic
    clock_phase_test_input = json.dumps({
        "id": 1,
        "update": False
    }).encode("utf-8")

    with MagicMock() as mock_context:
        mock_context.get_current_message_topic_name.return_value = mock_context_topic('_clock_phase_log')
        clock_phase_result = pulsar_function.process(clock_phase_test_input, mock_context)

        # ensure appropriate API calls happen
        mock_get.assert_has_calls([
            call(current_trial_url), 
            call(clock_state_url)
        ])

        # ensure a game clock message is sent
        assert clock_phase_result == True


# Any message coming from the clock_config topic should result in true
@mock.patch('requests.get', side_effect=mocked_requests_get)
def test_game_clock_clock_config_topic_route(mock_get):
    pulsar_function = game_clock_function.GameClock()
    # verify route of event topic
    clock_config_test_input = json.dumps({
        "id": 1,
        "update": False
    }).encode("utf-8")

    with MagicMock() as mock_context:
        mock_context.get_current_message_topic_name.return_value = mock_context_topic('_clock_config_log')
        clock_config_result = pulsar_function.process(clock_config_test_input, mock_context)

        # ensure appropriate API calls happen
        mock_get.assert_has_calls([
            call(current_trial_url), 
            call(clock_state_url)
        ])

        # ensure a game clock message is sent
        assert clock_config_result == True


# Any message coming from the trial topic should result in true
@mock.patch('requests.get', side_effect=mocked_requests_get)
def test_game_clock_trial_topic_route(mock_get):
    pulsar_function = game_clock_function.GameClock()
    # verify route of event topic
    trial_test_input = json.dumps({
        "id": 1,
        "update": False
    }).encode("utf-8")

    with MagicMock() as mock_context:
        mock_context.get_current_message_topic_name.return_value = mock_context_topic('_trial_log')
        trial_result = pulsar_function.process(trial_test_input, mock_context)

        # ensure appropriate API calls happen
        mock_get.assert_has_calls([
            call(current_trial_url), 
            call(clock_state_url)
        ])

        # ensure a game clock message is sent
        assert trial_result == True


# A topic coming from anything outside of what has a handler should result in false
@mock.patch('requests.get', side_effect=mocked_requests_get)
def test_game_clock_falsey_topic_route(mock_get):
    pulsar_function = game_clock_function.GameClock()
    # verify route of event topic
    falsey_test_input = json.dumps({
        "id": 7,
        "update": False
    }).encode("utf-8")

    with MagicMock() as mock_context:
        mock_context.get_current_message_topic_name.return_value = mock_context_topic('input1')
        falsey_result = pulsar_function.process(falsey_test_input, mock_context)

        # ensure no API calls are made
        mock_get.assert_not_called()

        # ensure no message posted to the game clock
        assert falsey_result == False