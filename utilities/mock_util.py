import os
import pathlib
import requests
import json
import random
import logging

from datetime import datetime, timedelta, timezone

PATH = pathlib.Path(__file__).parents[1]
if not os.path.exists(f"{PATH}/utilities/config/event_gen_logs"):
    logging.basicConfig(
        filename=f"{PATH}/utilities/config/event_gen_logs", level=logging.INFO
    )


logger = logging.getLogger("event_generator")
hdlr = logging.FileHandler(f"{PATH}/utilities/config/event_gen_logs")
ch = logging.StreamHandler()

formatter = logging.Formatter("%(name)s :: %(levelname)-8s :: %(message)s")
hdlr.setFormatter(formatter)

logger.addHandler(hdlr)
logger.addHandler(ch)
logger.setLevel(logging.DEBUG)


class MoleApi:
    def __init__(self, mole, username, password):
        self.mole = mole
        self.username = username
        self.password = password
        self.mole_ip = "http://{}".format(self.mole)
        self.root = "{}:8000/api".format(self.mole_ip)
        self.entities = "{}/entities/".format(self.root)
        self.events = "{}/events/".format(self.root)
        self.event_types = "{}/event_types/".format(self.root)
        self.entity_types = "{}/entity_types/".format(self.root)
        self.entity_groups = "{}/entity_groups/".format(self.root)
        self.point_styles = "{}/point_styles/".format(self.root)
        self.scenarios = "{}/scenarios/".format(self.root)
        self.poses = "{}/poses/".format(self.root)
        self.pose_source = "{}/pose_sources/2/".format(self.root)

    def getEventTypes(self):
        r = requests.get(self.event_types, auth=(self.username, self.password))
        if r.status_code != 200:
            logger.error(
                "Request to get event types failed, check config and try again."
            )
            exit(0)
        elif r.status_code == 200:
            logger.info("Request successful")
        event_types = json.loads(r.text)
        return event_types

    def getEntityTypes(self, data=""):
        r = requests.get(self.entity_types + data, auth=(self.username, self.password))
        if r.status_code != 200:
            logger.error(
                "Request to get entity types failed, check config and try again."
            )
            exit(0)
        elif r.status_code == 200:
            logger.info("Request successful")
        entity_types = json.loads(r.text)
        return entity_types

    def getEntities(self, data=""):
        r = requests.get(self.entities + data, auth=(self.username, self.password))
        if r.status_code != 200:
            logger.error("Request to get entities failed, check config and try again.")
            exit(0)
        elif r.status_code == 200:
            logger.info("Request successful")
        entities = json.loads(r.text)
        return entities

    def getPointStyle(self, data=""):
        r = requests.get(self.point_styles + data, auth=(self.username, self.password))
        if r.status_code != 200:
            print("Request to get pointStyle failed, check config and try again.")
            exit(0)
        pointStyle = json.loads(r.text)
        return pointStyle

    def postPose(self, data):
        r = requests.post(self.poses, json=data, auth=(self.username, self.password))
        if r.status_code != 201:
            logger.error("Request to post pose failed, check config and try again.")
            exit(0)
        elif r.status_code == 200:
            logger.info("Request successful")
        return r

    def postEvent(self, data):
        r = requests.post(self.events, json=data, auth=(self.username, self.password))
        if r.status_code != 201:
            logger.error(
                "Request to post "
                + data.event_type
                + " failed, check config and try again."
            )
            exit(0)
        elif r.status_code == 200:
            logger.info("Request successful")
        return r

    def postEntityType(self, data):
        r = requests.post(
            self.entity_types, json=data, auth=(self.username, self.password)
        )
        if r.status_code != 201:
            print("Request to post " + r.text + " failed, check config and try again.")
            exit(0)
        return r

    def postEntity(self, data):
        r = requests.post(self.entities, json=data, auth=(self.username, self.password))
        if r.status_code != 201:
            print("Request to post " + r.text + " failed, check config and try again.")
            exit(0)
        return r

    def postPointStyle(self, data):
        r = requests.post(
            self.point_styles, json=data, auth=(self.username, self.password)
        )
        if r.status_code != 201:
            print("Request to post " + data + " failed, check config and try again.")
            exit(0)
        return r

    def postEntityGroup(self, data):
        r = requests.post(
            self.entity_groups, json=data, auth=(self.username, self.password)
        )
        if r.status_code != 201:
            print("Request to post " + data + " failed, check config and try again.")
            exit(0)
        return r

    def patchScenario(self, data, scenario="1/"):
        r = requests.patch(
            self.scenarios + scenario, json=data, auth=(self.username, self.password)
        )
        if r.status_code != 200:
            print("Request to patch " + r.text + " failed, check config and try again.")
            exit(0)
        return r

    def postEntityType(self, data):
        r = requests.post(
            self.entity_types, json=data, auth=(self.username, self.password)
        )
        if r.status_code != 201:
            print("Request to post " + r.text + " failed, check config and try again.")
            exit(0)
        return r

    def postEntity(self, data):
        r = requests.post(self.entities, json=data, auth=(self.username, self.password))
        if r.status_code != 201:
            print("Request to post " + r.text + " failed, check config and try again.")
            exit(0)
        return r

    def postPointStyle(self, data):
        r = requests.post(
            self.point_styles, json=data, auth=(self.username, self.password)
        )
        if r.status_code != 201:
            print("Request to post " + data + " failed, check config and try again.")
            exit(0)
        return r

    def postEntityGroup(self, data):
        r = requests.post(
            self.entity_groups, json=data, auth=(self.username, self.password)
        )
        if r.status_code != 201:
            print("Request to post " + data + " failed, check config and try again.")
            exit(0)
        return r

    def patchScenario(self, data, scenario="1/"):
        r = requests.patch(
            self.scenarios + scenario, json=data, auth=(self.username, self.password)
        )
        if r.status_code != 200:
            print("Request to patch " + r.text + " failed, check config and try again.")
            exit(0)
        return r


class Timeline:
    def __init__(self, duration, event_count):
        self.now = datetime.now(tz=timezone.utc)
        self.end_time = self.now + duration
        self.time_step = (self.end_time - self.now) / event_count

    def increment(self):
        self.now = self.now + self.time_step

    def getTimeISO(self):
        return self.now.isoformat()


class TrialDuration:
    def __init__(self, duration):
        self.hours = duration["hours"]
        self.minutes = duration["minutes"]

    def getDuration(self):
        return timedelta(hours=self.hours) + timedelta(minutes=self.minutes)


class Point:
    def __init__(self, point):
        self.lat = point["lat"]
        self.lon = point["lon"]


class BoundingBox:
    def __init__(self, bounding_box):
        self.min_point = Point(bounding_box["min_point"])
        self.max_point = Point(bounding_box["max_point"])

    def getRandomPoint(self):
        lat = random.uniform(self.min_point.lat, self.max_point.lat)
        lon = random.uniform(self.min_point.lon, self.max_point.lon)
        point = {"lat": lat, "lon": lon}
        return Point(point)
