#!/usr/bin/env python3

from pulsar import Function

body = {
    # The fully qualified function name (tenant/namespace/function_names)
    "fqfn": "public/default/example_function",
    # The location of the python module for the pulsar function
    "py": "/pulsar/functions/example_function.py",
    # The name of the class for the pulsar function
    # Note: the filename is necessary but not included in the class name
    # The class name will be used as the default name of the function and corresponding
    # fully qualified function name if one is not specified (Example in this case)
    "className": "example_function.Example",
    # a list of input topics for this function to monitor
    "inputs": ["persistent://public/default/input1"],
    # the output topic for any return values to be propagated to
    # if this isn't set, no output is written
    "output": "persistent://public/default/output",
    # the topic where logs for the pulsar function are produced
    "logTopic": "persistent://public/default/log_topic",
}


class Example(Function):
    def __init__(self):
        # Any one-off initialization can be done here
        pass

    def process(self, input, context):
        # The body of your puslar function goes here
        # This method is called for each message that
        # the pulsar function receives on any of its input topics
        pass
