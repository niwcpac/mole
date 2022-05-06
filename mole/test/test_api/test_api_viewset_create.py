from datetime import datetime

from rest_framework.test import APITestCase
from rest_framework import status

from django.urls import reverse

try:
    from urllib.parse import urlparse  # Python 3
except ImportError:
    from urlparse import urlparse  # Python 2

from data_collection.factories import factories

from .parameterized import NamedParameterizedTestsMeta, parameterized
from .viewset_to_factory import viewset_to_factory


user_create_info = ("user", {"username": "test_username", "password": "test_password"})

user_profile_create_info = (
    "userprofile",
    {"user": ("user",), "current_role": ("role",)},
)

role_create_info = ("role", {"name": "role_name"})

tester_create_info = ("tester", {"user": ("user",), "role": ("role",)})

pointstyle_create_info = (
    "pointstyle",
    {
        "name": "test_name",
        "description": "test description",
        "icon": "fa-test",
        "use_marker_pin": False,
        "color": "#888888",
        "scale_factor": 1,
        "animation": "color-switch",
    },
)

entity_type_create_info = (
    "entitytype",
    {
        "name": "test_name",
        "description": "test description",
        "entities": [],
        "point_style": ("pointstyle",),
    },
)

entity_create_info = (
    "entity",
    {
        "name": "entity_name",
        "display_name": "display_name",
        "description": "entity description",
        "entity_type": ("entitytype",),
    },
)

entity_event_role_info = (
    "entityeventrole",
    {
        "name": "entity_event_role_name",
        "metadata_key": "entity_event_role_metadata_key",
        "description": "entity_event_role_description",
        "entity_state": ("entitystate",),
        "valid_event_types": (["eventtype"],),
        "valid_entity_types": (["entitytype"],),
        "valid_entity_groups": (["entitygroup"],),
    },
)

entity_state = (
    "entitystate",
    {
        "name":"entity_state_name",
        "point_style_icon_transform":"{icon}_0",
        "point_style_color_transform":"{color}55",
        "point_style_use_marker_pin_override":True,
        "point_style_marker_color_transform":"{marker_color}33",
        "point_style_scale_factor_override":7,
        "point_style_animation_transform":"{animation} test_animation",
        "point_style_render_as_symbol_override":True,
    },
)

entity_group_create_info = (
    "entitygroup",
    {"name": "group_name", "description": "group description", "related_entities": []},
)

queryset_specification_create_info = (
    "querysetspecification",
    {
        "name": "spec_name",
        "description": "spec description",
        "model_name": "Entity",
        "methods": "",
    },
)

queryset_method_create_info = (
    "querysetmethod",
    {
        "name": "method_name",
        "description": "method description",
        "method_name": "filter",
        "parameters": "",
    },
)

extraction_field_create_info = (
    "extractionfield",
    {
        "name": "field_name",
        "description": "field description",
        "label": "label",
        "field_name": "field",
    },
)


extraction_specification_create_info = (
    "extractionspecification",
    {
        "name": "spec_name",
        "description": "spec description",
        "queryset": ("querysetspecification",),
        "extraction_fields": (["extractionfield"],),
    },
)


location_create_info = (
    "location",
    {
        "name": "location_name",
        "description": "location description",
        "point": "POINT(34.345345 -120.23423)",
    },
)

campaign_create_info = (
    "campaign",
    {
        "name": "campaign_name",
        "description": "campaign description",
        "start_datetime": str(datetime.now()),
        "location": ("location",),
        "trial_id_major_name": "test_major_name",
        "trial_id_minor_name": "test_minor_name",
        "trial_id_micro_name": "test_micro_name",
    },
)

trial_create_info = (
    "trial",
    {
        "campaign": ("campaign",),
        "id_major": 1,
        "id_minor": 2,
        "id_micro": 3,
        "start_datetime": str(datetime.now()),
        "testers": (["tester"],),
        "system_configuration": ("systemconfiguration",),
        "test_condition": ("testcondition",),
        "bagfile": "bagfilename",
        "note": "test note",
        "entities": [],
        "scenario": ("scenario",),
        "current": True,
        "reported": True,
    },
)

weather_create_info = (
    "weather",
    {"name": "weather_name", "description": "weather description", "current": True},
)

test_condition_create_info = ("testcondition", {"weather": ("weather",)})

performer_create_info = (
    "performer",
    {"name": "performer name", "description": "performer description"},
)

test_method_create_info = (
    "testmethod",
    {
        "name": "test_method_name",
        "description": "test method description",
        "version_major": 1,
        "version_minor": 2,
        "version_micro": 0,
        "has_segments": True,
        "variant": "test method variant 1",
    },
)

region_type_create_info = (
    "regiontype",
    {"name": "region_type_name", "description": "region type description",},
)

region_create_info = (
    "region",
    {
        "name": "region_name",
        "region_type": ("regiontype",),
        "geom": "POLYGON ((30 10, 40 40, 20 40, 10 20, 30 10))",
        "key_point": "POINT (30 10)",
        "z_layer": 1.0,
        "scenarios": (["scenario"],),
    },
)

script_create_info = (
    "script",
    {
        "name": "script_name",
        "initiating_event_types": (["eventtype"],),
        "conditions": [],
        "run_limit": 3,
        "auto_repeat_count": 4,
        "conditions_pass_if_any": True,
        "cancelling_event_type": ("eventtype",),
        "scripted_event_head": ("scriptedevent",),
    }
)

scripted_event_create_info = (
    "scriptedevent",
    {
        "name": "script_name",
        "conditions": [],
        "conditions_pass_if_any": True,
        "delay_seconds": 10,
        "event_type": ("eventtype",),
        "add_event_metadata": {"test":"metadata"},
        "copy_trigger_metadata": True,
        "next_scripted_event": ("scriptedevent",),
    }
)

script_condition_create_info = (
    "scriptcondition",
    {
        "name": "scriptcondition_name",
        "description": "scriptcondition_description",
        "trial_has_event": ("eventtype",),
        "trial_missing_event": ("eventtype",),
        "event_metadata_contains": "event_metadata_contains",
        "event_metadata_excludes": "event_metadata_excludes",
        "trigger_metadata_contains": "trigger_metadata_contains",
        "trigger_metadata_excludes": "trigger_metadata_excludes",
    }
)

scenario_create_info = (
    "scenario",
    {
        "name": "scenario_name",
        "description": "scenario description",
        "variant": "scenario variant 1",
        "test_method": ("testmethod",),
        "location": ("location",),
        "regions": [],
        "scripts": (["script"],)
    },
)


capability_under_test_create_info = (
    "capabilityundertest",
    {
        "name": "capability_under_test_name",
        "description": "capability under test description",
        "performer": ("performer",),
    },
)

system_configuration_create_info = (
    "systemconfiguration",
    {
        "name": "system_configuration_name",
        "description": "system configuration description",
        "capabilities_under_test": (["capabilityundertest"],),
    },
)

pose_source_create_info = (
    "posesource",
    {"name": "pose_source_name", "description": "pose source description"},
)

pose_create_info = (
    "pose",
    {
        "point": "POINT(34.345345 -120.23423)",
        "entity": ("entity",),
        "pose_source": ("posesource",),
        "timestamp": str(datetime.now()),
    },
)

event_level_create_info = (
    "eventlevel",
    {
        "name": "event_level_name",
        "description": "event level description",
        "key": "event_level_key",
        "visibility": 0,
    },
)

event_type_create_info = (
    "eventtype",
    {
        "name": "event_type_name",
        "description": "event type description",
        "has_duration": True,
        "event_level": ("eventlevel",),
        "exclusive_with": [],
        "resets_with": [],
        "ends_segment": True,
        "point_style": ("pointstyle",),
        "priority_metadata": [],
        "metadata_style_fields": [],
    },
)

event_create_info = (
    "event",
    {
        "trial": ("trial",),
        "start_datetime": str(datetime.now()),
        "start_pose": ("pose",),
        "event_type": ("eventtype",),
        "segment": ("segment",),
        "weather": ("weather",),
        "trigger": ("trigger",),
    },
)

segment_create_info = (
    "segment",
    {
        "tag": 1,
        "name": "tag_name",
        "description": "tag description",
        "scenarios": (["scenario"],),
    },
)

note_create_info = (
    "note",
    {"tester": ("tester",), "note": "test note", "event": ("event",)},
)

image_type_create_info = (
    "imagetype",
    {
        "name": "image_type_name",
        "description": "image type name",
        "topic": "image_type_topic",
    },
)

server_type_create_info = (
    "servertype",
    {
        "name": "server_type_name",
        "description": "server type description",
        "key": "server_type_key",
    },
)

server_param_create_info = (
    "serverparam",
    {
        "name": "server_param_name",
        "description": "server param description",
        "param": "server_param_param",
        "value": "server_param_value",
    },
)

server_create_info = (
    "server",
    {
        "name": "server_name",
        "server_type": ("servertype",),
        "active": True,
        "base_url": "http://example.com/map",
        "server_params": (["serverparam"],),
    },
)

trigger_create_info = (
    "trigger",
    {
        "name": "trigger_name",
        "description": "trigger description",
        "is_active": True,
        "is_manual": False,
        "creates_event": True,
        "key": "trigger_key",
        "conditon": "trigger_condition",
        "condition_variables": (["conditionvariable"],),
        "event_type": ("eventtype",),
        "requested_dataset": (["requesteddata"],),
    },
)

condition_variable_create_info = (
    "conditionvariable",
    {
        "name": "condition_variable_name",
        "description": "condition variable description",
        "variable": "condition_variable_variable",
    },
)

requested_data_create_info = (
    "requesteddata",
    {
        "name": "requested_data_name",
        "description": "requested data description",
        "destination_url": "dest",
        "payload": {"test": "val"},
    },
)

clock_phase_create_info = (
    "clockphase",
    {
        "message": "clock phase create message",
        "countdown": True,
        "duration_seconds": 600,
        "starts_with_trial_start": True
    }
)

clock_config_create_info = (
    "clockconfig",
    {
        "name": "clock_config_name",
        "timezone": "America/Los_Angeles",
        "phases": (["clockphase"],)
    }
)

create_test_list = (
    user_create_info,
    user_profile_create_info,
    role_create_info,
    tester_create_info,
    pointstyle_create_info,
    entity_type_create_info,
    entity_create_info,
    entity_event_role_info,
    entity_group_create_info,
    location_create_info,
    campaign_create_info,
    trial_create_info,
    weather_create_info,
    test_condition_create_info,
    performer_create_info,
    test_method_create_info,
    region_type_create_info,
    region_create_info,
    scenario_create_info,
    capability_under_test_create_info,
    system_configuration_create_info,
    pose_source_create_info,
    pose_create_info,
    event_level_create_info,
    event_type_create_info,
    event_create_info,
    segment_create_info,
    note_create_info,
    image_type_create_info,
    server_type_create_info,
    server_param_create_info,
    server_create_info,
    trigger_create_info,
    condition_variable_create_info,
    requested_data_create_info,
    queryset_specification_create_info,
    queryset_method_create_info,
    extraction_field_create_info,
    extraction_specification_create_info,
    clock_phase_create_info,
    clock_config_create_info,
    script_create_info,
    script_condition_create_info,
    scripted_event_create_info,
)


def create_url(viewset_name, factory):
    instance = factory()
    if hasattr(instance, "id"):
        url = reverse(viewset_name + "-detail", args=(instance.id,))
    else:
        url = reverse(viewset_name + "-detail", args=(instance.name,))

    return url


class ViewsetCreateTests(APITestCase, metaclass=NamedParameterizedTestsMeta):
    def setUp(self):
        self.test_user = factories.UserFactory(
            username="test_user", password="test_pass"
        )
        self.client.login(username="test_user", password="test_pass")

    @parameterized(*create_test_list)
    def test_viewset_create(self, viewset_name_data):
        viewset_name, data = viewset_name_data
        url_list = reverse(viewset_name + "-list")

        for key, value in data.items():
            if type(value) is tuple:
                if type(value[0]) is list:
                    data[key] = [
                        create_url(value[0][0], viewset_to_factory[value[0][0]])
                    ]
                else:
                    data[key] = create_url(value[0], viewset_to_factory[value[0]])

        factories.UserFactory(username="test_user", password="test_pass")
        self.client.login(username="test_user", password="test_pass")

        response = self.client.post(url_list, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class ComplexCreateTests(APITestCase):
    """
    Test creation of objects combining more than one endpoint
    """

    def setUp(self):
        self.test_user = factories.UserFactory(
            username="test_user", password="test_pass"
        )
        self.client.login(username="test_user", password="test_pass")

    def testCreateEntityOnEvent(self):
        event_role_1_instance = factories.EntityEventRoleFactory(
            name="Test Role 1", metadata_key="test_role_1_key"
        )
        event_role_2_instance = factories.EntityEventRoleFactory(
            name="Test Role 2", metadata_key="test_role_2_key"
        )
        entity_1_instance = factories.EntityFactory()
        entity_1_path = reverse("entity-detail", args=(entity_1_instance.name,))
        entity_2_instance = factories.EntityFactory()
        entity_2_path = reverse("entity-detail", args=(entity_2_instance.name,))
        event_instance = factories.EventFactory()

        data = {
            "metadata": {
                "test_role_1_key": entity_1_instance.name,
                "test_role_2_key": entity_2_instance.name,
            },
        }

        event_instance_url = reverse("event-list")
        response = self.client.post(event_instance_url, data, format="json")
        msg = "POST event metadata entities failed"
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, msg=msg)

        event_entity_1_url = response.data["related_entities"]["Test Role 1"][
            "entities"
        ][0]["url"]
        event_entity_1_path = urlparse(event_entity_1_url).path

        msg = "POST: Entity 1 metadata lookup failed."
        self.assertEqual(event_entity_1_path, entity_1_path, msg=msg)

        event_entity_2_url = response.data["related_entities"]["Test Role 2"][
            "entities"
        ][0]["url"]
        event_entity_2_path = urlparse(event_entity_2_url).path

        msg = "POST: Entity 2 metadata lookup failed."
        self.assertEqual(event_entity_2_path, entity_2_path, msg=msg)

        bad_entity_name_data = {
            "metadata": {
                "test_role_1_key": "unfound_entity_name",
                "invalid_key": entity_2_instance.name,
            }
        }

        # response should still be ok even with bad entity name/key. It should simply remove the unfound entity relation from the related_entities list.
        response = self.client.post(event_instance_url, bad_entity_name_data, format="json")
        msg = "POST bad event metadata entities failed"
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, msg=msg)

        msg = "POST bad event metadata entities failed. Unfound entity relations weren't properly removed."
        self.assertEqual(len(response.data["related_entities"]), 0, msg=msg)

        # check that unfound_entity_name is put in unfound_entities
        msg = "POST incorrect unfound_entities"
        self.assertEqual(
            response.data["unfound_entities"], ["unfound_entity_name"], msg=msg
        )

        # check that we can submit lists of entity names for roles
        name_list_data = {
            "metadata": {
                "test_role_1_key": [entity_1_instance.name, entity_2_instance.name],
                "test_role_2_key": ["unfound_entity_name", entity_2_instance.name],
            }
        }

        response = self.client.post(event_instance_url, name_list_data, format="json")
        msg = "POST event metadata entities list failed"
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, msg=msg)

        event_entity_1_url = response.data["related_entities"]["Test Role 1"][
            "entities"
        ][0]["url"]
        event_entity_1_path = urlparse(event_entity_1_url).path

        event_entity_2_url = response.data["related_entities"]["Test Role 1"][
            "entities"
        ][1]["url"]
        event_entity_2_path = urlparse(event_entity_2_url).path

        msg = "POST: Entity 1 in Test Role 1 list metadata lookup failed."
        self.assertEqual(event_entity_1_path, entity_1_path, msg=msg)

        msg = "POST: Entity 2 in Test Role 1 list metadata lookup failed."
        self.assertEqual(event_entity_2_path, entity_2_path, msg=msg)

        event_entity_2_url = response.data["related_entities"]["Test Role 2"][
            "entities"
        ][0]["url"]
        event_entity_2_path = urlparse(event_entity_2_url).path

        msg = "POST: Entity 2 in Test Role 2 list metadata lookup failed."
        self.assertEqual(event_entity_2_path, entity_2_path, msg=msg)

        # check that unfound_entity_name is put in unfound_entities
        msg = "POST incorrect unfound_entities (list submission)"
        self.assertEqual(
            response.data["unfound_entities"], ["unfound_entity_name"], msg=msg
        )

        # test entity type, entity group, and event type validations
        event_type_1_instance = event_instance.event_type
        event_type_2_instance = factories.EventTypeFactory()


        entity_group_2_instance = factories.EntityGroupFactory()
        entity_2_instance.groups.add(entity_group_2_instance)
        event_role_2_instance.valid_entity_types.add(entity_2_instance.entity_type)

        # confirm valid entity type
        event_role_1_instance.valid_entity_types.add(entity_1_instance.entity_type)

        data = {
            "metadata": {
                "test_role_1_key": entity_1_instance.name,
            },
        }
        
        response = self.client.post(event_instance_url, data, format="json")
        msg = "POST event metadata entities failed"
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, msg=msg)

        event_entity_1_url = response.data["related_entities"]["Test Role 1"][
            "entities"
        ][0]["url"]
        event_entity_1_path = urlparse(event_entity_1_url).path

        msg = "POST: Failed to confirm valid entity type."
        self.assertEqual(event_entity_1_path, entity_1_path, msg=msg)

        # confirm invalid entity type
        data = {
            "metadata": {
                "test_role_1_key": entity_2_instance.name,
            },
        }

        response = self.client.post(event_instance_url, data, format="json")
        msg = "POST event metadata entities failed"
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, msg=msg)

        event_entity_2_name = response.data["invalid_entities"][0]

        msg = "POST: Failed to confirm invalid entity type."
        self.assertEqual(entity_2_instance.name, event_entity_2_name, msg=msg)

        # confirm invalid entity group
        entity_group_1_instance = factories.EntityGroupFactory()
        event_role_1_instance.valid_entity_groups.add(entity_group_1_instance)

        data = {
            "metadata": {
                "test_role_1_key": entity_1_instance.name,
            },
        }
        
        response = self.client.post(event_instance_url, data, format="json")
        msg = "POST event metadata entities failed"
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, msg=msg)

        event_entity_1_name = response.data["invalid_entities"][0]

        msg = "POST: Failed to confirm invalid entity group."
        self.assertEqual(entity_1_instance.name, event_entity_1_name, msg=msg)

        # confirm valid entity group
        entity_1_instance.groups.add(entity_group_1_instance)

        data = {
            "metadata": {
                "test_role_1_key": entity_1_instance.name,
            },
        }
        
        response = self.client.post(event_instance_url, data, format="json")
        msg = "POST event metadata entities failed"
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, msg=msg)

        event_entity_1_url = response.data["related_entities"]["Test Role 1"][
            "entities"
        ][0]["url"]
        event_entity_1_path = urlparse(event_entity_1_url).path

        msg = "POST: Failed to confirm valid entity group."
        self.assertEqual(event_entity_1_path, entity_1_path, msg=msg)


        # confirm valid event type
        event_type_1_instance = event_instance.event_type
        event_role_1_instance.valid_event_types.add(event_type_1_instance)

        data = {
            "metadata": {
                "test_role_1_key": entity_1_instance.name,
            },
        }

        response = self.client.post(event_instance_url, data, format="json")
        msg = "POST event metadata entities failed"
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, msg=msg)

        event_entity_1_url = response.data["related_entities"]["Test Role 1"][
            "entities"
        ][0]["url"]
        event_entity_1_path = urlparse(event_entity_1_url).path

        msg = "POST: Failed to confirm valid event type."
        self.assertEqual(event_entity_1_path, entity_1_path, msg=msg)


        # confirm invalid event type
        event_type_2_instance = factories.EventTypeFactory()
        event_role_2_instance.valid_event_types.add(event_type_2_instance)

        data = {
            "metadata": {
                "test_role_2_key": entity_2_instance.name,
            },
        }

        response = self.client.post(event_instance_url, data, format="json")
        msg = "POST event metadata entities failed"
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, msg=msg)

        event_entity_1_name = response.data["invalid_entities"][0]

        msg = "POST: Failed to confirm invalid event type."
        self.assertEqual(entity_2_instance.name, event_entity_2_name, msg=msg)

        







    def testUpdateEntityOnEvent(self):
        """Test updating event metadata via HTTP PATCH. 
        1. Update with valid related entities in metadata. Entity relations should be created.
        2. Update again with invalid related entities in metadata. Entity relations should be removed without error. Unfound_entities should be populated.
        3. Update with valid related entities as a list in metadata. Entity relations should be created.
        """
        event_role_1_instance = factories.EntityEventRoleFactory(
            name="Test Role 1", metadata_key="test_role_1_key"
        )
        event_role_2_instance = factories.EntityEventRoleFactory(
            name="Test Role 2", metadata_key="test_role_2_key"
        )
        entity_1_instance = factories.EntityFactory()
        entity_1_path = reverse("entity-detail", args=(entity_1_instance.name,))
        entity_2_instance = factories.EntityFactory()
        entity_2_path = reverse("entity-detail", args=(entity_2_instance.name,))
        event_instance = factories.EventFactory()
        event_id = event_instance.id

        data = {
            "metadata": {
                "test_role_1_key": entity_1_instance.name,
                "test_role_2_key": entity_2_instance.name,
            }
        }
        event_instance_url = reverse("event-detail", args=(event_id,))
        response = self.client.patch(event_instance_url, data, format="json")
        msg = "PATCH event metadata entities failed"
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)

        event_entity_1_url = response.data["related_entities"]["Test Role 1"][
            "entities"
        ][0]["url"]
        event_entity_1_path = urlparse(event_entity_1_url).path

        msg = "PATCH: Entity 1 metadata lookup failed."
        self.assertEqual(event_entity_1_path, entity_1_path, msg=msg)

        event_entity_2_url = response.data["related_entities"]["Test Role 2"][
            "entities"
        ][0]["url"]
        event_entity_2_path = urlparse(event_entity_2_url).path

        msg = "PATCH: Entity 2 metadata lookup failed."
        self.assertEqual(event_entity_2_path, entity_2_path, msg=msg)

        bad_entity_name_data = {
            "metadata": {
                "test_role_1_key": "unfound_entity_name",
                "invalid_key": entity_2_instance.name,
            }
        }

        # response should still be ok even with bad entity name/key. It should simply remove the unfound entity relation from the related_entities list.
        response = self.client.patch(event_instance_url, bad_entity_name_data, format="json")
        msg = "PATCH bad event metadata entities failed"
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)

        msg = "PATCH bad event metadata entities failed. Unfound entity relations weren't properly removed."
        self.assertEqual(len(response.data["related_entities"]), 0, msg=msg)

        # check that unfound_entity_name is put in unfound_entities
        msg = "PATCH incorrect unfound_entities"
        self.assertEqual(
            response.data["unfound_entities"], ["unfound_entity_name"], msg=msg
        )

        # check that we can submit lists of entity names for roles
        name_list_data = {
            "metadata": {
                "test_role_1_key": [entity_1_instance.name, entity_2_instance.name],
                "test_role_2_key": ["unfound_entity_name", entity_2_instance.name],
            }
        }

        response = self.client.patch(event_instance_url, name_list_data, format="json")
        msg = "PATCH event metadata entities list failed"
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)

        event_entity_1_url = response.data["related_entities"]["Test Role 1"][
            "entities"
        ][0]["url"]
        event_entity_1_path = urlparse(event_entity_1_url).path

        event_entity_2_url = response.data["related_entities"]["Test Role 1"][
            "entities"
        ][1]["url"]
        event_entity_2_path = urlparse(event_entity_2_url).path

        msg = "PATCH: Entity 1 in Test Role 1 list metadata lookup failed."
        self.assertEqual(event_entity_1_path, entity_1_path, msg=msg)

        msg = "PATCH: Entity 2 in Test Role 1 list metadata lookup failed."
        self.assertEqual(event_entity_2_path, entity_2_path, msg=msg)

        event_entity_2_url = response.data["related_entities"]["Test Role 2"][
            "entities"
        ][0]["url"]
        event_entity_2_path = urlparse(event_entity_2_url).path

        msg = "PATCH: Entity 2 in Test Role 2 list metadata lookup failed."
        self.assertEqual(event_entity_2_path, entity_2_path, msg=msg)

        # check that unfound_entity_name is put in unfound_entities
        msg = "PATCH incorrect unfound_entities (list submission)"
        self.assertEqual(
            response.data["unfound_entities"], ["unfound_entity_name"], msg=msg
        )


        # test entity type, entity group, and event type validations
        event_type_1_instance = event_instance.event_type
        event_type_2_instance = factories.EventTypeFactory()

        entity_group_2_instance = factories.EntityGroupFactory()
        entity_2_instance.groups.add(entity_group_2_instance)
        event_role_2_instance.valid_entity_types.add(entity_2_instance.entity_type)

        # confirm valid entity type
        event_role_1_instance.valid_entity_types.add(entity_1_instance.entity_type)

        data = {
            "metadata": {
                "test_role_1_key": entity_1_instance.name,
            },
        }
        
        response = self.client.patch(event_instance_url, data, format="json")
        msg = "PATCH event metadata entities failed"
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)

        event_entity_1_url = response.data["related_entities"]["Test Role 1"][
            "entities"
        ][0]["url"]
        event_entity_1_path = urlparse(event_entity_1_url).path

        msg = "PATCH: Failed to confirm valid entity type."
        self.assertEqual(event_entity_1_path, entity_1_path, msg=msg)

        # confirm invalid entity type
        data = {
            "metadata": {
                "test_role_1_key": entity_2_instance.name,
            },
        }

        response = self.client.patch(event_instance_url, data, format="json")
        msg = "PATCH event metadata entities failed"
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)

        event_entity_2_name = response.data["invalid_entities"][0]

        msg = "PATCH: Failed to confirm invalid entity type."
        self.assertEqual(entity_2_instance.name, event_entity_2_name, msg=msg)

        # confirm invalid entity group
        entity_group_1_instance = factories.EntityGroupFactory()
        event_role_1_instance.valid_entity_groups.add(entity_group_1_instance)

        data = {
            "metadata": {
                "test_role_1_key": entity_1_instance.name,
            },
        }
        
        response = self.client.patch(event_instance_url, data, format="json")
        msg = "PATCH event metadata entities failed"
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)

        event_entity_1_name = response.data["invalid_entities"][0]

        msg = "PATCH: Failed to confirm invalid entity group."
        self.assertEqual(entity_1_instance.name, event_entity_1_name, msg=msg)

        # confirm valid entity group
        entity_1_instance.groups.add(entity_group_1_instance)

        data = {
            "metadata": {
                "test_role_1_key": entity_1_instance.name,
            },
        }
        
        response = self.client.patch(event_instance_url, data, format="json")
        msg = "PATCH event metadata entities failed"
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)

        event_entity_1_url = response.data["related_entities"]["Test Role 1"][
            "entities"
        ][0]["url"]
        event_entity_1_path = urlparse(event_entity_1_url).path

        msg = "PATCH: Failed to confirm valid entity group."
        self.assertEqual(event_entity_1_path, entity_1_path, msg=msg)


        # confirm valid event type
        event_type_1_instance = event_instance.event_type
        event_role_1_instance.valid_event_types.add(event_type_1_instance)

        data = {
            "metadata": {
                "test_role_1_key": entity_1_instance.name,
            },
        }

        response = self.client.patch(event_instance_url, data, format="json")
        msg = "PATCH event metadata entities failed"
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)

        event_entity_1_url = response.data["related_entities"]["Test Role 1"][
            "entities"
        ][0]["url"]
        event_entity_1_path = urlparse(event_entity_1_url).path

        msg = "PATCH: Failed to confirm valid event type."
        self.assertEqual(event_entity_1_path, entity_1_path, msg=msg)


        # confirm invalid event type
        event_type_2_instance = factories.EventTypeFactory()
        event_role_2_instance.valid_event_types.add(event_type_2_instance)

        data = {
            "metadata": {
                "test_role_2_key": entity_2_instance.name,
            },
        }

        response = self.client.patch(event_instance_url, data, format="json")
        msg = "PATCH event metadata entities failed"
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)

        event_entity_1_name = response.data["invalid_entities"][0]

        msg = "PATCH: Failed to confirm invalid event type."
        self.assertEqual(entity_2_instance.name, event_entity_2_name, msg=msg)

