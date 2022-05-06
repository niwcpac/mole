import mock_util as mu
import json
import random


class BaseConfig:
    def __init__(self, args):
        self.config = self.injestConfig(args.config)
        self.mole = self.config["mole"]
        self.username = self.config["username"]
        self.password = self.config["password"]
        self.trial_duration = mu.TrialDuration(self.config["trial_duration"])
        self.bounding_box = mu.BoundingBox(self.config["bounding_box"])
        self.event_metadata = self.config["event_metadata"]
        self.event_type_metadata = self.config["event_type_metadata"]
        self.sequence = []
        self.event_count = 0
        self.api = mu.MoleApi(self.mole, self.username, self.password)
        self.event_types = self.api.getEventTypes()
        self.entity_types = self.api.getEntityTypes()
        self.entities = self.api.getEntities()
        self.excluded_types = []
        if "excluded_types" in self.config:
            self.excluded_types = self.config["excluded_types"]

    def injestConfig(self, config_paths):
        config_json = {}
        for path in config_paths:
            file = open(path)
            j = json.load(file)
            for key in j:
                config_json[key] = j[key]
        return config_json

    def getRandomMetadata(self, event_type=""):
        metadata = {}
        for key in self.event_metadata:
            metadata[key] = random.choice(self.event_metadata[key])

        if event_type in self.event_type_metadata.keys():
            for key in self.event_type_metadata[event_type]:
                metadata[key] = random.choice(self.event_type_metadata[event_type][key])

        return metadata

    def getEventTypeUrl(self, event_type):
        url = ""
        for e in self.event_types:
            if event_type == e["name"]:
                url = e["url"]
                break
        return url

    def getRandomEventType(self, exclude):
        event_type = random.choice(self.event_types)["name"]
        if event_type in exclude:
            return self.getRandomEventType(exclude)
        else:
            return event_type


class RandomEventsConfig(BaseConfig, object):
    def __init__(self, args):
        super(RandomEventsConfig, self).__init__(args)

        if args.event_count:
            self.event_count = args.event_count
        else:
            self.event_count = self.config["event_count"]

        for x in range(0, self.event_count):
            self.sequence.append(self.getRandomEventType(exclude=self.excluded_types))


class EventSequenceConfig(BaseConfig, object):
    def __init__(self, args):
        super(EventSequenceConfig, self).__init__(args)

        for seq in self.config["sequence_order"]:
            if seq[0] in self.config["sequences"]:
                for seq_count in range(0, seq[1]):
                    for event in self.config["sequences"][seq[0]]:
                        for x in range(0, event[1]):
                            self.sequence.append(event[0])
            elif seq[0] == "RANDOM":
                for seq_count in range(0, seq[1]):
                    self.sequence.append(
                        self.getRandomEventType(exclude=self.excluded_types)
                    )

        self.event_count = len(self.sequence)
