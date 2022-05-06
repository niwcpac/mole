# **API Usage**
For the API during an active test mission, we'll generally be concerned with creating one of the following: `Poses`, `Events`, `Notes`, `Images`. As opposed to the configuration which was largely done through the Django custom command, these will be created through their respective API endpoints.

## **Poses**
Poses can be used to track entities during each test run. 

Here is an example of posting a pose.

=== "Minimal"

    ``` python
    import datetime
    import requests

    pose_data = {
        "lat": 32.67,
        "lon":  -117.24,
        "entity": "/api/entities/alpha_1/",
        "pose_source": "/api/pose_sources/1/",
        "timestamp": datetime.datetime.now().isoformat(),
        "trial": 1,
    }

    requests.post("http://localhost/api/poses/", json=pose_data, auth=("admin", "admin"))
    ```

=== "Comprehensive"

    ``` python
    import datetime
    import requests

    pose_data = {
        "lat": 32.67,
        "lon":  -117.24,
        "entity": "/api/entities/alpha_1/",
        "pose_source": "/api/pose_sources/1/",
        "timestamp": datetime.datetime.now().isoformat(),
        "trial": 1,
        "elevation": 0.0,
        "heading": 23.0,
        "speed": 23,
        "velocity": [133.0, 2.0],
    }

    requests.post("http://localhost/api/poses/", json=pose_data, auth=("admin", "admin"))
    ```

`entity` is the entity that this pose is for.

`pose_source` indicates what type of pose it is. This string should contain the id of a pose source.

`timestamp` represents the datetime at which this pose happened. 

`trial` indicates which specific test run you want to associate this pose with. The same entity can have different paths through the test environment so this isolates the poses to their respective trial. This field would be assigned the trial id.

`elevation` is an optional arbitrary float value. This could be used to represent meters from sea level or levels in a building.

`heading` is an optional arbitrary float value. A good rule of thumb is to use `0.0` and/or `360.0` as north and go clockwise (i.e. east would be `90.0`)


`speed` and `velocity` are both optional fields. `velocity` is an array, allowing to provide either 2D or 3D vectors. `speed` isn't automatically calculated so you'll have to manually set the scalar value. There is no validation that the `speed` field is the correct speed for the `velocity` field.

## **Events**
`Events` will be the primary mode of recording data. These will use the `EventTypes` created during the configuration and can include any other specific data and/or metadata that you wish to attach.

The following is an example of posting an event.

=== "Minimal"

    ``` python
    import datetime
    import requests

    json_to_post = {
        "start_datetime": datetime.datetime.now().isoformat(),
        "event_type": "/api/event_types/1/",
        "trial": "/api/trials/1/",
    }
    requests.post("http://<Mole_IP>/api/events/", json=json_to_post, auth=("admin", "admin"))
    ```
=== "Comprehensive"

    ``` python
    import datetime
    import requests

    pose_data = {
        "lat": 32.67,
        "lon":  -117.24,
        "entity": "/api/entities/alpha_1/",
        "pose_source": "/api/pose_sources/1/",
        "timestamp": datetime.datetime.now().isoformat(),
        "trial": 1,
    }

    pose_post = requests.post("http://localhost/api/poses/", json=pose_data, auth=("admin", "admin"))
    pose_url = pose_post.headers['Location']

    json_to_post = {
        "start_datetime": datetime.datetime.now().isoformat(),
        "end_datetime": "2022-01-01T08:00:00+00:00",
        "event_type": "/api/event_types/1/",
        "trial": "/api/trials/1/",
        "start_pose": pose_url,
        "metadata": {
            "entity": "usv1",
            "extra_info": 25.2,
            "list_of_important_things": [
                "item1",
                "item2",
            ],
        }
    }
    requests.post("http://<Mole_IP>/api/events/", json=json_to_post, auth=("admin", "admin"))
    ```

`start_datetime` and `end_datetime` should be a string in the format of ISO 8601. `start_datetime` is a required field. `end_datetime` is optional and intended for events with a duration of some kind. It can be omitted and added later or omitted entirely. 

`event_type` should be a string with the corresponding id for the event type you want to create. 

`trial` should be a string with the corresponding id for the trial you want to attach this event to.

`start_pose` is an optional field that ties a pose to this event. Its value should be the url of a previously created pose. Currently, it is not possible to create both a pose and event in the same HTTP request. You can use this start pose field to indicate something like an interaction happening at a specific location. 

`metadata` should be a Python dictionary of relevent data and metadata about the event. If not supplied, it will default to an empty dictionary. 


The target url should be whatever IP the Mole server is hosted on. This could be an IP or `http://localhost` if posting locally from the same host. 
!!! Note
    The crendentials used are based off the example configuration in the [basic configuration](basic_config.md#trials). If these have changed, make sure to use the correct username and password.

## **Notes**
Notes provide an area to supplement events with free-form notes. All notes must be attached to an event. 
``` python
import datetime
import requests

json_to_post = {
    "tester": "/api/testers/1/",
    "note": "Test note here",
    "event": "/api/events/1/",
}

requests.post("http://localhost/api/notes/", json=json_to_post, auth=("admin", "admin"))
```

## **Images**
Images can be useful for traceability and debugging. You can attach an image(s) to any event.
``` python
import datetime
import requests

files = {
    "image": open('/directory/to/image.png', 'rb'),
}
data = {
    "image_type": "/api/image_types/1/",
    "event": "/api/events/1/",
    "timestamp": datetime.datetime.now().isoformat(),
}

r = requests.post("http://localhost/api/images/", files=files, data=data, auth=("admin", "admin"))
```

## **Bulk POSTs**

Mole also has the ability to create multiple instances for a single HTTP POST request. Currently this ability only exists for events and poses. To use this ability, simply pass a list of objects rather than a single object. This feature is useful if single posts are too slow for the level of throughput desired and increasing the number of Gunicorn/Django workers is not possible. Testing might be required to determine the optimal number of objects to post during each request. Also note that Pulsar messages will not be sent for any bulk events or poses. Any Pulsar functions that are tracking the event log will not run for these events. 

=== "Single instance"

    ```
    POST /api/events
    {
        "start_datetime": <ISO_datetime>,
        "start_pose": <pose_url>,
        "event_type": <event_type_url>,
        "metadata": <metadata>,
    }
    ```

=== "Multiple instances"

    ```
    POST /api/events
    [
        {
            "start_datetime": <ISO_datetime>,
            "start_pose": <pose_url>,
            "event_type": <event_type_url>,
            "metadata": <metadata>,
        },
        {
            "start_datetime": <ISO_datetime>,
            "start_pose": <pose_url>,
            "event_type": <event_type_url>,
            "metadata": <metadata>,
        },
        {
            "start_datetime": <ISO_datetime>,
            "start_pose": <pose_url>,
            "event_type": <event_type_url>,
            "metadata": <metadata>,
        }
    ]
    ```
