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
    description="Mock entities.\nSee http://localhost:8001/utilities_event_mocker.html"
)
parser.add_argument(
    "-seq",
    "--sequence",
    action="store_true",
    help="Mock sequence of entities. Must provide sequence file.",
)
parser.add_argument(
    "-c",
    "--event_count",
    type=int,
    nargs="?",
    help="Number of random entities to generate.",
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
entity_count = config.event_count

try:
    r = api.getPointStyle("camera_entity")
    camera_point_style_url = r["url"]
except:
    r = api.postPointStyle(
        {
            "name": "camera_entity",
            "description": "",
            "icon": "/assets/camera.png",
            "render_as_symbol": True,
            "color": "#ffffff",
            "use_marker_pin": False,
            "marker_color": "#2EBE30",
        }
    )
    camera_point_style_url = r.headers["Location"]
print(camera_point_style_url)


try:
    r = api.getEntityTypes("camera")
    camera_type_url = r["url"]
except:
    r = api.postEntityType(
        {"name": "camera", "point_style": camera_point_style_url, "entities": []}
    )
    camera_type_url = r.headers["Location"]


print(camera_type_url)


# Generate a default map entity for map markers
try:
    r = api.getEntityTypes("map")
    map_type_url = r["url"]
except:
    r = api.postEntityType(
        {
            "name": "map",
            # Will not use a point style but is required
            "point_style": camera_point_style_url,
            "entities": [],
        }
    )
    map_type_url = r.headers["Location"]

try:
    r = api.getEntities(entity["name"])
    entity_url = r["url"]
except:
    r = api.postEntity({"name": "map_marker", "entity_type": map_type_url})


########################## create events ##########################
print("Generating entities...")
# get window of time to get events in
duration = config.trial_duration.getDuration()
timeline = Timeline(duration, config.event_count)

entity_urls = []
for x in range(entity_count):
    random_point = config.bounding_box.getRandomPoint()

    entity = {"name": "cam-" + str(x), "entity_type": camera_type_url}

    try:
        r = api.getEntities(entity["name"])
        entity_url = r["url"]
    except:
        r = api.postEntity(entity)
        entity_url = r.headers["Location"]

    entity_urls.append(entity_url)

    # make pose for entity
    pose_data = {
        "lat": random_point.lat,
        "lon": random_point.lon,
        "elevation": random.randrange(-100, 100) / 100.0,
        "heading": random.randrange(0, 180),
        "entity": entity_url,
        "pose_source": api.pose_source,
        "timestamp": timeline.getTimeISO(),
    }
    r = api.postPose(pose_data)
    pose_url = r.headers["Location"]

    timeline.increment()
r = api.postEntityGroup({"name": "Mock Entity Group", "related_entities": entity_urls})

entity_group_url = r.headers["Location"]
print(entity_group_url)
api.patchScenario({"entity_groups": [entity_group_url]})

print("\n\nComplete.")
exit(0)
