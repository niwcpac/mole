# **Description**
Scenario Scripts allow you to describe a sequence of events to occur after a certain 
event occurs and trial Conditions are met. Scripted Events are scheduled to post after 
a defined amount of time from either the initiating event or the Scripted Event that 
precedes it.


# **Configuration**
## Step 1: Describe the Script
A Script describes:

* `initiating_event_types`: a list of event types that can initiate the Script
* `conditions`: optional Conditions that need to be met for the Script to run
* `conditions_pass_if_any`: When multiple conditions are used, will use OR logic 
    instead of AND
* `run_limit`: an optional number of times the Script is allowed to run in a given trial
* `auto_repeat_count`: an optional number of times to repeat the script when it's triggered
* `cancelling_event_type`: the event type that can cancel scheduled events
* `scripted_event_head`: the first Scripted Event in the Script sequence*

!!! tip "Note"
    *Scripts are composed of a linked list of Scripted events, which we refer to as the 
    Script sequence.


### Example:
``` python
trial_start_script = auto_factories.ScriptFactory(
    name="On Trial Start Script",
    initiating_event_types=[trial_start_event_type],
    conditions=[has_trial_init_condition], # See Step 3
    run_limit=5,
    auto_repeat_count=3,
    cancelling_event_type=cancel_scheduled_events_event_type,
    scripted_event_head=... # See Step 2
)
```
## Step 2: Describe the scheduled events
Scripted Events describe:

* `event_type`: an event type to post
* `delay_seconds`: the time delay before posting the event
* `conditions`: Conditions to be met for the event to post
* `conditions_pass_if_any`: When multiple conditions are used, will use OR logic 
    instead of AND
* `add_event_metadata`: metadata to attach to the event being created
* `copy_trigger_metadata`: copies metadata from triggering event to the event being 
    created
* `next_scripted_event`: the next event to schedule

!!! tip "Note"
    Though Scripted events can be written in isolation, the linked*list nature would 
    require you to write their constructors in reverse, so it's recommended to nest the 
    scheduled events in the Script.

### Example:
``` python
trial_start_script = auto_factories.ScriptFactory(
    name="On Trial Start Script",
    initiating_event_types=[trial_start_event_type],
    conditions=[has_trial_init_condition], # See Step 3
    cancelling_event_type=cancel_scheduled_events_event_type,

    scripted_event_head=auto_factories.ScriptedEventFactory( # Nested ScriptedEvent
        name="Create other event after 0 seconds",
        conditions=[has_trial_init_w_agent_condition], # See step 3
        delay_seconds=0,
        event_type=other_event_type,
        add_event_metadata={"note":"Created by script."},
        copy_trigger_metadata=True,

        next_scripted_event=auto_factories.ScriptedEventFactory( # Nested ScriptedEvent
            name="Create unassigned event after 15 seconds",
            conditions=[ugv_prox_in_condition, has_trial_init_condition], # See step 3
            conditions_pass_if_any=True,
            delay_seconds=15,
            event_type=unassigned_event_type,
            event_metadata={"note":"Created by script."},

            next_scripted_event=None
        )
    )
)

```

## Step 3: Describe Conditions
Script Conditions can be applied to both the Script and Scripted events. The Condition 
will be checked by Mole, and if met, Mole will either allow the Script to be run or 
allow the event to be scheduled. All rules within a condition use an OR operation; if 
any rule is true, the Condition will be true. If you would like an AND condition, break 
rules out into separate Conditions. The following rules can be set:

* `trial_has_event`: evaluates to `true` if trial contains the specified event type
* `trial_missing_event`: evaluates to `true` if trial does not contain the specified 
    event type
* `event_metadata_contains`: evaluates to `true` if event from `trial_has_event` 
    contains the specified string
* `event_metadata_excludes`: evaluates to `true` if event from `trial_has_event` 
    excludes the specified string
* `trigger_metadata_contains`: evaluates to `true` if the triggering event's metadata 
    contains the specified string
* `trigger_metadata_excludes`: evaluates to `true` if the triggering event's metadata 
    excludes the specified string

!!! tip "Note"
    The `event_metadata_contains` field only applies in 
    conjunction with `trial_has_event`, in which the condition will only be met if the 
    event defined in `trial_has_event` has metadata that contains the string described 
    in `event_metadata_contains`. 

### Example:
``` python
has_trial_init_w_agent_condition = auto_factories.ScriptConditionFactory(
    trial_has_event = trial_init_event_type,
    trial_missing_event = trial_end_event_type,
    event_metadata_contains = "agent",
    event_metadata_excludes = "bad_meta",
    trigger_metadata_contains = "node",
    trigger_metadata_excludes = "bad_meta",
)
```    

## Step 4: Add Script to Scenario
Scripts are associated with Scenarios, but tracked by Trials. This primarily applies to 
run limits, where the Script can be limited to a certain number of runs for the given 
Trial. Conditions are also applied in the scope of the given Trial.

### Example:
``` python
scripted_scenario = auto_factories.ScenarioFactory(
    name="Example Scripted Scenario",
    description="Example Scripted Scenario",
    location=camp_roberts_location,
    test_method=interactive_fiducial_method,
    scripts=[
        trial_start_script,
        trial_end_script
    ]
)
```