# **Event Mocker**

The Event Mocker is a tool used to create and post random and/or sequenced events to 
Mole. There are two different ways of using the event mocker: *Random Event Mocking* and
*Event Sequence Mocking*. 

Random Event Mocking is useful for:

* load testing
* quickly getting events in the database

Event Sequence Mocking is useful for:

* testing behavior when certain events happen in sequence
* simulating a realistic trial

### **Configuration**  
The first step is to ensure the python requests library is installed on your machine.

    pip install requests

The script requires at least one configuration file passed as an argument. Below is an
example of a configuration file that meets the requirements for both Random Event 
Mocking and Event Sequence Mocking.

    {
        "username": "admin",
        "password": "admin",
        "trial_duration": {
            "hours": 1,
            "minutes": 0
        },
        "bounding_box": {
            "min_point": {
                "lat": 32.657360,
                "lon": -117.283920
            },
            "max_point": {
                "lat": 32.740647,
                "lon": -117.157868
            }
        },
        "event_metadata": {
            "detail": ["Event created by Mole Utilities Event Generator."],
            "key_1": ["choice_1", "choice_2", "choice_3"],
            "key_2": [
                "single_choice",
                [1, 2, 3],
                ["a", "b", "c"]
            ],
            "key_n": [
                {"nested_1": "1a"},
                {"nested_2": "2b"},
                {"nested_3": "3c"}
            ]
        },
        "event_type_metadata": {
            "Node Online": {
                "node": ["node-1", "node-2", "node-3"]
            }
        },
        "event_count": 100,
        "sequence_order": [
            ["Start", 1],
            ["RANDOM", 50],
            ["End", 1]
        ],
        "sequences": {
            "Start": [
                ["Node Online", 50],
                ["Trial Start", 1]
            ],
            "End": [
                ["Trial End", 1],
                ["Safety Stop", 1]
            ]
        },
        "excluded_types": [
            "Unassigned",
            "Ignore"
        ],
    }

**Required Keys:**

* `username`: *string*. Admin username. 
 
* `password`: *string*. Admin password.

* `trial_duration`: *dict*. Window of time for events to occur in.
    - `hours`: *int*. Number of hours for the current trial.
    - `minutes`: *int*. Number of minutes for the current trial.

* `bounding_box`: *dict*. Geographical area for events to be plotted in.
    - `min_point`: *dict*. Bottom left corner of area.
        - `lat`: *float*. Latitude value for bottom left point.
        - `lon`: *float*. Longitude value for bottom left point.
    - `max_point`: *dict*. Top right corner of area.
        - `lat`: *float*. Latitude value for top right point.
        - `lon`: *float*. Longitude value for top right point.

* `event_metadata`: *dict, may be empty*. Metadata for every event. Takes a dictionary, 
        value for each key must be an array. The generator will randomly select one 
        value from the provided array for each provided key.
    
* `event_type_metadata`: *dict, may be empty*. Metadata for specifc event types. Takes 
        a dictionary, each key is the name of the event type. The value for each key is 
        the metadata dictionary. Value for each metadata key must be an array. The 
        generator will randomly select one value from the provided array for each 
        provided key.


**Keys Relevant for Random Event Mocking:**

* `event_count`: *int*. The number of events you would like to generate. 

    !!! warning "Note" 
        `event_count` will be overriden if the `-c` tag is used in the command line 
        argument.


**Keys Relevant for Event Sequence Mocking:**

* `sequence_order`: *array*. a list of tuples. The first element of the tuple is the 
        name of the user-defined sequence. The second element is how many times you 
        would like to generate that sequence. If you would like to generate random 
        events within the sequence, use the pre-defined sequence name `RANDOM` with the 
        number of random events to generate. Sequences will be generated in order of 
        array.

* `sequences`: *dict*. A dictionary of user-defined sequences. The key is the name of 
        your sequence. The value is an array of tuples. The value of the first tuple 
        element is the event type name. The value of the second element is the number of
        times that event type should occur. Events will be generated in order of array.


**Optional:**

* `excluded_types`: *array, optional*. An array of event types to exclude when mocking
        random events.

### **Run**

The script requires one configuration file that provides the required keys, or multiple 
configuration files that, when composed, provide the required keys. If you include 
multiple configuration files, key conflicts will be handled by choosing the value from 
the latest file.

**Random Event Mocking**

From the `/utilities` directiory, run:

    python mock_events.py path/to/your/config.json path/to/another/config.json

!!! tip "Tip" 
    To override the number of random events to mock, add tag `-c` followed by the number 
        of events. Example:
    
        python mock_events.py -c 100 path/to/your/config.json

**Event Sequence Mocking**

From the `/utilities` directiory, run:

    python mock_events.py -seq path/to/your/config.json path/to/another/config.json


