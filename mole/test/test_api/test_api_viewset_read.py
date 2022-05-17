import datetime
import random

from rest_framework.test import APITestCase
from rest_framework import status

from django.urls import reverse
from openapi_tester import SchemaTester

from data_collection.factories import factories
import factory

from .parameterized import NamedParameterizedTestsMeta, parameterized
from .viewset_to_factory import viewset_to_factory

schema_tester = SchemaTester(schema_file_path="./schema.yml")
read_test_list = viewset_to_factory.items()


class ViewsetReadTests(APITestCase, metaclass=NamedParameterizedTestsMeta):
    def setUp(self):
        self.test_user = factories.UserFactory(
            username="test_user", password="test_pass"
        )
        self.client.login(username="test_user", password="test_pass")

    @parameterized(*read_test_list)
    def test_viewset_read_list(self, viewset_name_factory):
        viewset_name, factory = viewset_name_factory
        instance = factory()
        url_list = reverse(viewset_name + "-list")

        self.test_user = factories.UserFactory(
            username="test_user", password="test_pass"
        )
        self.client.login(username="test_user", password="test_pass")

        response = self.client.get(url_list)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        schema_tester.validate_response(response=response)

    @parameterized(*read_test_list)
    def test_viewset_read_detail(self, viewset_name_factory):
        viewset_name, factory = viewset_name_factory
        instance = factory()
        if hasattr(instance, "id"):
            url_detail = reverse(viewset_name + "-detail", args=(instance.id,))
        else:
            url_detail = reverse(viewset_name + "-detail", args=(instance.name,))

        self.test_user = factories.UserFactory(
            username="test_user", password="test_pass"
        )
        self.client.login(username="test_user", password="test_pass")

        response = self.client.get(url_detail)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        schema_tester.validate_response(response=response)


#    @parameterized(*extra_read_endpoints_list)
#    def test_read_extra(self, (viewset_name, endpoints)):
#        factory = viewset_to_factory[viewset_name]
#        instance = factory()
#        for endpoint in endpoints:
#            url_extra = reverse(viewset_name + '-list') + endpoint
#            response = self.client.get(url_extra)
#            self.assertEqual(response.status_code, status.HTTP_200_OK)


class ReadExtraEndpoints(APITestCase):
    def setUp(self):
        self.test_user = factories.UserFactory(
            username="test_user", password="test_pass"
        )
        self.client.login(username="test_user", password="test_pass")

    def testUserCurrent(self):
        instance = factories.UserFactory()
        url = reverse("user-list") + "current/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def testUserProfileCurrent(self):
        instance = factories.UserProfileFactory(user=self.test_user)
        url = reverse("userprofile-list") + "current/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def testTesterCurrent(self):
        instance = factories.TesterFactory(user=self.test_user)
        instance.user.profile = factories.UserProfileFactory(
            user=instance.user, current_role=instance.role
        )
        url = reverse("tester-list") + "current/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def testCampaignLatest(self):
        instance = factories.CampaignFactory()
        url = reverse("campaign-list") + "latest/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def testTrialLatest(self):
        instance = factories.TrialFactory()
        url = reverse("trial-list") + "latest/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def testTrialCurrent(self):
        instance = factories.TrialFactory()
        url = reverse("trial-list") + "current/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def testTrialClockState(self):
        instance = factories.TrialFactory()
        url = reverse("trial-list") + str(instance.id) + "/clock_state/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def testWeatherCurrent(self):
        instance = factories.WeatherFactory()
        instance.current = True
        instance.save()
        url = reverse("weather-list") + "current/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def testTriggerPublish(self):
        instance = factories.TriggerFactory()
        url = reverse("trigger-list") + "publish/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def testServerDatetime(self):
        url = reverse("server_datetime")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def testEntityGroup(self):
        # url = reverse('entity_group')
        url = "/api/entity_groups/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def testQuerysetSpecification(self):
        # url = reverse('entity_group')
        url = "/api/queryset_specifications/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def testQuerysetMethod(self):
        # url = reverse('entity_group')
        url = "/api/queryset_methods/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class QueryEndpoints(APITestCase):
    def setUp(self):
        self.test_user = factories.UserFactory(
            username="test_user", password="test_pass"
        )
        self.client.login(username="test_user", password="test_pass")

    def testPoseMinDatetime(self):
        instance = factories.PoseFactory()
        past_time = (datetime.datetime.now() - datetime.timedelta(1)).isoformat()
        url = reverse("pose-list") + "?min_datetime=" + past_time
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

        future_time = (datetime.datetime.now() + datetime.timedelta(1)).isoformat()
        url = reverse("pose-list") + "?min_datetime=" + future_time
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 0)

    def testServerServerType(self):
        instance = factories.ServerFactory()
        url = reverse("server-list") + "?server_type_key=servertype"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def testTesterQuery(self):
        instance = factories.TesterFactory()
        user_id = instance.user.id
        role_id = instance.role.id
        username = instance.user.username
        role_name = instance.role.name

        url = reverse("tester-list") + "?userid=" + str(user_id)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["user_id"], user_id)

        url = reverse("tester-list") + "?role_id=" + str(role_id)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["role_id"], role_id)

        url = reverse("tester-list") + "?username=" + username
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["username"], username)

        url = reverse("tester-list") + "?role_name=" + role_name
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["role_name"], role_name)

    def testCampaignQuery(self):
        instance = factories.CampaignFactory()
        trial = factories.TrialFactory(campaign=instance)
        campaign_id = instance.id

        url = reverse("campaign-detail", args=(campaign_id,)) + "latest_trial/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["trial_names"][0], str(trial))

    def testTrialQuery(self):
        entity_in = factories.EntityFactory()
        test_condition_in = factories.TestConditionFactory()
        instance = factories.TrialFactory(
            entities=[entity_in], test_condition=test_condition_in
        )
        campaign = instance.campaign
        location = instance.scenario.location
        test_method = instance.scenario.test_method
        first_entity = instance.entities.first()
        test_condition_id = instance.test_condition_id

        url = reverse("trial-list") + "?campaign=" + str(campaign.id)
        response = self.client.get(url)
        msg = "trials/?campaign= query failed"

        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)
        self.assertEqual(len(response.data), 1, msg=msg)

        url = reverse("trial-list") + "?location=" + str(location.id)
        response = self.client.get(url)
        msg = "trials/?location= query failed"
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)
        self.assertEqual(len(response.data), 1, msg=msg)

        url = reverse("trial-list") + "?test_method=" + str(test_method.id)
        response = self.client.get(url)
        msg = "trials/?test_method= query failed"
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)
        self.assertEqual(len(response.data), 1, msg=msg)

        url = reverse("trial-list") + "?entities=" + str(first_entity.name)
        response = self.client.get(url)
        msg = "trials/?entities= query failed"
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)
        self.assertEqual(len(response.data), 1, msg=msg)

        url = reverse("trial-list") + "?test_condition=" + str(test_condition_id)
        response = self.client.get(url)
        msg = "trials/?test_condition= query failed"
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)
        self.assertEqual(len(response.data), 1, msg=msg)

        url = reverse("trial-list") + "?ordering=-ids"
        response = self.client.get(url)
        msg = "trials/?ordering=-ids query failed"
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)
        self.assertEqual(len(response.data), 1, msg=msg)

        url = reverse("trial-list") + "?ordering=-start_datetime"
        response = self.client.get(url)
        msg = "trials/?ordering=-start_datetime query failed"
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)
        self.assertEqual(len(response.data), 1, msg=msg)

    def testPoseQuery(self):
        instance = factories.PoseFactory()

        entity = instance.entity.name
        url = reverse("pose-list") + "?entity_name=" + entity
        response = self.client.get(url)
        msg = "poses/?entity_name query failed"
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)
        self.assertEqual(len(response.data["results"]), 1, msg=msg)

        one_hour_ago = (
            datetime.datetime.now() - datetime.timedelta(hours=1)
        ).isoformat()
        url = reverse("pose-list") + "?min_datetime=" + one_hour_ago
        response = self.client.get(url)
        msg = "poses/?min_datetime query failed"
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)
        self.assertEqual(len(response.data["results"]), 1, msg=msg)

        one_hour_from_now = (
            datetime.datetime.now() + datetime.timedelta(hours=1)
        ).isoformat()
        url = reverse("pose-list") + "?max_datetime=" + one_hour_from_now
        response = self.client.get(url)
        msg = "poses/?max_datetime query failed"
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)
        self.assertEqual(len(response.data["results"]), 1, msg=msg)

    def testEventQuery(self):
        instance = factories.EventFactory()

        url = reverse("event-list") + "?ordering=-modified_datetime"
        response = self.client.get(url)
        msg = "event/?ordering=-modified_datetime failed"
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)
        self.assertEqual(len(response.data["results"]), 1, msg=msg)

        url = reverse("event-list") + "?ordering=modified_datetime"
        response = self.client.get(url)
        msg = "event/?ordering=modified_datetime failed"
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)
        self.assertEqual(len(response.data["results"]), 1, msg=msg)

        url = reverse("event-list") + "?ordering=-start_datetime"
        response = self.client.get(url)
        msg = "event/?ordering=-start_datetime failed"
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)
        self.assertEqual(len(response.data["results"]), 1, msg=msg)

        url = reverse("event-list") + "?ordering=start_datetime"
        response = self.client.get(url)
        msg = "event/?ordering=start_datetime failed"
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)
        self.assertEqual(len(response.data["results"]), 1, msg=msg)

        url = reverse("event-list") + "?trial=" + str(instance.trial_id)
        response = self.client.get(url)
        msg = "event/?trial={} failed".format(instance.trial_id)
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)
        self.assertEqual(len(response.data["results"]), 1, msg=msg)

        url = reverse("event-list") + "?event_type=" + str(instance.event_type.name)
        response = self.client.get(url)
        msg = "event/?event_type={} failed".format(instance.event_type.name)
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)
        self.assertEqual(len(response.data["results"]), 1, msg=msg)

        url = reverse("event-list") + "?event_type_id=" + str(instance.event_type.id)
        response = self.client.get(url)
        msg = "event/?event_type_id={} failed".format(instance.event_type.id)
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)
        self.assertEqual(len(response.data["results"]), 1, msg=msg)

        url = reverse("event-list") + "?weather=" + str(instance.weather.id)
        response = self.client.get(url)
        msg = "event/?weather={} failed".format(instance.weather.id)
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)
        self.assertEqual(len(response.data["results"]), 1, msg=msg)

    def testRegionQuery(self):
        region_instance = factories.RegionFactory()
        lat = random.uniform(21, 29)
        lon = random.uniform(20, 30)

        locate_region = f"?latitude={lat}&longitude={lon}"
        url = reverse("region-list") + locate_region
        response = self.client.get(url)
        msg = "regions/{} failed".format(locate_region)
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)
        self.assertEqual(len(response.data), 1, msg=msg)

        nearest_key_point_to = f"?nearest_key_point_to={lat},{lon}"
        url = reverse("region-list") + nearest_key_point_to
        response = self.client.get(url)
        msg = "regions/{} failed".format(locate_region)
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)
        self.assertEqual(len(response.data), 1, msg=msg)

    def testEntityQuery(self):
        entity_instance = factories.EntityFactory()
        entity_group_instance = factories.EntityGroupFactory()
        entity_instance.groups.add(entity_group_instance)
        region_instance = factories.RegionFactory()
        pose_instance = factories.PoseFactory(entity=entity_instance)

        url = reverse("entity-list") + "?group=" + str(entity_group_instance.name)
        response = self.client.get(url)
        msg = "entities/?group={} failed".format(entity_group_instance.name)
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)
        self.assertEqual(len(response.data["results"]), 1, msg=msg)

        url = (
            reverse("entity-list")
            + "?group__in="
            + str(entity_group_instance.id)
            + ","
            + str(entity_group_instance.id + 1)
        )
        response = self.client.get(url)
        msg = "entities/?group__in={} failed".format(
            str(entity_group_instance.id) + "," + str(entity_group_instance.id + 1)
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)
        self.assertEqual(len(response.data["results"]), 1, msg=msg)

        url = reverse("entity-list") + "?groups=" + str(entity_group_instance.id)
        response = self.client.get(url)
        msg = "entities/?groups={} failed".format(entity_group_instance.id)
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)
        self.assertEqual(len(response.data["results"]), 1, msg=msg)

        url = reverse("entity-list") + f"?region={region_instance.name}"
        response = self.client.get(url)
        msg = f"entities/?region={region_instance.name} failed"
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)
        self.assertEqual(len(response.data["results"]), 1, msg=msg)

        url = (
            reverse("entity-list")
            + f"?region={region_instance.name}&entity_type={entity_instance.entity_type}"
        )
        response = self.client.get(url)
        msg = f"entities/?region={region_instance.name}&entity_type={entity_instance.entity_type} failed"
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)
        self.assertEqual(len(response.data["results"]), 1, msg=msg)

    def testEntityStateQuery(self):
        entity_state_instance = factories.EntityStateFactory()
        url = reverse("entitystate-list") + entity_state_instance.name + "/"
        response = self.client.get(url)
        msg = f"{url} failed"
        self.assertEqual(response.status_code, status.HTTP_200_OK, msg=msg)
        self.assertEqual(response.data["name"], entity_state_instance.name, msg=msg)