from unittest.mock import patch, MagicMock

from functions import example_function


def test_example_function():
    # still need to figure out how to mock pulsar function context
    pulsar_function = example_function.Example()
    test_input = "test"

    with MagicMock() as mock_context:
        result = pulsar_function.process(test_input, mock_context)

    # Test function here
