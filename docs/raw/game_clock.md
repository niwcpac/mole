# **Game Clock**

## **Introduction**
Often times within an experiment, it is beneficial to have a "game clock" view for 
experiment awareness. The Game Clock is essentially a message with a clock that can 
count up or down from significant events or times within a scenario.

The Game Clock is highly configurable, allowing the user to define clock sequences as 
well as responsive timers.

## **Getting Started**
There are 3 steps to configuring the Game Clock:

1. Define the clock phases
2. Group phases into a clock configuration
3. Assign clock configuration to a trial

### **Define the Clock Phase**
The clock phase model has a number of fields that allow the game clock to be extremely 
configurable. Below is a table describing the options.

| Field                                  | Description                                                  |
|----------------------------------------|--------------------------------------------------------------|
| **message**                            | *string*: The displayed message for the clock phase          |
| **message_only**                       | *boolean*: Set true to hide the clock string                 |
| **countdown**                          | *boolean*: true if clock counting down, false if counting up |
| **duration_seconds** (optional)        | *integer*: duration of clock phase in seconds                |
| **starts_with_datetime** (optional)    | *datetime*: clock start time                                 |
| **starts_with_trial_start** (optional) | *boolean*: true if clock starts with trial start_datetime    |
| **starts_with_trial_end** (optional)   | *boolean*: true if clock ends with trial end_datetime        |
| **starts_with_event_type** (optional)  | *EventType*: type of event to trigger clock phase start      |
| **ends_with_datetime** (optional)      | *datetime*: clock end time                                   |
| **ends_with_trial_start** (optional)   | *boolean*: true if clock ends with trial start_datetime      |
| **ends_with_trial_end** (optional)     | *boolean*: true if clock ends with trial end_datetime        |
| **ends_with_event_type** (optional)    | *EventType*: type of event to trigger clock phase end        |

Currently clock phases can be pre-configured in the Mole configuration script, or they 
can be posted to the API.

### **Group Phases in Clock Configuration**
The clock config model simply defines a timezone and a list of phases. The order of the 
phases in the list does not matter, Mole will infer the most appropriate phase given 
the state of the experiment and defined clock phases.

### **Assign Clock Configuration to Trial**
The trial model has a clock config foreign relation, simply set this field with a 
reference to the clock config.


### **Example Game Clock Configuration**
``` python
# define the clock phases
trial_phase_1 = factories.ClockPhaseFactory(
    message="Standing By",
    message_only=True,
    ends_with_trial_start=True
)
trial_phase_2 = factories.ClockPhaseFactory(
    message="Time Until Setup",
    countdown=True,
    ends_with_trial_start=True,
    duration_seconds=900
)
trial_phase_3 = factories.ClockPhaseFactory(
    message="Pre-Run Checkout",
    countdown=True,
    starts_with_trial_start=True,
    duration_seconds=900
)
trial_phase_4 = factories.ClockPhaseFactory(
    message="Team Setup",
    message_only=True,
    starts_with_trial_end=True
)
trial_phase_5 = factories.ClockPhaseFactory(
    message="5 minute countdown from maintenance stop event:",
    countdown=True,
    duration_seconds=300,
    starts_with_event_type=maintenance_stop_event_type
)

# define the clock configuration
trial_clock = factories.ClockConfigFactory(
    name="Trial Clock",
    timezone="America/Los_Angeles"
)

# add phases to clock configuration
trial_clock.phases.add(trial_phase_1, trial_phase_2, trial_phase_3, trial_phase_4, trial_phase_5)
```

## **Multiple Clock Instances**
The Game Clock allows multiple clock instances to run at the same time. By default, the 
primary clock will reference the clock configuration assigned to the current trial. 
There are a few different clocks that can run parallel to the current trial clock:

### **Reported Clock**
The Reported Clock is the clock that always tracks the first "Reported" trial that has 
the same major and minor IDs as the current trial.

### **Minor Clock**
The Minor Clock is the clock assigned to the "Minor Trial" that is related to the 
current trial. The Minor Trial has the same major and minor IDs as the current trial, 
but a zero for the micro ID.

Example: if the current trial's ID is 2.2.1, the Minor Trial's ID is 2.2.0.

### **Major Clock**
The Major Clock is the clock assigned to the "Major Trial" that is related to the 
current trial. The Major Trial has the same major ID as the current trial, 
but zeros for the minor and micro IDs.

Example: if the current trial's ID is 2.2.1, the Minor Trial's ID is 2.0.0.

### **Angular Distinctions**
In Angular, these different clocks are distinguished by the mole-timer-card input:

``` html
<!-- Current trial clock -->
<mole-timer-card></mole-timer-card>

<!-- Reported trial clock -->
<mole-timer-card [reported]="true"></mole-timer-card>

<!-- Minor trial clock -->
<mole-timer-card [minor]="true"></mole-timer-card>

<!-- Major trial clock -->
<mole-timer-card [major]="true"></mole-timer-card>
```
