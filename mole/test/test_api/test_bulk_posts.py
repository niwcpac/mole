import datetime

from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse

from data_collection.factories import factories


class BulkPostTests(APITestCase):
    def setUp(self):
        factories.PoseSourceFactory(
            name="Pose source test",
        )
        factories.UserFactory(username="test_user", password="test_pass")
        test_entity_type = factories.EntityTypeFactory(
            name="test_entity_type",
            description="test entity type",
        )
        test_entity = factories.EntityFactory(
            entity_type=test_entity_type,
            name="test_entity",
            display_name="Test Entity",
        )
        test_location = factories.LocationFactory(
            name="San Diego Airport",
            description="San Diego Airport",
            point="POINT(-117.19269460307522 32.73555094415604)",
            timezone="America/Los Angeles",
        )
        test_campaign = factories.CampaignFactory(
            name="Test Campaign",
            start_datetime="2018-10-21T05:00:00-0800",
            end_datetime="2018-03-25T19:00:00-0800",
            location=test_location,
            trial_id_major_name="Day",
            trial_id_minor_name="Shift",
            trial_id_micro_name="Attempt",
        )
        test_method1 = factories.TestMethodFactory(
            name="Test Method 1",
            description="Test Method 1",
            version_major=1,
            version_minor=0,
            version_micro=0,
            has_segments=False,
        )
        test_scenario = factories.ScenarioFactory(
            name="Test Scenario",
            description="Test Scenario",
            location=test_location,
            test_method=test_method1,
        )
        clear_weather = factories.WeatherFactory(
            name="Clear", description="No clouds in the sky."
        )
        clear_test_condition = factories.TestConditionFactory(weather=clear_weather)
        performer_test = factories.PerformerFactory(name="TEST PERFORMER")
        test_baseline_capability = factories.CapabilityUnderTestFactory(
            name="Test Capability",
            description="Test Capability",
            performer=performer_test,
        )
        # SystemConfigurations
        test_baseline_configuration = factories.SystemConfigurationFactory(
            name="Test System Config",
            description="Test System Config",
            capabilities_under_test=(test_baseline_capability,),
        )
        factories.TrialFactory(
            id_major=0,
            id_minor=0,
            id_micro=0,
            campaign=test_campaign,
            scenario=test_scenario,
            test_condition=clear_test_condition,
            system_configuration=test_baseline_configuration,
            start_datetime="2018-09-22T05:00:00-0800",
        )
        info_level = factories.EventLevelFactory(
            name="Info", description="info level", key="0", visibility=5
        )
        test_event_type = factories.EventTypeFactory(
            name="Test Event Type",
            description="generic event type",
            event_level=info_level,
        )
        self.client.login(username="test_user", password="test_pass")

    def test_bulk_poses(self):
        """
        Ensure we can create multiple pose objects in one post.
        """
        response = self.client.get(reverse("posesource-list"))
        pose_source_url = response.data[0]["url"]
        lst = []
        for x in range(10):
            data = {
                "lat": x * 10,
                "lon": x * 10,
                "entity": "http://localhost:8000/api/entities/test_entity/",
                "pose_source": pose_source_url,
            }
            lst.append(data)
        url = reverse("pose-list")
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_bulk_events(self):
        """
        Ensure we can create multiple event objects in one post.
        """
        response = self.client.get(reverse("eventtype-list"))
        event_type_url = response.data[0]["url"]
        lst = []
        for x in range(10):
            data = {
                "event_type": event_type_url,
                "start_datetime": (
                    datetime.datetime.now(datetime.timezone.utc)
                    + datetime.timedelta(seconds=10 * x)
                ).isoformat(),
            }
            lst.append(data)
        url = reverse("event-list")
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
