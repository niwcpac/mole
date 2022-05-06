#!/usr/bin/env python

from mock_util import MoleApi, Timeline
from config import RandomEventsConfig, EventSequenceConfig
from datetime import datetime, timedelta
import requests
import json
import argparse
import os.path

import random

########################## parse args ##########################


def is_valid_file(parser, arg):
    if not os.path.exists(arg):
        parser.error("The file %s does not exist!" % arg)
    else:
        return arg


parser = argparse.ArgumentParser(
    description="Mock events.\nSee http://localhost:8001/utilities_event_mocker.html"
)
parser.add_argument(
    "-seq",
    "--sequence",
    action="store_true",
    help="Mock sequence of events. Must provide sequence file.",
)
parser.add_argument(
    "-c",
    "--event_count",
    type=int,
    nargs="?",
    help="Number of random events to generate.",
)
parser.add_argument(
    "config",
    type=lambda x: is_valid_file(parser, x),
    nargs="+",
    help="List of configuration files.",
)

args = parser.parse_args()

########################## set config and load data #####################
print("Loading database...")
if args.sequence == True:
    config = EventSequenceConfig(args)
else:
    config = RandomEventsConfig(args)

api = config.api
event_types = config.event_types
entity_types = config.entity_types
entities = config.entities
event_sequence = config.sequence

########################## create events ##########################
print("Generating events...")
# get window of time to get events in
duration = config.trial_duration.getDuration()
timeline = Timeline(duration, config.event_count)

for e_type in event_sequence:
    e_type_url = config.getEventTypeUrl(e_type)
    random_point = config.bounding_box.getRandomPoint()
    metadata = config.getRandomMetadata(event_type=e_type)

    # make pose for event
    pose_data = {
        "lat": random_point.lat,
        "lon": random_point.lon,
        "elevation": random.randrange(-100, 100) / 100.0,
        "entity": random.choice(entities["results"])["url"],
        "pose_source": api.pose_source,
        "timestamp": timeline.getTimeISO(),
    }
    r = api.postPose(pose_data)
    pose_url = r.headers["Location"]

    # build event object
    event = {
        "start_datetime": timeline.getTimeISO(),
        "start_pose": pose_url,
        "event_type": e_type_url,
        "metadata": metadata,
    }
    r = api.postEvent(event)
    if r.status_code == 201:
        print(e_type)

    timeline.increment()

print("\n\nComplete.")
exit(0)
