#!/usr/bin/env python

import json

from django.core.management.base import BaseCommand, CommandError
from data_collection.factories import factories


class Command(BaseCommand):
    def handle(self, *args, **options):

        # Users
        # event gen is expecting this user
        factories.UserFactory(username="auto", password="auto")

        test_user = factories.UserFactory(username="test", password="test")
        other_role = factories.RoleFactory(name="Other", description="Other role.")

        # PointStyles
        test_point_style = factories.PointStyleFactory(
            name="test_point_style",
            description="",
            icon="border-none",
            color="#ffffff",
            marker_color="#9e9e9e",
        )

        # Weather. Descriptions slightly modified from wunderground (wunderwiki)
        clear_weather = factories.WeatherFactory(
            name="Clear", description="No clouds in the sky."
        )

        # TestConditions
        clear_test_condition = factories.TestConditionFactory(weather=clear_weather)

        # Performers
        performer_test = factories.PerformerFactory(name="TEST PERFORMER")

        # CapabilitiesUnderTest
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

        # Locations
        test_location = factories.LocationFactory(
            name="San Diego Airport",
            description="San Diego Airport",
            point="POINT(-117.19269460307522 32.73555094415604)",
            timezone="America/Los Angeles",
        )

        test_method1 = factories.TestMethodFactory(
            name="Test Method 1",
            description="Test Method 1",
            version_major=1,
            version_minor=0,
            version_micro=0,
            has_segments=False,
        )

        # Scenarios
        test_scenario = factories.ScenarioFactory(
            name="Test Scenario",
            description="Test Scenario",
            location=test_location,
            test_method=test_method1,
        )

        # EventLevels
        info_level = factories.EventLevelFactory(
            name="Info", description="info level", key="0", visibility=5
        )

        # EventTypes
        test_event_type = factories.EventTypeFactory(
            name="Test Event Type",
            description="generic event type",
            event_level=info_level,
            is_manual=True,
            point_style=test_point_style,
        )

        test_event_type2 = factories.EventTypeFactory(
            name="Type Two",
            description="another generic event type",
            event_level=info_level,
            is_manual=True,
        )

        # Campaigns
        test_campaign = factories.CampaignFactory(
            name="Test Campaign",
            description="Test Campaign",
            start_datetime="2018-01-01T00:00:00-0800",
            end_datetime="2019-01-01T00:00:00-0800",
            location=test_location,
            trial_id_major_name="Major",
            trial_id_minor_name="Minor",
            trial_id_micro_name="Micro",
        )

        # Trials
        trial_0 = factories.TrialFactory(
            id_major=0,
            id_minor=0,
            id_micro=0,
            campaign=test_campaign,
            scenario=test_scenario,
            testers=(),
            entities=(),
            test_condition=clear_test_condition,
            system_configuration=test_baseline_configuration,
            start_datetime="2018-01-01T00:00:00-0800",
        )

        # Triggers
        cond_var = factories.ConditionVariableFactory(
            name="test_cv_alpha",
            description="",
            variable="test_cv_alpha : status_topic.field1",
        )
        requested_data = factories.RequestedDataFactory(
            name="test_rq_alpha",
            description="",
            destination_url="$EVENT$",
            payload={
                "final_field1": "status_topic.field1",
                "final_field2": "aux_topic.aux_field",
            },
        )
        factories.TriggerFactory(
            name="trigger1",
            key="key1",
            description="test trigger",
            is_active=True,
            is_manual=False,
            creates_event=True,
            condition="test_cv_alpha != False",
            condition_variables=[cond_var],
            requested_dataset=[requested_data],
            event_type=test_event_type,
            trigger_transport="redis",
        )

        cond_var2 = factories.ConditionVariableFactory(
            name="test_cv_beta",
            description="",
            variable="test_cv_beta : random_topic.field",
        )
        cond_var3 = factories.ConditionVariableFactory(
            name="test_cv_charlie",
            description="",
            variable="test_cv_charlie : other_random_topic.other_field",
        )
        factories.TriggerFactory(
            name="trigger2",
            key="key2",
            description="",
            is_active=True,
            is_manual=False,
            creates_event=True,
            condition="test_cv_beta != False and test_cv_charlie != False",
            condition_variables=[cond_var2, cond_var3],
            requested_dataset=[],
            event_type=test_event_type2,
            trigger_transport="redis",
        )

        cond_var4 = factories.ConditionVariableFactory(
            name="test_cv_delta",
            description="",
            variable="test_cv_delta : testtopic.key",
        )
        factories.TriggerFactory(
            name="trigger3",
            key="key3",
            description="",
            is_active=True,
            is_manual=False,
            creates_event=True,
            condition="test_cv_delta == True",
            condition_variables=[cond_var4],
            requested_dataset=[],
            event_type=test_event_type,
            trigger_transport="redis",
        )

        factories.TriggerFactory(
            name="trigger4",
            key="key4",
            description="",
            is_active=True,
            is_manual=False,
            creates_event=False,
            condition='test_cv_delta == "no_create"',
            condition_variables=[cond_var4],
            requested_dataset=[],
            event_type=test_event_type,
            trigger_transport="redis",
        )
