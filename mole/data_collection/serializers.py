import operator
import datetime
import json
import ast
import re

from numpy import array
from django.contrib.gis.geos import LineString
from django.db.models import Q
from django.contrib.auth.models import User
from django.utils import timezone, http
from django.contrib.gis.geos import Point
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from rest_framework import serializers
from rest_framework.reverse import reverse
from rest_framework_gis import serializers as gis_serializers
import rest_framework.exceptions

from easy_thumbnails.templatetags.thumbnail import thumbnail_url

import data_collection.models as dcm


class DynamicFieldsHyperlinkedModelSerializer(serializers.HyperlinkedModelSerializer):
    """
    A ModelSerializer that takes an additional `fields` argument that
    controls which fields should be displayed.
    """

    def __init__(self, *args, **kwargs):
        # Don't pass the 'fields' arg up to the superclass
        fields = kwargs.pop("fields", None)

        # Instantiate the superclass normally
        super(DynamicFieldsHyperlinkedModelSerializer, self).__init__(*args, **kwargs)

        if fields:
            # Drop any fields that are not specified in the `fields` argument.
            allowed = set(fields)
            existing = set(self.fields.keys())
            for field_name in existing - allowed:
                self.fields.pop(field_name)


class RoleSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.Role
        fields = ("url", "id", "name", "description")


class UserSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = User
        fields = ("url", "id", "username", "password", "profile")
        extra_kwargs = {
            "password": {"write_only": True},
            "profile": {"read_only": True, "allow_null": True},
        }

    def update(self, instance, validated_data):
        # call set_password on user object. Without this, the password will be stored in plain text.
        user = super(UserSerializer, self).update(instance, validated_data)
        user.set_password(validated_data["password"])
        user.save()
        return user

    def create(self, validated_data):
        # call set_password on user object. Without this, the password will be stored in plain text.
        user = super(UserSerializer, self).create(validated_data)
        user.set_password(validated_data["password"])
        user.save()
        return user


class UserProfileSerializer(serializers.HyperlinkedModelSerializer):
    current_role = RoleSerializer()
    user = UserSerializer()

    class Meta:
        model = dcm.UserProfile
        fields = ("url", "id", "user", "current_role")

    def __init__(self, *args, **kwargs):
        super(UserProfileSerializer, self).__init__(*args, **kwargs)

        try:
            if self.context["request"].method in ["PATCH", "POST", "PUT"]:
                self.fields["current_role"] = serializers.HyperlinkedRelatedField(
                    view_name="role-detail",
                    label="Role",
                    queryset=dcm.Role.objects.all(),
                )
                self.fields["user"] = serializers.HyperlinkedRelatedField(
                    view_name="user-detail", label="User", queryset=User.objects.all(),
                )
        except (KeyError, AttributeError):
            pass


class LocationSerializer(gis_serializers.GeoModelSerializer):
    class Meta:
        model = dcm.Location
        fields = ("url", "id", "name", "description", "point")


class CapabilitySerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.Capability
        fields = ("name", "display_name", "description")


class ModSerializer(serializers.HyperlinkedModelSerializer):
    capabilities = serializers.HyperlinkedRelatedField(
        view_name="capability-detail", many=True, queryset=dcm.Capability.objects.all()
    )

    class Meta:
        model = dcm.Mod
        fields = ("url", "name", "display_name", "description", "capabilities")


class EntityGroupSerializer(serializers.HyperlinkedModelSerializer):
    related_entities = serializers.HyperlinkedRelatedField(
        view_name="entity-detail", many=True, queryset=dcm.Entity.objects.all()
    )

    class Meta:
        model = dcm.EntityGroup
        fields = ("url", "name", "description", "basemap_element", "related_entities")


class PointStyleSerializer(serializers.HyperlinkedModelSerializer):
    entity_types_styled = serializers.HyperlinkedRelatedField(
        view_name="entitytype-detail", many=True, read_only=True
    )
    event_types_styled = serializers.HyperlinkedRelatedField(
        view_name="eventtype-detail", many=True, read_only=True
    )

    class Meta:
        model = dcm.PointStyle
        fields = (
            "url",
            "name",
            "description",
            "icon",
            "render_as_symbol",
            "color",
            "use_marker_pin",
            "marker_color",
            "scale_factor",
            "animation",
            "entity_types_styled",
            "event_types_styled",
        )

        read_only_fields = ("entity_types_styled", "event_types_styled")

    def __init__(self, *args, **kwargs):
        super(PointStyleSerializer, self).__init__(*args, **kwargs)


class AggregatedPointStyleSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.PointStyle
        fields = (
            "icon",
            "render_as_symbol",
            "color",
            "use_marker_pin",
            "marker_color",
            "scale_factor",
            "animation",
        )


class EntityTypeSerializer(serializers.HyperlinkedModelSerializer):
    capabilities = serializers.HyperlinkedRelatedField(
        view_name="capability-detail",
        required=False,
        many=True,
        queryset=dcm.Capability.objects.all(),
    )
    point_style = serializers.HyperlinkedRelatedField(
        view_name="pointstyle-detail", queryset=dcm.PointStyle.objects.all()
    )

    class Meta:
        model = dcm.EntityType
        fields = (
            "url",
            "name",
            "display_name",
            "description",
            "point_style",
            "entities",
            "capabilities",
        )


class EntityStateSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.EntityState
        fields = (
            "url",
            "name",
            "description",
            "point_style_icon_transform",
            "point_style_color_transform",
            "point_style_use_marker_pin_override",
            "point_style_marker_color_transform",
            "point_style_scale_factor_override",
            "point_style_animation_transform",
            "point_style_render_as_symbol_override",
        )


class EntityEventRoleSerializer(DynamicFieldsHyperlinkedModelSerializer):
    class Meta:
        model = dcm.EntityEventRole
        fields = (
            "url",
            "name",
            "metadata_key",
            "description",
            "entity_state",
            "valid_event_types",
            "valid_entity_types",
            "valid_entity_groups",
        )


class EntitySerializer(DynamicFieldsHyperlinkedModelSerializer):
    campaigns = serializers.SerializerMethodField()
    entity_type = serializers.HyperlinkedRelatedField(
        view_name="entitytype-detail", queryset=dcm.EntityType.objects.all()
    )
    groups = serializers.HyperlinkedRelatedField(
        view_name="entitygroup-detail",
        required=False,
        many=True,
        queryset=dcm.EntityGroup.objects.all(),
    )
    mods = serializers.HyperlinkedRelatedField(
        view_name="mod-detail",
        required=False,
        many=True,
        queryset=dcm.Mod.objects.all(),
    )
    region = serializers.SerializerMethodField()
    latest_pose = serializers.SerializerMethodField()
    module_type = serializers.StringRelatedField(
        source="entity_type",
        read_only=True,
    )
    point_style = AggregatedPointStyleSerializer(
        source="entity_type.point_style",
        read_only=True,
    )

    class Meta:
        model = dcm.Entity
        fields = (
            "url",
            "name",
            "display_name",
            "physical_id",
            "entity_type",
            "description",
            "trials",
            "campaigns",
            "groups",
            "mods",
            "region",
            "latest_pose",
            "module_type",
            "point_style",
        )
        read_only_fields = ("trials",)

    def get_campaigns(self, obj):
        request = self.context.get("request", None)
        campaigns = dcm.Campaign.objects.filter(trials__entities=obj).distinct()
        campaigns_urls = [
            reverse("campaign-detail", args=[c.pk], request=request) for c in campaigns
        ]
        return campaigns_urls

    def get_region(self, obj):
        request = self.context.get("request", None)
        last_pose = dcm.Pose.objects.filter(entity=obj).order_by("timestamp").last()

        try:
            pnt = last_pose.point
            region = dcm.Region.objects.filter(geom__contains=pnt)

            return [r.name for r in region]

        except AttributeError:
            return []

    def get_latest_pose(self, obj):
        request = self.context.get("request", None)
        last_pose = dcm.Pose.objects.filter(entity=obj).order_by("timestamp").last()

        if last_pose is None:
            return None

        return PoseSerializer(
            last_pose, read_only=True, context={"request": request}
        ).data


class CampaignSerializer(serializers.HyperlinkedModelSerializer):
    # location = serializers.RelatedField(many=False)
    # start_datetime = serializers.DateTimeField(default='2014-10-10 14:00:00')
    # end_datetime = serializers.DateTimeField(default=timezone.now)

    entities = serializers.SerializerMethodField()
    scenarios = serializers.SerializerMethodField()
    # trials = serializers.HyperlinkedRelatedField(view_name='trials-list', read_only=True)
    trial_names = serializers.StringRelatedField(
        source="trials", many=True, read_only=True
    )

    class Meta:
        model = dcm.Campaign
        fields = (
            "url",
            "id",
            "name",
            "description",
            "start_datetime",
            "end_datetime",
            "location",
            "entities",
            "scenarios",
            "trial_id_major_name",
            "trial_id_minor_name",
            "trial_id_micro_name",
            "trials",
            "trial_names",
        )
        read_only_fields = ("trials", "trial_names")

    def get_entities(self, obj):
        # Get entities associated (via trials) with this campaign
        request = self.context.get("request", None)
        entities = dcm.Entity.objects.filter(trials__campaign=obj).distinct()
        serialized_entities = EntitySerializer(
            entities, context={"request": request}, many=True, fields=("url", "name",),
        ).data
        return serialized_entities

    def get_scenarios(self, obj):
        # Get scenarios associated (via trials) with this campaign
        request = self.context.get("request", None)
        scenarios = dcm.Scenario.objects.filter(trials__campaign=obj).distinct()
        serialized_scenarios = ScenarioSerializer(
            scenarios, context={"request": request}, many=True
        ).data
        # scenarios_urls = [reverse('scenario-detail', args=[sc.pk], request=request) for sc in scenarios]
        return serialized_scenarios


class TestMethodSerializer(DynamicFieldsHyperlinkedModelSerializer):
    trials = serializers.SerializerMethodField()
    campaigns = serializers.SerializerMethodField()

    class Meta:
        model = dcm.TestMethod
        fields = (
            "url",
            "id",
            "name",
            "description",
            "version_major",
            "version_minor",
            "version_micro",
            "has_segments",
            "variant",
            "trials",
            "campaigns",
        )
        read_only_fields = ("trials",)

    def get_campaigns(self, obj):
        request = self.context.get("request", None)
        campaigns = dcm.Campaign.objects.filter(
            trials__scenario__test_method=obj
        ).distinct()
        campaigns_urls = [
            reverse("campaign-detail", args=[c.pk], request=request) for c in campaigns
        ]
        return campaigns_urls

    def get_trials(self, obj):
        # Get trials associated with this TestMethod
        request = self.context.get("request", None)
        trials = dcm.Trial.objects.filter(scenario__test_method=obj).distinct()
        serialized_trials = TrialSerializer(
            trials, context={"request": request}, many=True
        ).data
        return serialized_trials


class SegmentSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.Segment
        fields = ("url", "id", "tag", "name", "description", "scenarios")


class RegionTypeSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.RegionType
        fields = (
            "url",
            "name",
            "description",
        )


class RegionSerializer(serializers.HyperlinkedModelSerializer):
    region_type = serializers.HyperlinkedRelatedField(
        view_name="regiontype-detail", queryset=dcm.RegionType.objects.all()
    )
    entities = serializers.SerializerMethodField()

    class Meta:
        model = dcm.Region
        fields = (
            "url",
            "name",
            "region_type",
            "entities",
            "geom",
            "key_point",
            "z_layer",
            "scenarios",
        )

    def get_entities(self, obj):

        entities_in_region = (
            dcm.Pose.objects.filter(point__within=obj.geom)
            .order_by("entity__name")
            .distinct("entity__name")
            .values_list("entity", "entity__entity_type")
        )

        to_return = {}
        for entity_name, entity_type in entities_in_region:
            if entity_type not in to_return:
                to_return[entity_type] = set()

            to_return[entity_type].add(entity_name)
        return to_return


class ScenarioSerializer(serializers.HyperlinkedModelSerializer):
    has_segments = serializers.BooleanField(
        source="test_method.has_segments", 
        read_only=True,
    )
    potential_segments = SegmentSerializer(many=True, read_only=True)

    class Meta:
        model = dcm.Scenario
        fields = (
            "url",
            "id",
            "name",
            "description",
            "variant",
            "test_method",
            "location",
            "has_segments",
            "potential_segments",
            "entity_groups",
            "time_limit",
            "scripts",
        )


class WeatherSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.Weather
        fields = ("url", "id", "name", "description", "current")


class TestConditionSerializer(serializers.HyperlinkedModelSerializer):
    name = serializers.StringRelatedField(
        source="*",
        read_only=True,
    )

    class Meta:
        model = dcm.TestCondition
        fields = ("url", "id", "name", "weather", "trials")
        read_only_fields = ("trials",)


class PerformerSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.Performer
        fields = ("url", "id", "name", "description")


class CapabilityUnderTestSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.CapabilityUnderTest
        fields = ("url", "id", "name", "description", "performer")


class SystemConfigurationSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.SystemConfiguration
        fields = ("url", "id", "name", "description", "capabilities_under_test")


class TrialSerializer(serializers.HyperlinkedModelSerializer):
    scenario = ScenarioSerializer()
    name = serializers.StringRelatedField(
        source="*",
        read_only=True,
    )
    performers = serializers.SerializerMethodField()
    script_run_counts = serializers.SerializerMethodField()

    class Meta:
        model = dcm.Trial
        fields = (
            "url",
            "id",
            "name",
            "id_major",
            "id_minor",
            "id_micro",
            "campaign",
            "scenario",
            "testers",
            "entities",
            "test_condition",
            "bagfile",
            "system_configuration",
            "start_datetime",
            "end_datetime",
            "note",
            "current",
            "reported",
            "clock_config",
            "performers",
            "script_run_counts",
        )

    def get_performers(self, obj):
        performers = []
        # try:
        performers = [
            capability.performer.name
            for capability in obj.system_configuration.capabilities_under_test.all()
        ]
        # except:
        #      pass
        performers.sort()
        return performers

    def get_script_run_counts(self, obj):
        request = self.context.get("request", None)
        return [
            {
                "script": reverse(
                    "script-detail", args=[count.script.id], request=request
                ),
                "count": count.count,
            }
            for count in obj.script_run_count.all()
        ]

    def __init__(self, *args, **kwargs):
        super(TrialSerializer, self).__init__(*args, **kwargs)

        try:
            if self.context["request"].method in ["PATCH", "POST", "PUT"]:
                self.fields["scenario"] = serializers.HyperlinkedRelatedField(
                    view_name="scenario-detail", queryset=dcm.Scenario.objects.all()
                )
        except (KeyError, AttributeError):
            pass


class TesterSerializer(serializers.HyperlinkedModelSerializer):
    # user = UserSerializer(read_only=False)
    # role = RoleSerializer(read_only=False)
    # TODO: Convert to DRF 3 nested writable serializers
    username = serializers.SerializerMethodField()
    user_url = serializers.SerializerMethodField()
    user_id = serializers.SerializerMethodField()

    role_name = serializers.SerializerMethodField()
    role_url = serializers.SerializerMethodField()
    role_id = serializers.SerializerMethodField()
    role_description = serializers.SerializerMethodField()

    user = serializers.HyperlinkedRelatedField(
        view_name="user-detail", write_only=True, queryset=User.objects.all()
    )
    role = serializers.HyperlinkedRelatedField(
        view_name="role-detail", write_only=True, queryset=dcm.Role.objects.all()
    )

    name = serializers.SerializerMethodField()

    class Meta:
        model = dcm.Tester
        fields = (
            "url",
            "id",
            "name",
            "user",
            "role",
            "username",
            "user_url",
            "user_id",
            "role_name",
            "role_url",
            "role_id",
            "role_description",
        )

    # write_only_fields = ('user', 'role')
    # read_only_fields = ('username',)
    # read_only_fields = ('username', 'user_url', 'user_id', 'role_name', 'role_url', 'role_id', 'role_description')
    # depth = 1

    def get_username(self, obj):
        username = obj.user.username
        return username

    def get_user_url(self, obj):
        request = self.context.get("request", None)
        user_url = reverse("user-detail", args=[obj.user.id], request=request)
        return user_url

    def get_user_id(self, obj):
        user_id = obj.user.id
        return user_id

    def get_role_name(self, obj):
        role_name = obj.role.name
        return role_name

    def get_role_url(self, obj):
        request = self.context.get("request", None)
        role_url = reverse("role-detail", args=[obj.role.id], request=request)
        return role_url

    def get_role_id(self, obj):
        role_id = obj.role.id
        return role_id

    def get_role_description(self, obj):
        role_description = obj.role.description
        return role_description

    def get_name(self, obj):
        name = str(obj)
        return name


class EventLevelSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.EventLevel
        fields = ("url", "id", "name", "description", "key", "visibility")


class EventTypeSerializer(serializers.HyperlinkedModelSerializer):
    event_level = EventLevelSerializer()
    point_style = PointStyleSerializer()

    class Meta:
        model = dcm.EventType
        fields = (
            "url",
            "id",
            "name",
            "description",
            "event_level",
            "priority_metadata",
            "metadata_style_fields",
            "point_style",
            "has_duration",
            "exclusive_with",
            "resets_with",
            "ends_segment",
            "is_manual",
        )

    def __init__(self, *args, **kwargs):
        super(EventTypeSerializer, self).__init__(*args, **kwargs)

        try:
            if self.context["request"].method in ["PATCH", "POST", "PUT"]:
                self.fields["event_level"] = serializers.HyperlinkedRelatedField(
                    view_name="eventlevel-detail",
                    label="Event Level",
                    queryset=dcm.EventLevel.objects.all(),
                )
                self.fields["point_style"] = serializers.HyperlinkedRelatedField(
                    view_name="pointstyle-detail",
                    label="PointStyle",
                    queryset=dcm.PointStyle.objects.all(),
                )
        except (KeyError, AttributeError):
            pass


class PoseSourceSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.PoseSource
        fields = ("url", "id", "name", "description")


class BulkPoseSerializer(serializers.ListSerializer):
    def create(self, validated_data):
        result = [self.child.create(attrs) for attrs in validated_data]

        try:
            self.child.Meta.model.objects.bulk_create(result)
        except IntegrityError as e:
            raise ValidationError(e)
        return result


class PoseSerializer(gis_serializers.GeoModelSerializer):
    entity = EntitySerializer(
        fields=("url", "name", "id", "description", "entity_type")
    )
    pose_source = PoseSourceSerializer()
    events = serializers.HyperlinkedRelatedField(
        view_name="event-detail", many=True, read_only=True,
    )
    trial = serializers.HyperlinkedRelatedField(
        view_name="trial-detail", required=False, allow_null=True, queryset=dcm.Trial.objects.all()
    )

    class Meta:
        model = dcm.Pose
        fields = (
            "url",
            "id",
            "point",
            "elevation",
            "heading",
            "entity",
            "pose_source",
            "events",
            "timestamp",
            "trial",
            "speed",
            "velocity",
        )
        list_serializer_class = BulkPoseSerializer

    # Strip out lat and lon fields since they are not in the model.  If the point field is empty, but lat and lon are
    # supplied, create point field as WKT of the lat and lon fields.  This is to accommodate the event generator
    # since it is currently limited to posting a single message field to a single api field.
    # Also, do some cleanup for submissions from the browsable api (null submissions vs field omission)
    def create(self, validated_data):
        # browsable api submits timestamp=null rather than omitting.  This causes the default not to be set.
        # The following 3 lines accommodate for this.
        ts = validated_data.get("timestamp")
        if (ts is None) or (ts == ""):
            validated_data["timestamp"] = timezone.now()

        lat = validated_data.pop("lat", None)
        lon = validated_data.pop("lon", None)
        if (
            (validated_data.get("point") is None)
            and (lat is not None)
            and (lon is not None)
        ):
            point = "POINT ({lon} {lat})".format(lat=lat, lon=lon)
            validated_data["point"] = point
        if validated_data.get("point") is None:
            raise serializers.ValidationError(
                "Either valid point or separate lat and lon must be supplied."
            )

        # if trial is not explicitly stated, assume it goes to the trial marked current
        if "trial" not in validated_data:
            try:
                current_trial = dcm.get_current_trial(dt=validated_data["timestamp"])
            except dcm.Trial.DoesNotExist:
                raise serializers.ValidationError(
                    "Unable to determine suitable trial.  No trial is marked current and there are no trials that "
                    "overlap the start_datetime of this pose ({})".format(
                        validated_data.get("timestamp").isoformat()
                    )
                )
            validated_data["trial"] = current_trial

        instance = dcm.Pose(**validated_data)
        if isinstance(self._kwargs["data"], dict):
            instance.save()
        return instance

    def __init__(self, *args, **kwargs):
        super(PoseSerializer, self).__init__(*args, **kwargs)

        try:
            if self.context["request"].method in ["PATCH", "POST", "PUT"]:
                self.fields["entity"] = serializers.HyperlinkedRelatedField(
                    view_name="entity-detail", queryset=dcm.Entity.objects.all()
                )
                self.fields["pose_source"] = serializers.HyperlinkedRelatedField(
                    view_name="posesource-detail", queryset=dcm.PoseSource.objects.all()
                )
                self.fields["timestamp"] = serializers.DateTimeField(
                    default=timezone.now, allow_null=True
                )
                self.fields["point"] = gis_serializers.GeometryField(
                    required=False, allow_null=True
                )
                self.fields["lat"] = serializers.FloatField(
                    required=False, write_only=True, allow_null=True
                )
                self.fields["lon"] = serializers.FloatField(
                    required=False, write_only=True, allow_null=True
                )
        except (KeyError, AttributeError):
            pass


class PoseDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = dcm.Pose
        fields = [
            "id",
            "point",
            "elevation",
            "heading",
            "entity",
            "pose_source",
            "timestamp",
            "trial",
            "speed",
            "velocity",
        ]
        read_only_fields = [
            "id",
            "point",
            "elevation",
            "heading",
            "entity",
            "pose_source",
            "timestamp",
            "trial",
            "speed",
            "velocity",
        ]


class NoteSerializer(serializers.HyperlinkedModelSerializer):
    tester = TesterSerializer()

    class Meta:
        model = dcm.Note
        fields = ("url", "id", "tester", "note", "event")

    def create(self, validated_data):
        if validated_data.get("tester") is None:
            request = self.context.get("request")
            current_user = request.user
            try:
                role = dcm.UserProfile.objects.get(user=current_user).current_role
            except dcm.UserProfile.DoesNotExist:
                raise rest_framework.exceptions.ParseError(
                    "No tester supplied and no profile found for current user."
                )

            try:
                current_tester = dcm.Tester.objects.get(user=current_user, role=role)
            except dcm.Tester.DoesNotExist:
                raise rest_framework.exceptions.ParseError(
                    "No tester supplied and no tester found with specified user/role combination."
                )

            validated_data["tester"] = current_tester

        return super(NoteSerializer, self).create(validated_data)

    def __init__(self, *args, **kwargs):
        super(NoteSerializer, self).__init__(*args, **kwargs)

        try:
            if self.context["request"].method in ["PATCH", "POST", "PUT"]:
                self.fields["tester"] = serializers.HyperlinkedRelatedField(
                    view_name="tester-detail",
                    queryset=dcm.Tester.objects.all(),
                    required=False,
                    allow_null=True,
                )

        except (KeyError, AttributeError):
            pass


class ImageTypeSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.ImageType
        fields = ("url", "id", "name", "description", "topic")


class ImageSerializer(serializers.HyperlinkedModelSerializer):
    image_url = serializers.SerializerMethodField()
    thumb_url = serializers.SerializerMethodField()
    image_type = ImageTypeSerializer()

    # Build fully qualified url from image path
    def get_image_url(self, obj):
        request = self.context.get("request")
        return request.build_absolute_uri(obj.image.url)

    def get_thumb_url(self, obj):
        request = self.context.get("request")
        return request.build_absolute_uri(thumbnail_url(obj.image, "thumb"))

    class Meta:
        model = dcm.Image
        fields = (
            "url",
            "id",
            "image",
            "image_url",
            "thumb_url",
            "image_type",
            "event",
            "timestamp",
        )
        extra_kwargs = {"image": {"write_only": True}}

    def __init__(self, *args, **kwargs):
        super(ImageSerializer, self).__init__(*args, **kwargs)

        try:
            if self.context["request"].method in ["PATCH", "POST", "PUT"]:
                self.fields["image_type"] = serializers.HyperlinkedRelatedField(
                    view_name="imagetype-detail",
                    default=dcm.default_image_type,
                    allow_null=True,
                    label="Image Type",
                    queryset=dcm.ImageType.objects.all(),
                )
        except (KeyError, AttributeError):
            pass


class ImageDataSerializer(serializers.Serializer):
    id = serializers.ReadOnlyField()
    image_url = serializers.SerializerMethodField()
    image_type = serializers.ReadOnlyField()
    event = serializers.ReadOnlyField()
    event_id = serializers.PrimaryKeyRelatedField(
        read_only=True,
        source="event.id"
    )
    timestamp = serializers.ReadOnlyField()

    class Meta:
        model = dcm.Image

    def get_image_url(self, obj):
        request = self.context.get("request")
        image_url_escaped = request.build_absolute_uri(obj.image.url)
        return http.unquote(image_url_escaped)


class ServerTypeSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.ServerType
        fields = ("url", "id", "description", "key")


class ServerParamSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.ServerParam
        fields = ("url", "id", "name", "description", "param", "value")

    # So json dictionary in the 'value' field doesn't have quotes escaped.
    # See http://stackoverflow.com/questions/988228/converting-a-string-to-dictionary
    def to_representation(self, instance):
        ret = super(ServerParamSerializer, self).to_representation(instance)
        try:
            ret["value"] = ast.literal_eval(ret["value"])
        except (ValueError, SyntaxError) as e:
            if type(ret["value"]) not in (str,):
                raise serializers.ValidationError(
                    {
                        "value": [
                            "Invalid entry. Must consist of a string, number, tuple, list, dict, or boolean."
                        ]
                    }
                )
        return ret

    def to_internal_value(self, data):
        # Ensure that super(ServerParamSerializer).to_internal_value is passed 'value' as a dict instead of a string.
        # This is necessary so the displayed value will be a valid json dictionary (double quotes)
        data_mutable = data.copy()
        if type(data["value"]) is not dict:
            try:
                data_mutable["value"] = ast.literal_eval(data["value"])
            except (ValueError, SyntaxError) as e:
                if type(data["value"]) not in (str,):
                    raise serializers.ValidationError(
                        {
                            "value": [
                                "Invalid entry. Must consist of a string, number, tuple, list, dict, or boolean."
                            ]
                        }
                    )
        ret = super(ServerParamSerializer, self).to_internal_value(data_mutable)
        return ret


class ServerSerializer(serializers.HyperlinkedModelSerializer):
    server_type = ServerTypeSerializer()
    server_params = ServerParamSerializer(read_only=True, many=True)

    class Meta:
        model = dcm.Server
        fields = (
            "url",
            "id",
            "name",
            "server_type",
            "active",
            "base_url",
            "server_params",
        )

    def __init__(self, *args, **kwargs):
        super(ServerSerializer, self).__init__(*args, **kwargs)

        try:
            if self.context["request"].method in ["PATCH", "POST", "PUT"]:
                self.fields["server_type"] = serializers.HyperlinkedRelatedField(
                    view_name="servertype-detail",
                    label="Server Type",
                    queryset=dcm.ServerType.objects.all(),
                )
        except (KeyError, AttributeError):
            pass


class KeyValuePairSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.KeyValuePair
        fields = ("key", "value", "id", "url")


class OrderedTriggerResponseSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.OrderedTriggerResponse
        fields = ("order", "trigger_response", "id", "url")


class OrderedTriggerResponseFlatSerializer(serializers.ModelSerializer):
    class Meta:
        model = dcm.OrderedTriggerResponse
        fields = ("order", "trigger_response")
        depth = 3


class TriggerResponseSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.TriggerResponse
        fields = ("url", "id", "name", "description", "method", "module", "parameters")


class BulkEventSerializer(serializers.ListSerializer):
    def create(self, validated_data):
        now = timezone.now()
        result = [
            self.child.create(dict(attrs, modified_datetime=now))
            for attrs in validated_data
        ]

        try:
            self.child.Meta.model.objects.bulk_create(result)
        except IntegrityError as e:
            raise ValidationError(e)
        return result


class EventDataSerializer(serializers.Serializer):
    id = serializers.ReadOnlyField()
    submitted_datetime = serializers.ReadOnlyField()
    start_datetime = serializers.ReadOnlyField()
    end_datetime = serializers.ReadOnlyField()
    event_type = serializers.ReadOnlyField(source="event_type.name")
    trial_id = serializers.ReadOnlyField()
    trial_name = serializers.SerializerMethodField()
    trial_major = serializers.ReadOnlyField(source="trial.id_major")
    trial_minor = serializers.ReadOnlyField(source="trial.id_minor")
    trial_micro = serializers.ReadOnlyField(source="trial.id_micro")
    start_pose = serializers.SerializerMethodField()
    configuration = serializers.ReadOnlyField(source="trial.system_configuration.name")
    performers = serializers.SerializerMethodField()
    segment = serializers.ReadOnlyField()
    scenario = serializers.ReadOnlyField(source="trial.scenario.name")
    trigger = serializers.ReadOnlyField(source="trigger.key")
    metadata = serializers.ReadOnlyField()
    related_entities = serializers.SerializerMethodField()
    unfound_entities = serializers.ReadOnlyField()

    class Meta:
        model = dcm.Event
        fields = (
            "id",
            "start_datetime",
            "end_datetime",
            "event_type",
            "trial_name",
            "weather",
            "related_entities",
            "unfound_entities",
            "invalid_entities",
        )

    def get_start_pose(self, obj):
        if obj.start_pose:
            return "{}, {}, {}".format(
                obj.start_pose.point.x, obj.start_pose.point.y, obj.start_pose.elevation
            )
        else:
            return

    def get_length(self, obj):
        length = 0
        exclusive_with_list = obj.event_type.exclusive_with.all()
        later_exclusive_with_events = dcm.Event.objects.order_by(
            "start_datetime"
        ).filter(
            start_datetime__gt=obj.start_datetime,
            event_type__in=exclusive_with_list,
            trial__id=obj.trial.id,
        )
        if later_exclusive_with_events:
            next_exclusive_with_event = later_exclusive_with_events[0]
            obj_datetime1 = obj.start_datetime
            obj_datetime2 = next_exclusive_with_event.start_datetime
            poses = (
                dcm.Pose.objects.filter(
                    timestamp__lt=obj_datetime2, timestamp__gt=obj_datetime1
                )
                .transform(26945)
                .values_list("point", flat=True)
            )
            lin = LineString(array(poses))
            length = lin.length
        return length

    def get_performers(self, obj):
        performers = []
        try:
            performers = [
                capability.performer.name
                for capability in obj.trial.system_configuration.capabilities_under_test.all()
            ]
            # create string representing performers in alphabetical order with no duplicates
            performers = ", ".join(set(sorted(performers)))
        except:
            pass
        return performers

    def get_trial_name(self, obj):
        return obj.trial.__str__()

    def get_related_entities(self, obj):
        related_entities = {}
        for entity_event_relation in obj.related_entities.all():
            if entity_event_relation.entity_event_role.name not in related_entities:
                related_entities[entity_event_relation.entity_event_role.name] = []

            related_entities[entity_event_relation.entity_event_role.name].append(
                {
                    "name": entity_event_relation.entity.name,
                    "display_name": entity_event_relation.entity.display_name,
                    "entity_type": entity_event_relation.entity.entity_type.name,
                }
            )
        return related_entities


class EntityDataSerializer(serializers.Serializer):
    name = serializers.ReadOnlyField()
    display_name = serializers.ReadOnlyField()
    entity_type = serializers.ReadOnlyField(source="entity_type.name")
    mods = serializers.SerializerMethodField()

    class Meta:
        model = dcm.Entity
        fields = (
            "url",
            "name",
            "display_name",
            "physical_id",
            "entity_type",
            "description",
            "trials",
            "campaigns",
            "groups",
            "mods",
        )

    def get_mods(self, obj):
        return list(obj.mods.values_list("name", flat=True))


class EntityGroupDataSerializer(serializers.Serializer):
    entity_group = serializers.ReadOnlyField(source="name")
    related_entities_name = serializers.SerializerMethodField()
    related_entities_display_name = serializers.SerializerMethodField()

    class Meta:
        model = dcm.EntityGroup
        fields = ("url", "name", "description", "basemap_element", "related_entities")

    def get_related_entities_name(self, obj):
        return list(obj.related_entities.values_list("name", flat=True))

    def get_related_entities_display_name(self, obj):
        return list(obj.related_entities.values_list("display_name", flat=True))


class TrialDataSerializer(serializers.Serializer):
    id = serializers.ReadOnlyField()
    name = serializers.SerializerMethodField()
    id_major = serializers.ReadOnlyField()
    id_minor = serializers.ReadOnlyField()
    id_micro = serializers.ReadOnlyField()
    campaign = serializers.ReadOnlyField()
    scenario = serializers.ReadOnlyField()
    testers = serializers.ReadOnlyField()
    test_condition = serializers.ReadOnlyField()
    system_configuration = serializers.ReadOnlyField()
    performers = serializers.SerializerMethodField
    start_datetime = serializers.ReadOnlyField()
    end_datetime = serializers.ReadOnlyField()
    note = serializers.ReadOnlyField()
    current = serializers.ReadOnlyField()
    reported = serializers.ReadOnlyField()

    class Meta:
        model = dcm.Trial
        fields = (
            "url",
            "id",
            "name",
            "id_major",
            "id_minor",
            "id_micro",
            "campaign",
            "scenario",
            "testers",
            "entities",
            "test_condition",
            "bagfile",
            "system_configuration",
            "start_datetime",
            "end_datetime",
            "note",
            "current",
            "reported",
            "clock_config",
        )

    def get_name(self, obj):
        return obj.__str__()

    def get_performers(self, obj):
        performers = []
        try:
            performers = [
                capability.performer.name
                for capability in obj.system_configuration.capabilities_under_test.all()
            ]
        except:
            pass
        performers.sort()
        return performers


class ConditionVariableSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.ConditionVariable
        fields = ("url", "id", "name", "description", "variable")


class RequestedDataSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.RequestedData
        fields = ("url", "id", "name", "description", "destination_url", "payload")


class ClockPhaseSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.ClockPhase
        fields = [
            "url",
            "message",
            "message_only",
            "countdown",
            "duration_seconds",
            "starts_with_datetime",
            "starts_with_trial_start",
            "starts_with_trial_end",
            "ends_with_datetime",
            "ends_with_trial_start",
            "ends_with_trial_end",
            "starts_with_event_type",
            "ends_with_event_type",
        ]


class ClockConfigSerializer(serializers.HyperlinkedModelSerializer):
    phases = ClockPhaseSerializer(read_only=True, many=True)

    class Meta:
        model = dcm.ClockConfig
        fields = ["url", "name", "timezone", "phases"]


class TriggerSerializer(serializers.HyperlinkedModelSerializer):
    # condition_variables = ConditionVariableSerializer(read_only=True, many=True)
    # requested_dataset = RequestedDataSerializer(read_only=True, many=True)
    # trigger_responses = OrderedTriggerResponseFlatSerializer(read_only=True, many=True)

    converted_cond_vars = serializers.SerializerMethodField()
    cond_vars = serializers.SlugRelatedField(
        slug_field="variable", source="condition_variables", read_only=True, many=True,
    )
    req_data = RequestedDataSerializer(
        read_only=True, many=True, source="requested_dataset"
    )
    trig_resp = serializers.SerializerMethodField()

    class Meta:
        model = dcm.Trigger
        fields = (
            "url",
            "id",
            "name",
            "key",
            "description",
            "is_active",
            "is_manual",
            "creates_event",
            "condition",
            "condition_variables",
            "event_type",
            "requested_dataset",
            "trigger_transport",
            "trigger_responses",
            "cond_vars",
            "converted_cond_vars",
            "req_data",
            "trig_resp",
        )

    def get_trig_resp(self, obj):
        to_return = [
            OrderedTriggerResponseFlatSerializer(x).data
            for x in obj.trigger_responses.all()
        ]
        # to_return.sort(key=operator.attrgetter('order'))
        return to_return

    def get_converted_cond_vars(self, obj):
        pattern = re.compile(r"(?P<var_name>\w+) ?: ?(?P<topic>.+)\.(?P<field>\w+)")
        to_return = []
        for var in obj.condition_variables.all():
            m = pattern.match(var.variable)
            if not m:
                continue
            topic = m.group("topic").replace("/", "_")
            converted = f"{m.group('var_name')} = msg['{topic}']['{m.group('field')}']"
            to_return.append(converted)
        return to_return


class EventSerializer(serializers.HyperlinkedModelSerializer):
    start_pose = PoseSerializer(allow_null=True)
    trial = serializers.HyperlinkedRelatedField(
        view_name="trial-detail", label="Trial", queryset=dcm.Trial.objects.all()
    )
    event_type = EventTypeSerializer()
    weather = WeatherSerializer()
    notes = NoteSerializer(read_only=True, many=True)
    images = ImageSerializer(read_only=True, many=True)
    trigger = TriggerSerializer(label="Trigger", allow_null=True)
    segment = SegmentSerializer(allow_null=True)
    point_style = serializers.SerializerMethodField()

    related_entities = serializers.SerializerMethodField()

    class Meta:
        model = dcm.Event
        fields = (
            "url",
            "id",
            "trial",
            "modified_datetime",
            "submitted_datetime",
            "start_datetime",
            "end_datetime",
            "start_pose",
            "event_type",
            "weather",
            "trigger",
            "segment",
            "point_style",
            "notes",
            "images",
            "related_entities",
            "unfound_entities",
            "invalid_entities",
            "metadata",
        )
        read_only_fields = (
            "unfound_entities",
            "invalid_entities",
        )
        list_serializer_class = BulkEventSerializer

    def get_point_style(self, obj):
        # TODO: Add test for point_style composition logic.
        request = self.context.get("request", None)
        point_style = obj.event_type.point_style
        metadata_style_fields = obj.event_type.metadata_style_fields
        # TODO: document point styling in Mole docs.
        if metadata_style_fields:
            for field in metadata_style_fields:
                if field in obj.metadata:
                    entity_str = obj.metadata[field]
                    try:
                        entity_type = dcm.EntityType.objects.get(name=entity_str)
                        if entity_type.point_style:
                            entity_point_style = AggregatedPointStyleSerializer(
                                entity_type.point_style
                            ).data
                            if entity_point_style:
                                for key in entity_point_style:
                                    if entity_point_style[key]:
                                        setattr(
                                            point_style, key, entity_point_style[key]
                                        )
                    except dcm.EntityType.DoesNotExist:
                        pass

        # Use AggregatedPointStyleSerializer so we don't include name, description, etc. unnecessarily.
        serialized_point_style = AggregatedPointStyleSerializer(
            point_style, context={"request": request}
        ).data
        return serialized_point_style

    def get_related_entities(self, obj):
        request = self.context.get("request", None)
        related_entities = {}
        for entity_event_relation in obj.related_entities.all():
            if entity_event_relation.entity_event_role.name not in related_entities:
                related_entities[entity_event_relation.entity_event_role.name] = {}

                related_entities[entity_event_relation.entity_event_role.name][
                    "role"
                ] = EntityEventRoleSerializer(
                    entity_event_relation.entity_event_role,
                    context={"request": request},
                ).data

                related_entities[entity_event_relation.entity_event_role.name][
                    "entities"
                ] = []

            entity_event_relation.entity.point_style = get_entity_state_point_style(
                request, entity_event_relation
            )

            related_entities[entity_event_relation.entity_event_role.name][
                "entities"
            ].append(
                EntitySerializer(
                    entity_event_relation.entity, context={"request": request}
                ).data
            )
        return related_entities

    # Try to determine segment if appropriate. If associated entities were submitted via metadata, attach as entities.
    def create(self, validated_data):
        # set start_datetime for case where browsable api submitted null or ''
        dt = validated_data.get("start_datetime")
        if (dt is None) or (dt == ""):
            validated_data["start_datetime"] = timezone.now()

        if validated_data.get("trial") is None:
            try:
                current_trial = dcm.get_current_trial(
                    dt=validated_data["start_datetime"]
                )
            except dcm.Trial.DoesNotExist:
                raise serializers.ValidationError(
                    "Unable to determine suitable trial.  No trial is marked current and there are no trials that "
                    "overlap the start_datetime of this event ({})".format(
                        validated_data.get("start_datetime").isoformat()
                    )
                )
            validated_data["trial"] = current_trial
        trigger_key = validated_data.get("trigger_key")
        if trigger_key != "" and trigger_key is not None:
            validated_data["trigger"] = dcm.Trigger.objects.get(key=trigger_key)

        if validated_data.get("segment") is None:
            current_segment = None
            current_scenario = validated_data["trial"].scenario
            if current_scenario.test_method.has_segments:
                # Get segments that correspond to this scenario
                scenario_segments = dcm.Segment.objects.filter(
                    scenarios__name=current_scenario.name
                )
                if scenario_segments.count():
                    try:
                        previous_event = dcm.Event.objects.filter(
                            trial=validated_data["trial"]
                        ).order_by("-start_datetime")[0]
                        previous_segment = previous_event.segment
                        if previous_event.event_type.ends_segment:
                            try:
                                current_segment = scenario_segments.filter(
                                    id__gt=previous_segment.id
                                ).order_by("id")[0]
                            except IndexError:
                                current_segment = scenario_segments.order_by("id")[0]
                        else:
                            current_segment = previous_segment

                    # This is the first event for this trial. Set current_segment to first segment in list.
                    except (dcm.Event.DoesNotExist, IndexError):
                        current_segment = scenario_segments.order_by("id")[0]

            validated_data["segment"] = current_segment

        # Create Event so M2M relations can reference it
        instance = dcm.Event(**validated_data)
        if isinstance(self._kwargs["data"], dict):
            # This is a single instance rather than a list for bulk creation.
            instance.save()
            if validated_data.get("metadata"):
                metadata = validated_data["metadata"]
                entity_roles = dcm.EntityEventRole.objects.all()
                unfound_entities = []
                invalid_entities = []
                valid_entities = []
                for entity_role in entity_roles:
                    try:
                        entity_list = metadata[entity_role.metadata_key]
                        if type(entity_list) is not list:
                            entity_list = [entity_list]
                        for entity_name in entity_list:
                            try:
                                entity = dcm.Entity.objects.get(name=entity_name)

                                if (
                                    (
                                        entity.entity_type
                                        in entity_role.valid_entity_types.all()
                                        or len(entity_role.valid_entity_types.all())
                                        == 0
                                    )
                                    and (
                                        instance.event_type
                                        in entity_role.valid_event_types.all()
                                        or len(entity_role.valid_event_types.all()) == 0
                                    )
                                    and (
                                        any(
                                            group in entity.groups.all()
                                            for group in entity_role.valid_entity_groups.all()
                                        )
                                        or len(entity_role.valid_entity_groups.all())
                                        == 0
                                    )
                                ):
                                    entity_event_relation = dcm.EntityEventRelation.objects.create(
                                        entity_event_role=entity_role,
                                        event=instance,
                                        entity=entity,
                                    )
                                    valid_entities.append(entity.name)
                                else:
                                    invalid_entities.append(entity.name)

                            except dcm.Entity.DoesNotExist:
                                unfound_entities.append(entity_name)
                    except KeyError:
                        continue
                instance.unfound_entities = list(set(unfound_entities))
                instance.invalid_entities = list(
                    set([x for x in invalid_entities if x not in valid_entities])
                )
                instance.save()
        return instance

    # update segments for events after this one if the new event type ends a segment (and thus should have incremented
    # the current segment.  Also update if the new type doesn't end a segment (but the previous type did).
    def update(self, instance, validated_data):
        current_scenario = instance.trial.scenario
        if current_scenario.test_method.has_segments:
            if "event_type" in validated_data:
                if (
                    validated_data["event_type"].ends_segment
                    and not instance.event_type.ends_segment
                ):
                    events_after_this_one = (
                        dcm.Event.objects.filter(trial=instance.trial)
                        .filter(start_datetime__gt=instance.start_datetime)
                        .order_by("start_datetime")
                    )

                    scenario_segments = dcm.Segment.objects.filter(
                        scenarios__name=current_scenario.name
                    )

                    # segment for event after this one should be incremented
                    try:
                        correct_segment = scenario_segments.filter(
                            id__gt=instance.segment.id
                        ).order_by("id")[0]
                    except IndexError:
                        correct_segment = scenario_segments.order_by("id")[0]

                    # increment following events' segments if there are additional event_types that end_segment.
                    for event in events_after_this_one:
                        if event.segment != correct_segment:
                            event.segment = correct_segment
                            event.save()
                        if event.event_type.ends_segment:
                            try:
                                correct_segment = scenario_segments.filter(
                                    id__gt=correct_segment.id
                                ).order_by("id")[0]
                            except IndexError:
                                correct_segment = scenario_segments.order_by("id")[0]

                # Undo segment incrementing if this event is no longer of a type that ends_segments
                if (
                    not validated_data["event_type"].ends_segment
                    and instance.event_type.ends_segment
                ):
                    events_after_this_one = (
                        dcm.Event.objects.filter(trial=instance.trial)
                        .filter(start_datetime__gt=instance.start_datetime)
                        .order_by("start_datetime")
                    )

                    current_scenario = instance.trial.scenario
                    scenario_segments = dcm.Segment.objects.filter(
                        scenarios__name=current_scenario.name
                    )

                    # segment for event after this one should be the same as this one (no longer incremented)
                    correct_segment = instance.segment

                    for event in events_after_this_one:
                        if event.segment != correct_segment:
                            event.segment = correct_segment
                            event.save()
                        if event.event_type.ends_segment:
                            try:
                                correct_segment = scenario_segments.filter(
                                    id__gt=correct_segment.id
                                ).order_by("id")[0]
                            except IndexError:
                                correct_segment = scenario_segments.order_by("id")[0]
        # Update Event so M2M relations can reference it
        event = super(EventSerializer, self).update(instance, validated_data)

        # Update entities that may have been submitted via metadata
        if validated_data.get("metadata"):
            instance.entities.clear()

            metadata = validated_data["metadata"]
            entity_roles = dcm.EntityEventRole.objects.all()
            unfound_entities = []
            invalid_entities = []
            valid_entities = []
            for entity_role in entity_roles:
                try:
                    entity_list = metadata[entity_role.metadata_key]
                    if type(entity_list) is not list:
                        entity_list = [entity_list]
                    for entity_name in entity_list:
                        try:
                            entity = dcm.Entity.objects.get(name=entity_name)

                            if (
                                (
                                    entity.entity_type
                                    in entity_role.valid_entity_types.all()
                                    or len(entity_role.valid_entity_types.all()) == 0
                                )
                                and (
                                    instance.event_type
                                    in entity_role.valid_event_types.all()
                                    or len(entity_role.valid_event_types.all()) == 0
                                )
                                and (
                                    any(
                                        group in entity.groups.all()
                                        for group in entity_role.valid_entity_groups.all()
                                    )
                                    or len(entity_role.valid_entity_groups.all()) == 0
                                )
                            ):
                                entity_event_relation = dcm.EntityEventRelation.objects.create(
                                    entity_event_role=entity_role,
                                    event=instance,
                                    entity=entity,
                                )
                                valid_entities.append(entity.name)
                            else:
                                invalid_entities.append(entity.name)

                        except dcm.Entity.DoesNotExist:
                            unfound_entities.append(entity_name)
                except KeyError:
                    continue

            event.unfound_entities = list(set(unfound_entities))
            event.invalid_entities = list(
                set([x for x in invalid_entities if x not in valid_entities])
            )
            event.save()

        return event

    def __init__(self, *args, **kwargs):
        super(EventSerializer, self).__init__(*args, **kwargs)

        try:
            if self.context["request"].method in ["PATCH", "POST", "PUT"]:
                self.fields["start_pose"] = serializers.HyperlinkedRelatedField(
                    view_name="pose-detail",
                    required=False,
                    label="Start Pose",
                    queryset=dcm.Pose.objects.all(),
                    style={"base_template": "input.html"},
                )
                self.fields["trial"] = serializers.HyperlinkedRelatedField(
                    view_name="trial-detail",
                    required=False,
                    label="Trial",
                    queryset=dcm.Trial.objects.all(),
                )
                self.fields["event_type"] = serializers.HyperlinkedRelatedField(
                    view_name="eventtype-detail",
                    default=dcm.default_event_type,
                    label="Event Type",
                    queryset=dcm.EventType.objects.all(),
                )

                self.fields["weather"] = serializers.HyperlinkedRelatedField(
                    view_name="weather-detail",
                    default=dcm.default_weather,
                    label="Weather",
                    queryset=dcm.Weather.objects.all(),
                )

                self.fields["start_datetime"] = serializers.DateTimeField(
                    default=timezone.now, allow_null=True
                )

                self.fields["trigger"] = serializers.HyperlinkedRelatedField(
                    view_name="trigger-detail",
                    default=dcm.default_trigger,
                    label="Trigger",
                    queryset=dcm.Trigger.objects.all(),
                )

                self.fields["segment"] = serializers.HyperlinkedRelatedField(
                    view_name="segment-detail",
                    label="Segment",
                    queryset=dcm.Segment.objects.all(),
                    allow_null=True,
                    required=False,
                )
        except (KeyError, AttributeError):
            pass


def get_entity_state_point_style(request, relation):

    point_style = relation.entity.entity_type.point_style
    role = state = relation.entity_event_role
    event_type = relation.event.event_type
    entity_type = relation.entity.entity_type
    state = role.entity_state

    # check if event has associated entity state
    if state:
        # verify state applies to the entity
        if (
            entity_type in role.valid_entity_types.all()
            or len(role.valid_entity_types.all()) == 0
        ) and (
            event_type in role.valid_event_types.all()
            or len(role.valid_event_types.all()) == 0
        ):
            # update entity point style from entity state transforms and overrides
            # ICON
            if state.point_style_icon_transform:
                # if file extension exists, format behind extension
                if point_style.icon and "." in point_style.icon:
                    icon_split = point_style.icon.split(".")
                    icon = icon_split[0]
                    ext = icon_split[1]
                    point_style.icon = (
                        state.point_style_icon_transform.format(icon=icon) + "." + ext
                    )
                elif point_style.icon:
                    point_style.icon = state.point_style_icon_transform.format(
                        icon=point_style.icon
                    )
                else:
                    point_style.icon = state.point_style_icon_transform.format(icon="")

            # COLOR
            if state.point_style_color_transform:
                if point_style.color:
                    point_style.color = state.point_style_color_transform.format(
                        color=point_style.color
                    )
                else:
                    point_style.color = state.point_style_color_transform.format(
                        color=""
                    )

            # USE MARKER PIN
            if state.point_style_use_marker_pin_override != None:
                point_style.use_marker_pin = state.point_style_use_marker_pin_override

            # MARKER COLOR
            if state.point_style_marker_color_transform:
                if point_style.marker_color:
                    point_style.marker_color = state.point_style_marker_color_transform.format(
                        marker_color=point_style.marker_color
                    )
                else:
                    point_style.marker_color = state.point_style_marker_color_transform.format(
                        marker_color=""
                    )

            # SCALE FACTOR
            if state.point_style_scale_factor_override != None:
                point_style.scale_factor = state.point_style_scale_factor_override

            # ANIMATION
            if state.point_style_animation_transform:
                if point_style.animation:
                    point_style.animation = state.point_style_animation_transform.format(
                        animation=point_style.animation
                    )
                else:
                    point_style.animation = state.point_style_animation_transform.format(
                        animation=""
                    )

            # RENDER AS SYMBOL
            if state.point_style_render_as_symbol_override != None:
                point_style.render_as_symbol = (
                    state.point_style_render_as_symbol_override
                )

    return point_style


### deprecated

class UnicodeAsSerialized:
    def __init__(self, model, context=None):
        self.data = {"Unicode": model.__str__()}


class QuerySetMethodSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.QuerySetMethod
        fields = ("url", "id", "name", "description", "method_name", "parameters")


class QuerySetSpecificationSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.QuerySetSpecification
        fields = ("url", "id", "name", "description", "model_name", "methods")


class ExtractionFieldSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.ExtractionField
        fields = ("url", "id", "name", "description", "label", "field_name")


class ExtractionSpecificationSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.ExtractionSpecification
        fields = ("url", "id", "name", "description", "queryset", "extraction_fields")


class DataManipulatorSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.DataManipulator
        fields = (
            "url",
            "id",
            "name",
            "description",
            "method_name",
            "module",
            "parameters",
            "dataset",
        )


class IteratorSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.Iterator
        fields = ("url", "id", "name", "description", "extraction_spec", "unique_field")


class IteratedExtractionSpecificationSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.IteratedExtractionSpecification
        fields = (
            "url",
            "id",
            "name",
            "description",
            "iterator",
            "prefix",
            "extraction_spec",
        )


class IteratedDataManipulatorSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.IteratedDataManipulator
        fields = (
            "url",
            "id",
            "name",
            "description",
            "iterator",
            "prefix",
            "data_manipulator",
        )


class FigureFamilySerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.FigureFamily
        fields = ("url", "id", "name", "description", "method_name", "module")


class FigureTypeSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.FigureType
        fields = (
            "url",
            "id",
            "name",
            "description",
            "data_manipulator",
            "figure_family",
            "parameters",
            "iterator",
            "prefix",
        )


class FigureSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.Figure
        fields = ("url", "id", "name", "timestamp", "figure_type", "image")


class ReportSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = dcm.Report
        fields = (
            "url",
            "id",
            "name",
            "description",
            "template",
            "rendered_template",
            "online_report",
            "report_archive",
            "modified_datetime",
            "iterators",
            "figure_types",
            "iterated_extraction_specs",
            "iterated_data_manipulators",
            "format",
            "status",
        )


class ImageOverviewSerializer(serializers.HyperlinkedModelSerializer):
    image_url = serializers.SerializerMethodField()
    thumb_url = serializers.SerializerMethodField()

    # Build fully qualified url from image path
    def get_image_url(self, obj):
        request = self.context.get("request")
        return request.build_absolute_uri(obj.image.url)

    def get_thumb_url(self, obj):
        request = self.context.get("request")
        return request.build_absolute_uri(thumbnail_url(obj.image, "thumb"))

    class Meta:
        model = dcm.Image
        fields = ("url", "image_url", "thumb_url")
        read_only_fields = ("url", "image_url", "thumb_url")