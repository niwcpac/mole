# **Apache Pulsar**

## **Overview**

Apache Pulsar is a distributed messaging framework. This is the main messaging system used for Mole. Pulsar also has support for stream processing through their service (Pulsar Functions), which we have the ability of leveraging for our use cases.

[Architecture overview](https://pulsar.apache.org/docs/en/concepts-architecture-overview/)

We will be running the standalone mode which contains all the pieces of a Pulsar instance in a single Docker image.


## **Configuration**  

**Configuring Pulsar Functions:**
Pulsar doesn't start with any Pulsar functions running. In order to run them, they need to be created in the Pulsar broker. There are three ways to deploy these functions. 

* A Java client interface
* the `pulsar-admin` CLI tool
* HTTP calls to the admin REST API

Of these, we will mainly be using HTTP calls and the `pulsar-admin` tool. There is a python script that will automatically post any available Pulsar functions it finds on the creation of a new Pulsar Docker container. This script, `pulsar/create_functions.py`, searches the `functions` directory for python files, assuming any python files in them to be valid Pulsar functions files and skipping over files prepended an `_`, and crafts a HTTP payload from a python dict within each Pulsar function file and posts it to the admin REST API. 

We will only be using the Pulsar Function SDK for Python to develop these functions. This SDK provides a bigger range of functionality that is not available if we were to use the language-native interface.
Each Pulsar function file needs at minimum the following:

* a dict defining the configuration of the Pulsar function
* a class that inherits from pulsar.Function that defines a process method with necessary parameters

### **Fields:**

The configuration of the Pulsar function has a number of required fields:

#### **py**

The location of the python file. Note that this is the path within the docker container. Since the files will be located at `/pulsar/functions/`, it will need to be of the form `/pulsar/functions/<file>`.

    "py": "/pulsar/functions/example_function.py"

#### **className**

The name of the class for the pulsar function. For python, the filename is necessary but not included in the class name. The class name will be used as the default name of the function and corresponding fully qualified function name if one is not specified. The classname in this example would be `Example`.

    "className": "example_function.Example"

#### **inputs**

This is a list of input topics for this function to monitor. The list can span multiple tenants, namespaces, and topics. However, if a regex pattern is used, all topics matching the pattern must  be in the same tenant and namespace. 

    "inputs": ["persistent://public/default/input1"]

There are also a number of optional fields that can be specified if necessary.

#### **output**

The output topic that any return values will be sent to. If this isn't set manually, the output topic has a default value of `{input topic}-{function name}-output`

    "output": "persistent://public/default/output"

#### **logTopic**

This is the topic where logs for this Pulsar function are sent.

    "logTopic": "persistent://public/default/log_topic"

#### **fqfn**

This is the fully qualified function name (tenant/namespace/function_name). If not explicitly set, it will be inferred from the input topics and class name.

    "fqfn": "public/default/example_function"

#### **Example configuration**

        body = {
            "fqfn": "public/default/example_function",
            "py": "/pulsar/functions/example_function.py",
            "className": "example_function.Example",
            "inputs": ["persistent://public/default/input1"],
            "output": "persistent://public/default/output",
            "logTopic": "persistent://public/default/log_topic",
        }

## **Developing Pulsar Functions:**

Each Pulsar function needs to inherit from `pulsar.Function`. This gives us access to a context object that lets us have more functionality. Each function will need a `process` method.

    Function.process(self, input, context)

`input` will be the message in bytes. `context` will provide a number of useful functions. (https://pulsar.apache.org/docs/en/functions-develop/#context)

This `process` method will be called for each message that comes in on the list of input topics. Any return values from this method will be sent to the output topic. Logs can be sent by using the `get_logger` method to get a logger object and calling the corresponding method (`info`, `debug`, `warn`, `error`, `critical`) on it. The messages created by these log methods are sent to the log topic, where any consumers to that topic can display it.

!!! tip "Note"
    The state storage functions (`put_state`, `get_state`, `incr_counter`, `get_counter`, `del_counter`) aren't available because the state service is disabled. Use Redis instead.

!!! tip "Note"
    If using regex input topics for Pulsar functions, it is possible for the initial messages to not be captured. When a new topic that matches the regex is created by a producer, the Pulsar function has to then create a subscription to that topic which may take up to a minute. In that timespan, any messages on that topic will be missed and not processed by the Pulsar function.
    [Link to Pulsar issue](https://github.com/apache/pulsar/issues/6531)

## **Testing Pulsar Functions:**

Unit testing the Pulsar functions can be done by running a custom docker-compose file.

    docker-compose -f docker-compose-tests.yml up

This will run any tests in the `pulsar/tests` directory.


## Websockets

Pulsar provides a websocket server for clients that do not have a Pulsar library. Clients can connect to this websocket server to receive and send messages on Pulsar topics. Note that the idle timeout for the websocket is **5 minutes**. If expected to be idle for more than 5 minutes, the client should expect to reconnect when the websocket closes or send periodic messages to keep the websocket open.
