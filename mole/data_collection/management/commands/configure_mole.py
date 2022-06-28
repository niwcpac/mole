#!/usr/bin/env python

from django.core.management.base import BaseCommand

from data_collection.factories import factories
from automation.factories import factories as auto_factories


class Command(BaseCommand):
    def handle(self, *args, **options):
        # Users
        admin_user = factories.UserFactory(username="admin", password="admin")
        auto_user = factories.UserFactory(username="auto", password="auto")
        other_role = factories.RoleFactory(name="Other", description="Other role.")

        # UserProfiles
        factories.UserProfileFactory(user=admin_user, current_role=other_role)

        # Testers
        other_tester = factories.TesterFactory(user=admin_user, role=other_role)

        # PointStyles
        example_point_style = factories.PointStyleFactory(
            name="example_point_style",
            description="Air vehicle",
            icon="helicopter",
            color="#ffffff",
            marker_color="#9e9e9e",
        )

        unassigned_event_point_style = factories.PointStyleFactory(
            name="unassigned_event",
            description="",
            icon="border-none",
            color="#ffffff",
            marker_color="#9e9e9e",
        )
        unknown_entity_point_style = factories.PointStyleFactory(
            name="unassigned_event",
            description="",
            icon="unknown.png",
            color="#ffffff",
            marker_color="#9e9e9e",
        )

        detection_event_point_style = factories.PointStyleFactory(
            name="detection_event",
            description="",
            icon="map-pin",
            color="#ffffff",
            marker_color="#EDDA14",
        )

        interaction_event_point_style = factories.PointStyleFactory(
            name="interaction_event",
            description="",
            icon="hand-point-down",
            color="#ffffff",
            marker_color="#EDDA14",
        )

        trial_init_event_point_style = factories.PointStyleFactory(
            name="trial_init_event",
            description="",
            icon="tasks",
            color="#ffffff",
            marker_color="#EDDA14",
        )

        trial_start_event_point_style = factories.PointStyleFactory(
            name="trial_start_event",
            description="",
            icon="play",
            color="#ffffff",
            marker_color="#EDDA14",
        )

        trial_end_event_point_style = factories.PointStyleFactory(
            name="trial_end_event",
            description="",
            icon="stop",
            color="#ffffff",
            marker_color="#EDDA14",
        )

        node_online_event_point_style = factories.PointStyleFactory(
            name="node_online_event",
            description="",
            icon="check-circle",
            color="#ffffff",
            marker_color="#2EBE30",
        )

        other_event_point_style = factories.PointStyleFactory(
            name="other_event",
            description="",
            icon="question-circle",
            color="#ffffff",
            marker_color="#2EBE30",
        )

        ignore_event_point_style = factories.PointStyleFactory(
            name="ignore_event",
            description="",
            icon="trash",
            color="#ffffff",
            marker_color="#E56C14",
        )

        maintenance_stop_event_point_style = factories.PointStyleFactory(
            name="maintenance_stop_event",
            description="",
            icon="wrench",
            color="#ffffff",
            marker_color="#E56C14",
        )

        safety_stop_event_point_style = factories.PointStyleFactory(
            name="safety_stop_event",
            description="",
            icon="medkit",
            color="#ffffff",
            marker_color="#EDDA14",
        )

        node_warn_event_point_style = factories.PointStyleFactory(
            name="node_warn_event",
            description="",
            icon="thermometer-half",
            color="#ffffff",
            marker_color="#EDDA14",
        )

        cancel_scheduled_events_point_style = factories.PointStyleFactory(
            name="cancel_scheduled_events",
            description="",
            icon="ban",
            color="#ffffff",
            marker_color="#9c1f09",
        )

        # Entity States
        example_entity_state = factories.EntityStateFactory(
            name="example_state",
            point_style_icon_transform="{icon}_example",
            point_style_color_transform="#00AA00",
            point_style_use_marker_pin_override=True,
            point_style_marker_color_transform="{marker_color}33",
            point_style_scale_factor_override=7,
            point_style_animation_transform="Previous animation: {animation}",
            point_style_render_as_symbol_override=True,
        )

        # Entity Types
        example_entity_type = factories.EntityTypeFactory(
            name="example",
            description="Example entity type, air vehicle",
            point_style=example_point_style,
        )

        # Required entity type, do not remove
        map_type = factories.EntityTypeFactory(
            name="map", description="Default (required) MapType"
        )

        # Entity Groups
        example_entity_group = factories.EntityGroupFactory(
            name="Example entity group", description="example"
        )

        # Entities
        example_entity = factories.EntityFactory(
            entity_type=example_entity_type,
            name="example_entity",
            display_name="Example Entity",
            description="An example entity",
            physical_id="example_entity",
        )
        example_entity.groups.add(example_entity_group)

        # Required entity
        map_marker = factories.EntityFactory(
            entity_type=map_type,
            name="map_marker",
            display_name="Map Marker",
            description="Default Entity required for Pose",
            physical_id="map_marker",
        )

        # Capabilities (test subject payload capabilities)
        test_subject_capability = factories.CapabilityFactory(
            name="example_capability",
            display_name="Example Capability",
            description="Example capability description",
        )

        # Mods (combinations of subject payload capabilities)
        capability_mod = factories.ModFactory(
            name="Capability Mod",
            display_name="Capability Mod display name",
            description="Capability Mod description",
            capabilities=[test_subject_capability],
        )

        # Weather. Descriptions slightly modified from wunderground (wunderwiki)
        clear_weather = factories.WeatherFactory(
            name="Clear", description="No clouds in the sky."
        )

        mostly_sunny_weather = factories.WeatherFactory(
            name="Mostly sunny", description="Most of the sky is clear of clouds."
        )

        partly_cloudy_weather = factories.WeatherFactory(
            name="Partly cloudy",
            description="About half of the sky is covered by clouds.",
        )

        mostly_cloudy_weather = factories.WeatherFactory(
            name="Mostly cloudy",
            description="More than half of the sky is covered in clouds.",
        )

        cloudy_weather = factories.WeatherFactory(
            name="Cloudy", description="Sky is completely covered."
        )

        # TestConditions
        clear_test_condition = factories.TestConditionFactory(weather=clear_weather)
        mostly_sunny_test_condition = factories.TestConditionFactory(
            weather=mostly_sunny_weather
        )
        partly_cloudy_test_condition = factories.TestConditionFactory(
            weather=partly_cloudy_weather
        )
        mostly_cloudy_test_condition = factories.TestConditionFactory(
            weather=mostly_cloudy_weather
        )
        cloudy_test_condition = factories.TestConditionFactory(weather=cloudy_weather)

        # Performers
        test_performer = factories.PerformerFactory(
            name="TEST PERFORMER", description=""
        )

        # CapabilitiesUnderTest
        capability_under_test = factories.CapabilityUnderTestFactory(
            name="Capability under test",
            description="Capability under test description",
            performer=test_performer,
        )

        # SystemConfigurations
        test_baseline_configuration = factories.SystemConfigurationFactory(
            name="Test Baseline",
            description="Test Baseline",
            capabilities_under_test=(capability_under_test,),
        )

        # Locations
        test_location = factories.LocationFactory(
            name="Test Location",
            description="Description for test location",
            point="POINT(-118.419080 33.374153)",
            timezone="America/Los Angeles",
        )

        test_method = factories.TestMethodFactory(
            name="Test method",
            description="Test method description",
            version_major=1,
            version_minor=0,
            version_micro=0,
            has_segments=False,
        )

        # EventLevels
        unassigned_level = factories.EventLevelFactory(
            name="Unassigned", description="No level set yet", key="0", visibility=5
        )

        debug_level = factories.EventLevelFactory(
            name="Debug", description="Debug level events", key="1", visibility=1
        )

        info_level = factories.EventLevelFactory(
            name="Info", description="Informational events", key="2", visibility=2
        )

        warn_level = factories.EventLevelFactory(
            name="Warn",
            description="Potentially negative situation",
            key="3",
            visibility=3,
        )

        critical_level = factories.EventLevelFactory(
            name="Critical", description="Critical events", key="4", visibility=4
        )

        hidden_level = factories.EventLevelFactory(
            name="Hidden",
            description="Logged events that are normally hidden.",
            key="6",
            visibility=0,
        )

        # EventTypes
        unassigned_event_type = factories.EventTypeFactory(
            name="Unassigned",
            description="No event type has been set yet",
            event_level=unassigned_level,
            is_manual=True,
            point_style=unassigned_event_point_style,
        )

        detection_event_type = factories.EventTypeFactory(
            name="Detection",
            description="Detected test element.",
            event_level=critical_level,
            ends_segment=True,
            is_manual=True,
            point_style=detection_event_point_style,
        )

        interaction_event_type = factories.EventTypeFactory(
            name="Interaction",
            description="Interacted with test element.",
            event_level=critical_level,
            ends_segment=True,
            is_manual=True,
            point_style=interaction_event_point_style,
        )

        trial_init_event_type = factories.EventTypeFactory(
            name="Trial Init",
            description="Initialize trial, Submitted by Test Administrator",
            event_level=critical_level,
            ends_segment=True,
            is_manual=True,
            point_style=trial_init_event_point_style,
        )

        trial_start_event_type = factories.EventTypeFactory(
            name="Trial Start",
            description="Start time for new trial. Submitted by Test Administrator",
            event_level=critical_level,
            ends_segment=True,
            is_manual=True,
            point_style=trial_start_event_point_style,
        )

        trial_end_event_type = factories.EventTypeFactory(
            name="Trial End",
            description="End time for trial. Submitted by Test Administrator",
            event_level=critical_level,
            ends_segment=True,
            is_manual=True,
            point_style=trial_end_event_point_style,
        )

        node_online_event_type = factories.EventTypeFactory(
            name="Node Online",
            description="Node Online. Submitted by node on startup.",
            event_level=info_level,
            ends_segment=True,
            is_manual=True,
            point_style=node_online_event_point_style,
        )

        other_event_type = factories.EventTypeFactory(
            name="Other",
            description="Event that doesn't fit in another category",
            event_level=info_level,
            is_manual=True,
            point_style=other_event_point_style,
        )

        ignore_event_type = factories.EventTypeFactory(
            name="Ignore",
            description="Ignore this event",
            event_level=hidden_level,
            is_manual=False,
            point_style=ignore_event_point_style,
        )

        maintenance_stop_event_type = factories.EventTypeFactory(
            name="Maintenance Stop",
            description="Performer interacted with software or hardware. Submitted by Test Administrator.",
            event_level=warn_level,
            has_duration=True,
            is_manual=True,
            point_style=maintenance_stop_event_point_style,
        )

        safety_stop_event_type = factories.EventTypeFactory(
            name="Safety Stop",
            description="Unsafe condition identified. Submitted by Test Administrator",
            event_level=critical_level,
            has_duration=True,
            is_manual=True,
            point_style=safety_stop_event_point_style,
        )

        node_warn_event_type = factories.EventTypeFactory(
            name="Node Warning",
            event_level=critical_level,
            has_duration=False,
            is_manual=True,
            point_style=node_warn_event_point_style,
        )

        cancel_scheduled_events_event_type = factories.EventTypeFactory(
            name="Cancel Scheduled",
            description="Cancels all future events scheduled by scripts.",
            event_level=critical_level,
            has_duration=False,
            is_manual=True,
            point_style=cancel_scheduled_events_point_style,
        )

        # Entity Event Roles
        example_role = factories.EntityEventRoleFactory(
            name="example_role",
            metadata_key="example_role",
            entity_state=example_entity_state,
            valid_event_types=[node_online_event_type],
            valid_entity_types=[example_entity_type],
            valid_entity_groups=[example_entity_group],
        )

        # Scripts
        has_trial_init_condition = auto_factories.ScriptConditionFactory(
            name="Trial Init Condition",
            description="Requires that the trial has a trial init event.",
            trial_has_event=trial_init_event_type,
        )

        trial_start_script = auto_factories.ScriptFactory(
            name="On Trial Start Script",
            initiating_event_types=[trial_start_event_type],
            conditions=[has_trial_init_condition],
            cancelling_event_type=cancel_scheduled_events_event_type,
            scripted_event_head=auto_factories.ScriptedEventFactory(
                name="Create other event after 0 seconds",
                conditions=[],
                delay_seconds=0,
                event_type=other_event_type,
                add_event_metadata={"note": "Created by script."},
                next_scripted_event=None,
            ),
        )

        # Scenarios
        test_scenario = factories.ScenarioFactory(
            name="Test Scenario",
            description="Test Scenario",
            location=test_location,
            test_method=test_method,
        )

        scripted_scenario = factories.ScenarioFactory(
            name="Example Scripted Scenario",
            description="Example Scripted Scenario",
            location=test_location,
            test_method=test_method,
            scripts=[trial_start_script],
        )

        # Campaigns
        test_campaign = factories.CampaignFactory(
            name="Example Test",
            description="Example test description",
            start_datetime="2018-10-21T05:00:00-0800",
            end_datetime="2018-03-25T19:00:00-0800",
            location=test_location,
            trial_id_major_name="Day",
            trial_id_minor_name="Shift",
            trial_id_micro_name="Attempt",
        )

        # Clock Configs
        trial_phase_1 = factories.ClockPhaseFactory(
            message="Standing By", message_only=True, ends_with_trial_start=True
        )
        trial_phase_2 = factories.ClockPhaseFactory(
            message="Time Until Setup",
            countdown=True,
            ends_with_trial_start=True,
            duration_seconds=900,
        )
        trial_phase_3 = factories.ClockPhaseFactory(
            message="Pre-Run Checkout",
            countdown=True,
            starts_with_trial_start=True,
            duration_seconds=900,
        )
        trial_phase_4 = factories.ClockPhaseFactory(
            message="Team Setup", message_only=True, starts_with_trial_end=True
        )
        trial_phase_5 = factories.ClockPhaseFactory(
            message="5 minute countdown from maintenance stop event:",
            countdown=True,
            duration_seconds=300,
            starts_with_event_type=maintenance_stop_event_type,
        )
        trial_clock = factories.ClockConfigFactory(
            name="Trial Clock",
            phases=[
                trial_phase_1,
                trial_phase_2,
                trial_phase_3,
                trial_phase_4,
                trial_phase_5,
            ],
        )

        shift_phase_1 = factories.ClockPhaseFactory(
            message="Time until shift start:", ends_with_trial_start=True
        )
        shift_phase_2 = factories.ClockPhaseFactory(
            message="Time until shift end:", ends_with_trial_end=True
        )
        shift_clock = factories.ClockConfigFactory(
            name="Shift Clock", phases=[shift_phase_1, shift_phase_2]
        )

        campaign_phase_1 = factories.ClockPhaseFactory(
            message="Welcome to a Mole Campaign", ends_with_trial_start=True
        )
        campaign_clock = factories.ClockConfigFactory(
            name="Campaign Clock", phases=[campaign_phase_1]
        )

        # Trials
        trial_0 = factories.TrialFactory(
            id_major=0,
            id_minor=0,
            id_micro=0,
            campaign=test_campaign,
            scenario=test_scenario,
            testers=(other_tester,),
            entities=(),
            test_condition=clear_test_condition,
            system_configuration=test_baseline_configuration,
            start_datetime="2021-1-22T07:00:00-0800",
            clock_config=campaign_clock,
        )

        trial_1 = factories.TrialFactory(
            id_major=0,
            id_minor=1,
            id_micro=0,
            campaign=test_campaign,
            scenario=test_scenario,
            testers=(other_tester,),
            entities=(),
            test_condition=clear_test_condition,
            system_configuration=test_baseline_configuration,
            start_datetime="2021-1-22T05:00:00-0800",
            clock_config=shift_clock,
        )

        trial_2 = factories.TrialFactory(
            id_major=0,
            id_minor=1,
            id_micro=1,
            campaign=test_campaign,
            scenario=test_scenario,
            testers=(other_tester,),
            entities=(),
            test_condition=clear_test_condition,
            system_configuration=test_baseline_configuration,
            start_datetime="2021-1-22T06:00:00-0800",
            clock_config=trial_clock,
            current=True,
        )

        # Segments
        ## not sure we need segments?
        segment_1 = factories.SegmentFactory(
            tag=1, name="Segment 1", description="Seg 1", scenarios=[test_scenario]
        )

        # Pose Sources
        gps_pose_source = factories.PoseSourceFactory(
            name="GPS", description="Raw GPS pose data"
        )

        reported_pose_source = factories.PoseSourceFactory(
            name="Reported", description="Subject-reported location of a subject"
        )

        # Poses
        pose_1 = factories.PoseFactory(
            point="POINT(-118.419080 33.374153)",
            elevation=0,
            heading=0,
            entity=example_entity,
            pose_source=gps_pose_source,
            timestamp="2018-09-22T09:00:10.5-0500",
        )

        # Server Types
        map_server = factories.ServerTypeFactory(
            name="Tiled Aerial Imagery Server",
            description="Server that provides tiled aerial imagery",
            key="tiled_imagery",
        )

        # Server Params
        map_center = factories.ServerParamFactory(
            name="Map Center",
            description="",
            param="mapOptions",
            value='{"lat": 33.374153, "lng": -118.419080, "zoom": 11}',
        )

        normal_layer_options = factories.ServerParamFactory(
            name="Normal Layer Options",
            description="",
            param="layerOptions",
            value='{"minZoom":1, "maxZoom":20}',
        )

        local_world_layer_options = factories.ServerParamFactory(
            name="Local World Layer Options",
            description="",
            param="layerOptions",
            value='{"minZoom":1, "maxZoom":20, "minElevation":0, "default":"true"}',
        )

        local_world_layer_options2 = factories.ServerParamFactory(
            name="Local World Layer Options2",
            description="",
            param="layerOptions",
            value='{"minZoom":1, "maxZoom":20, "maxElevation": 0}',
        )

        # Servers
        openstreetmap_tile_server = factories.ServerFactory(
            name="OpenStreetMap tiles",
            server_type=map_server,
            active=True,
            base_url="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
            server_params=[map_center, normal_layer_options],
        )

        local_world_tile_server = factories.ServerFactory(
            name="Local World Tiles",
            server_type=map_server,
            active=True,
            base_url="http://{window.location.hostname}/maps/styles/ne_simple_style/{z}/{x}/{y}.png",
            server_params=[map_center, local_world_layer_options],
        )

        local_world_tile_server2 = factories.ServerFactory(
            name="Local World Tiles2",
            server_type=map_server,
            active=True,
            base_url="http://{window.location.hostname}/maps/styles/ne_simple_style2/style.json",
            server_params=[map_center, local_world_layer_options2],
        )

        # Image Types
        user_upload_image_type = factories.ImageTypeFactory(
            name="User Uploaded",
            description="Images uploaded by user from phone/tablet/etc.",
        )
