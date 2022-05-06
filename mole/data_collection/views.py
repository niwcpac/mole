import datetime
import pytz
import json
import os.path
from django.utils import timezone

from rest_framework.settings import api_settings
import django_filters
from django_filters import rest_framework as filters
from django.contrib.auth.models import User
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.contrib.gis.db.models.functions import Distance
from django.db.models import Count, OuterRef, Subquery, Q
from django.shortcuts import get_object_or_404
from rest_framework.filters import OrderingFilter
from rest_framework import permissions
from rest_framework import renderers
from rest_framework import viewsets, views
from rest_framework import status, exceptions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.reverse import reverse
from rest_framework.request import clone_request
from rest_framework.pagination import CursorPagination

from data_collection.permissions import IsOwnerOrReadOnly, IsTargetUserOrReadOnly
import data_collection.models as dcm
import data_collection.serializers as dcs

from ast import literal_eval
import pandas as pd
import rest_pandas

import logging
from django.utils.text import slugify

from django.core.exceptions import ObjectDoesNotExist, MultipleObjectsReturned
from django.http import Http404

import pulsar
import redis

from automation.scenario_scripts.scenario_scripts import ScenarioScripts
ss = ScenarioScripts()

pulsar_client = pulsar.Client("pulsar://pulsar:6650")

log = logging.getLogger("mole")


class EventPagination(CursorPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 1000
    cursor_query_param = "cursor"  # default value = 'cursor'


class EntityPagination(CursorPagination):
    page_size = 100
    page_size_query_param = "page_size"
    max_page_size = 1000
    ordering = "name"
    cursor_query_param = "cursor"  # default value = 'cursor'



class PosePagination(CursorPagination):
    page_size = 100
    page_size_query_param = "page_size"
    max_page_size = 1000
    ordering = "-id"
    cursor_query_param = "cursor"  # default value = 'cursor'


class AllowPUTAsCreateMixin(object):
    """
    The following mixin class may be used in order to support PUT-as-create
    behavior for incoming requests.
    """

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object_or_none()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        if instance is None:
            lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
            lookup_value = self.kwargs[lookup_url_kwarg]
            extra_kwargs = {self.lookup_field: lookup_value}
            serializer.save(**extra_kwargs)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        serializer.save()
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def get_object_or_none(self):
        try:
            return self.get_object()
        except Http404:
            if self.request.method == "PUT":
                # For PUT-as-create operation, we need to ensure that we have
                # relevant permissions, as if this was a POST request.  This
                # will either raise a PermissionDenied exception, or simply
                # return None.
                self.check_permissions(clone_request(self.request, "POST"))
            else:
                # PATCH requests where the object does not exist should still
                # return a 404 response.
                raise


class ListFilter(django_filters.Filter):
    """
    To support comma separated list in querystrings. (e.g. ?name=foo,bar)
    From https://github.com/alex/django-filter/issues/137#issuecomment-69089014
    May eventually be supported natively with the following:
    https://github.com/alex/django-filter/pull/259
    """

    def filter(self, qs, value):
        if value:
            value = value.split(",")
            return super(ListFilter, self).filter(
                qs, django_filters.fields.Lookup(value, "in")
            )
        return None


class UserViewSet(viewsets.ModelViewSet):
    """
    This endpoint represents users of the system

    There is a `users/current/` endpoint to retrieve the current user
    """

    queryset = User.objects.all()
    serializer_class = dcs.UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    @action(detail=False)
    def current(self, request):
        user = request.user
        return Response(dcs.UserSerializer(user, context={"request": request}).data)


class LocationViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.Location.objects.all()
    serializer_class = dcs.LocationSerializer


#    def pre_save(self, obj):
#        obj.slug = self.request.user


class ModViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.Mod.objects.all()
    serializer_class = dcs.ModSerializer


class PointStyleViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.PointStyle.objects.all()
    serializer_class = dcs.PointStyleSerializer


class CapabilityViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.Capability.objects.all()
    serializer_class = dcs.CapabilitySerializer


class EntityGroupViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.EntityGroup.objects.all()
    serializer_class = dcs.EntityGroupSerializer


class EntityFilter(filters.FilterSet):
    group = filters.ModelMultipleChoiceFilter(
        field_name="groups__name",
        to_field_name="name",
        queryset=dcm.EntityGroup.objects.all(),
    )

    class NumberInFilter(filters.BaseInFilter, filters.NumberFilter):
        pass

    group__in = NumberInFilter(field_name="groups", lookup_expr="in")

    entity_type = filters.ModelMultipleChoiceFilter(
        field_name="entity_type__name",
        to_field_name="name",
        queryset=dcm.EntityType.objects.all(),
    )

    ordering = filters.OrderingFilter(
        fields=(
            ("start_datetime", "start_datetime"),
            ("modified_datetime", "modified_datetime"),
        ),
        label="Entity ordering",
    )

    modified_since = filters.IsoDateTimeFilter(
        field_name="modified_datetime", lookup_expr="gt"
    )

    region = filters.CharFilter(method="region_filter")

    class Meta:
        model = dcm.Entity
        fields = [
            "name",
            "display_name",
            "physical_id",
            "entity_type",
            "groups",
            "mods",
            "region",
        ]

    def region_filter(self, queryset, name, value):
        _filter = []
        for q in queryset.iterator():
            pose = dcm.Pose.objects.filter(entity__name=q.name).order_by("timestamp")

            if "entity_type" in self.data.keys():
                pose = pose.filter(entity__entity_type=self.data["entity_type"])

            last_pose = pose.last()

            try:
                pnt = last_pose.point
                region = dcm.Region.objects.filter(name=value).filter(
                    geom__contains=pnt
                )

                if region:
                    _filter.append(q.name)

            except AttributeError:
                pass

        return queryset.filter(name__in=_filter)


class EntityStateViewSet(viewsets.ModelViewSet):
    """
    This endpoint represents entity states.

    """

    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.EntityState.objects.all()
    serializer_class = dcs.EntityStateSerializer


class EntityViewSet(AllowPUTAsCreateMixin, viewsets.ModelViewSet):
    """
    This endpoint represents entities.

    Entities can be query string filtered by containing *entity_group*.
    The `group__in` query string returns all entities within a particular *entity_group*. The input value is the group's *id*.
    Querying multiple groups will return all entities within each group.

    *  e.g. `entities/?group__in=1`
    *  e.g. `entities/?group__in=1,4,5`

    The group *name* can be used as well. The list format won't work while using the name. Each group *name* has to be specified.
    Querying multiple groups will return all entities within each group .

    *  e.g. `entities/?group=vehicle_group`
    *  e.g. `entities/?group=vehicle_group&group=red_team`

    It is also possible to filter by entity type.
    Querying multiple types will return all entities that match any of the types.

    *  e.g. `entities/?entity_type=uav`
    *  e.g. `entities/?entity_type=uav&entity_type=wheeled_robot`

    Region can be filtered as well using the `region` querystring.

    *  e.g `entities/?region=SectorA`
    *  e.g `entities/?region=SectorB&entity_type=ugv`

    This viewset also provides the ability to view other entities that are near another entity or a specified location.
      e.g. entities/{target_entity}/around
      e.g. entities/{target_entity}/around?distance=5.6
      e.g. entities/radius?latitude=30&longitude=-117
      e.g. entities/radius?latitude=33.4&longitude=32.3&distance=32
    """

    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = (
        dcm.Entity.objects.all()
        .select_related("entity_type")
        .prefetch_related("trials")
    )
    serializer_class = dcs.EntitySerializer
    pagination_class = EntityPagination
    filterset_class = EntityFilter

    @action(detail=True)
    def around(self, request, pk=None):
        """ 
        This endpoint provides info about entities that are \
            within <distance> meters away from the target entity.
        The return value is a list of tuples where the tuple \
            contains the name of an entity and how far away it \
            is from the target entity in meters.
        The return value is sorted in ascending order of distance \
            from the target entity (i.e. closest entities first).

        The default value for the distance querystring is 5.0 if not specified.

            entities/{target_entity}/around?distance=5.6
            entities/{target_entity}/around?distance=3

        The 'entity_type' querystring can be used to filter the list of entities by entity type.

            entities/{target_entity}/around?distance=5&entity_type=uav
            entities/{target_entity}/around?distance=5&entity_type=field_node
        
        The 'group' querystring can be used to filter the list of entities by group name.
        The 'group__in' querystring can do a similar filter but by comma-separated group ids instead.

            entities/{target_entity}/around?distance=32&group=test_group
            entities/{target_entity}/around?distance=32&group=test_group&group=sector2
            entities/{target_entity}/around?distance=32&group__in=1,2,3,4
        
        """
        # Determine point of origin
        # Check radius around this entity
        obj = get_object_or_404(dcm.Entity, pk=pk)
        last_pose = dcm.Pose.objects.filter(entity=obj).order_by("timestamp").last()
        if not last_pose:
            return Response(
                f"No pose associated with this entity: {obj.name}",
                status=status.HTTP_404_NOT_FOUND,
            )
        point_of_origin = last_pose.point

        distance = self.request.query_params.get("distance", 5.0)
        try:
            distance = float(distance)
        except (ValueError):
            return Response(
                f"Invalid distance value: {distance}",
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = self.filter_queryset(self.get_queryset())
        queryset = queryset.exclude(pk=pk)

        most_recent_pose = dcm.Pose.objects.filter(entity=OuterRef("pk")).order_by(
            "-timestamp"
        )
        nearby = (
            queryset.annotate(
                most_recent_pose=Subquery(most_recent_pose.values("point")[:1])
            )
            .filter(most_recent_pose__distance_lte=(point_of_origin, D(m=distance)))
            .annotate(distance=Distance("most_recent_pose", point_of_origin))
            .order_by("distance")
            .values_list("name", "distance")
        )

        return Response([(x, y.m) for x, y in nearby])

    @action(detail=False)
    def radius(self, request):
        """ 
        This endpoint provides info about entities that are \
            within <distance> meters away from the target location.
        The return value is a list of tuples where the tuple \
            contains the name of an entity and how far away it \
            is from the target location in meters.
        The return value is sorted in ascending order of distance \
            from the target location (i.e. closest entities first).

        The default value for the distance querystring is 5.0 if not specified.

            entities/radius?latitude=33.4&longitude=32.3&distance=32

        The 'entity_type' querystring can be used to filter the list of entities by entity type.

            entities/radius?latitude=105.7&longitude=44&distance=8&entity_type=uav
        
        The 'group' querystring can be used to filter the list of entities by group name.
        The 'group__in' querystring can do a similar filter but by comma-separated group ids instead.

            entities/radius?latitude=33.4&longitude=32.3&distance=32&group=test_group
            entities/radius?latitude=33.4&longitude=32.3&distance=32&group__in=1,2,3,4
        
        """
        # Determine point of origin
        # Check radius around a required query string
        _lat = self.request.query_params.get("latitude")
        _long = self.request.query_params.get("longitude")
        if not _lat or not _long:
            return Response(
                f"Both latitude and longitude required",
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            _lat = float(_lat)
        except (ValueError):
            return Response(
                f"latitude is not a valid float",
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            _long = float(_long)
        except (ValueError):
            return Response(
                f"longitude is not a valid float",
                status=status.HTTP_400_BAD_REQUEST,
            )

        point_of_origin = Point(_long, _lat, srid=4326)

        distance = self.request.query_params.get("distance", 5.0)
        try:
            distance = float(distance)
        except (ValueError):
            return Response(
                f"Invalid distance value: {distance}",
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = self.filter_queryset(self.get_queryset())

        most_recent_pose = dcm.Pose.objects.filter(entity=OuterRef("pk")).order_by(
            "-timestamp"
        )
        nearby = (
            queryset.annotate(
                most_recent_pose=Subquery(most_recent_pose.values("point")[:1])
            )
            .filter(most_recent_pose__distance_lte=(point_of_origin, D(m=distance)))
            .annotate(distance=Distance("most_recent_pose", point_of_origin))
            .order_by("distance")
            .values_list("name", "distance")
        )

        return Response([(x, y.m) for x, y in nearby])


class EntityTypeViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.EntityType.objects.all()
    serializer_class = dcs.EntityTypeSerializer


class CampaignViewSet(viewsets.ModelViewSet):
    """
    This endpoint represents test campaigns.

    The following query-type endpoints are defined:

    * `campaigns/latest/`: retrieve the most recent campaign.
    * `campaigns/{id}/latest_trial/`: retrieve the most recent trial for a given campaign
    """

    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.Campaign.objects.all().select_related("location")
    serializer_class = dcs.CampaignSerializer

    @action(detail=False)
    def latest(self, request):
        latest_campaign = dcm.Campaign.objects.latest("start_datetime")
        return Response(
            dcs.CampaignSerializer(latest_campaign, context={"request": request}).data
        )

    @action(detail=True)
    def latest_trial(self, request, pk):
        try:
            latest_campaign = dcm.Campaign.objects.latest("start_datetime")
            response = Response(
                dcs.CampaignSerializer(
                    latest_campaign, context={"request": request}
                ).data
            )
        except dcm.Campaign.DoesNotExist:
            content = {"detail": "Not found"}
            response = Response(content, status=status.HTTP_404_NOT_FOUND)
        return response


class QuerySetMethodViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.QuerySetMethod.objects.all()
    serializer_class = dcs.QuerySetMethodSerializer


class QuerySetSpecificationViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.QuerySetSpecification.objects.all()
    serializer_class = dcs.QuerySetSpecificationSerializer


class ExtractionFieldViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.ExtractionField.objects.all()
    serializer_class = dcs.ExtractionFieldSerializer


class ExtractionSpecificationViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.ExtractionSpecification.objects.all()
    serializer_class = dcs.ExtractionSpecificationSerializer


class IteratedExtractionSpecificationViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.IteratedExtractionSpecification.objects.all()
    serializer_class = dcs.IteratedExtractionSpecificationSerializer


class DataManipulatorViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.DataManipulator.objects.all()
    serializer_class = dcs.DataManipulatorSerializer


class IteratedDataManipulatorViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.IteratedDataManipulator.objects.all()
    serializer_class = dcs.IteratedDataManipulatorSerializer


class IteratorViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.Iterator.objects.all()
    serializer_class = dcs.IteratorSerializer


class FigureFamilyViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.FigureFamily.objects.all()
    serializer_class = dcs.FigureFamilySerializer


class FigureTypeViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.FigureType.objects.all()
    serializer_class = dcs.FigureTypeSerializer


class ReportViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.Report.objects.all()
    serializer_class = dcs.ReportSerializer


class TestMethodViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.TestMethod.objects.all().prefetch_related("scenarios")
    serializer_class = dcs.TestMethodSerializer


class ScenarioViewSet(viewsets.ModelViewSet):
    """
    Scenarios have a `time_limit` field that represents how long this scenario should take.
    """

    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.Scenario.objects.all().prefetch_related("test_method", "location")
    serializer_class = dcs.ScenarioSerializer


class WeatherViewSet(viewsets.ModelViewSet):
    """
    This endpoint represents weather.

    The following query-type endpoints are defined:

    * `weather/current/`: retrieve the current weather (if set)
    """

    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.Weather.objects.all()
    serializer_class = dcs.WeatherSerializer

    @action(detail=False)
    def current(self, request):
        try:
            current_weather = dcm.Weather.objects.get(current=True)
            response = Response(
                dcs.WeatherSerializer(
                    current_weather, context={"request": request}
                ).data
            )
        except dcm.Weather.DoesNotExist:
            content = {"detail": "Not found"}
            response = Response(content, status=status.HTTP_404_NOT_FOUND)
        return response


class TestConditionViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.TestCondition.objects.all().select_related("weather")
    serializer_class = dcs.TestConditionSerializer


class PerformerViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.Performer.objects.all()
    serializer_class = dcs.PerformerSerializer


class CapabilityUnderTestViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.CapabilityUnderTest.objects.all().select_related("performer")
    serializer_class = dcs.CapabilityUnderTestSerializer


class SystemConfigurationViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.SystemConfiguration.objects.all().prefetch_related(
        "capabilities_under_test"
    )
    serializer_class = dcs.SystemConfigurationSerializer


class TrialIdsFilter(filters.OrderingFilter):
    def __init__(self, *args, **kwargs):
        super(TrialIdsFilter, self).__init__(*args, **kwargs)
        self.extra["choices"] += [
            ("ids", "Ids"),
            ("-ids", "Ids (descending)"),
        ]

    def filter(self, qs, value):
        if not value:
            return qs
        # OrderingFilter is CSV-based, so `value` is a list
        if any(v in ["ids"] for v in value):
            # sort queryset by relevance
            return qs.order_by("id_major", "id_minor", "id_micro")
        if any(v in ["-ids"] for v in value):
            return qs.order_by("-id_major", "-id_minor", "-id_micro")

        return super(TrialIdsFilter, self).filter(qs, value)


class TrialFilter(filters.FilterSet):
    test_method = filters.NumberFilter(field_name="scenario__test_method__id")
    location = filters.NumberFilter(field_name="scenario__location__id")
    scenario = filters.NumberFilter(field_name="scenario__id")
    ordering = TrialIdsFilter(
        fields=(("start_datetime", "start_datetime"), ("ids", "ids")),
        label="Trial ordering",
    )
    reported = filters.BooleanFilter()

    class Meta:
        model = dcm.Trial
        fields = [
            "campaign",
            "scenario",
            "location",
            "test_method",
            "entities",
            "test_condition",
        ]


class TrialViewSet(viewsets.ModelViewSet):
    """
    This endpoint represents test trials.

    Trials can be query string filtered based on `campaign`, `location`, `test_method`, `entities`, `test_condition`, and `reported`

    Ordering can be set by query string.  Options include `ids` and `start_datetime`.

    * e.g. `trials/?ordering=-ids`

    There is a `trials/latest/` endpoint to retrieve the most recent trial.

    There is a `trials/current/` endpoint to retrieve the current trial (if any).

    The *end_datatime* may be automatically populated if there is a non-null time_limit field in the associated scenario.
    If the *time_limit* field is null, the *end_datetime* must be added manually.

    If *end_datetime* is manually submitted or already exists, the *time_limit* field has no effect.
    Otherwise, *end_datetime* will be automatically determined based on *start_datetime* and the *time_limit* field of the *scenario*.
    Trials may also have an associated game clock state. To get the clock state for a trial,
    query trials/{id}/clock_state.
    """

    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = (
        dcm.Trial.objects.all()
        .select_related("campaign", "test_condition", "system_configuration")
        .prefetch_related("testers", "entities")
    )
    filterset_class = TrialFilter
    serializer_class = dcs.TrialSerializer

    def perform_update(self, serializer):
        saved = serializer.save()

        try:
            trial_producer = pulsar_client.create_producer("public/default/_trial_log")
        except Exception:  # Pulsar doesn't provide a subtype of Exception
            # abort the pulsar message if pulsar is not available
            return

        new_payload = dict(serializer.data)
        
        new_payload["update"] = True
        new_payload["name"] = str(saved)
        new_payload["scenario"] = dcs.ScenarioSerializer(saved.scenario, context={'request': self.request}).data
        new_payload["test_condition"] = dcs.TestConditionSerializer(saved.test_condition, context={'request': self.request}).data
        new_payload["testers"] = [reverse("tester-detail", args=[t.id], request=self.request) for t in saved.testers.all()]

        trial_producer.send_async(
            json.dumps(new_payload).encode("utf-8"),
            None,
        )
        trial_producer.close()

    def perform_create(self, serializer):
        saved = serializer.save()

        try:
            trial_producer = pulsar_client.create_producer("public/default/_trial_log")
        except Exception:  # Pulsar doesn't provide a subtype of Exception
            # abort the pulsar message if pulsar is not available
            return

        new_payload = dict(serializer.data)
        
        new_payload["update"] = False
        new_payload["name"] = str(saved)
        new_payload["scenario"] = dcs.ScenarioSerializer(saved.scenario, context={'request': self.request}).data
        new_payload["test_condition"] = dcs.TestConditionSerializer(saved.test_condition, context={'request': self.request}).data
        new_payload["testers"] = [reverse("tester-detail", args=[t.id], request=self.request) for t in saved.testers.all()]

        trial_producer.send_async(
            json.dumps(new_payload).encode("utf-8"),
            None,
        )
        trial_producer.close()

    @action(detail=False)
    def latest(self, request):
        latest_trial = dcm.Trial.objects.latest("start_datetime")
        return Response(
            dcs.TrialSerializer(latest_trial, context={"request": request}).data
        )

    @action(detail=False)
    def current(self, request):
        try:
            current_trial = dcm.get_current_trial()
            response = Response(
                dcs.TrialSerializer(current_trial, context={"request": request}).data
            )
        except dcm.Trial.DoesNotExist:
            content = {"detail": "Not found"}
            response = Response(content, status=status.HTTP_404_NOT_FOUND)
        return response

    @action(detail=True)
    def event_count(self, request, pk=None):
        # Initialize dictionary with all event types
        type_counts = dict.fromkeys(
            dcm.EventType.objects.order_by("name")
            .distinct()
            .values_list("name", flat=True),
            0,
        )

        # Update dictionary with counts of present event types.
        type_counts.update(
            dict(
                dcm.Event.objects.filter(trial__id=pk)
                .values_list("event_type__name")
                .order_by()
                .annotate(Count("event_type__name"))
            )
        )
        total_events = sum(type_counts.values())

        content = {"total_events": total_events, "by_type": type_counts}
        response = Response(content)
        return response

    @action(detail=True)
    def clock_state(self, request, pk=None):
        # get current trial
        try:
            current_trial = dcm.Trial.objects.get(id=pk)
        except dcm.Trial.DoesNotExist:
            current_trial = dcm.get_current_trial()

        # get minor and major trials related to current trial
        try:
            minor_trial = dcm.Trial.objects.get(
                Q(id_major=current_trial.id_major)
                & Q(id_minor=current_trial.id_minor)
                & Q(id_micro=0)
            )
        except dcm.Trial.DoesNotExist:
            minor_trial = None

        try:
            major_trial = dcm.Trial.objects.get(
                Q(id_major=current_trial.id_major) & Q(id_minor=0) & Q(id_micro=0)
            )
        except dcm.Trial.DoesNotExist:
            major_trial = None

        # get reported trial related to current trial
        reported_trial = dcm.Trial.objects.filter(
            Q(id_major=current_trial.id_major) 
            & Q(id_minor=current_trial.id_minor) 
            & Q(reported=True)
        ).first()

        # get phases for each trial
        current_phase, current_next = dcm.get_clock_phase(current_trial)
        minor_phase, minor_next = dcm.get_clock_phase(minor_trial)
        major_phase, major_next = dcm.get_clock_phase(major_trial)
        reported_phase, reported_next = dcm.get_clock_phase(reported_trial)

        next_time = [
            dt for dt in [current_next, minor_next, major_next, reported_next] if dt is not None
        ]

        content = buildClockState(current_trial, current_phase)
        content["minor"] = buildClockState(minor_trial, minor_phase)
        content["major"] = buildClockState(major_trial, major_phase)
        content["reported"] = buildClockState(reported_trial, reported_phase)
        content["next_time"] = min(next_time).isoformat() if next_time else None

        response = Response(content)
        return response


def buildClockState(trial, phase):
    state = {"detail": "No clock state for requested trial."}
    if trial:
        state = {
            "trial_id": trial.id,
            "trial_start_time": str(trial.start_datetime)
            if trial.start_datetime
            else None,
            "trial_end_time": str(trial.end_datetime) if trial.end_datetime else None,
        }

        if trial.clock_config:
            state["timezone"] = trial.clock_config.timezone

        if phase:
            base_time = dcm.get_clock_base_time(trial, phase)
            state["message"] = phase.message
            state["message_only"] = phase.message_only
            state["countdown"] = phase.countdown
            state["base_time"] = str(base_time) if base_time else None

    return state


class TesterFilter(filters.FilterSet):
    userid = filters.NumberFilter(field_name="user__id")
    username = filters.CharFilter(field_name="user__username")
    role_id = filters.NumberFilter(field_name="role__id")
    role_name = filters.CharFilter(field_name="role__name")

    class Meta:
        model = dcm.Tester
        fields = ["userid", "username", "role_id", "role_name"]


class TesterViewSet(viewsets.ModelViewSet):
    """
    This endpoint represents testers.

    Testers can be query string filtered based on `userid`, `username`, `role_id`, and `role_name`.

    There is a `testers/current/` endpoint to retrieve the tester that matches the current user/role (from profile).
    If the system is unable to determine the current tester (e.g. because the current user has no profile set or because
    there is no tester matching the current user/role combination, a 404 error is returned.
    """

    permission_classes = (permissions.IsAuthenticated,)
    queryset = dcm.Tester.objects.all().select_related("user", "role")
    serializer_class = dcs.TesterSerializer
    filterset_class = TesterFilter

    @action(detail=False)
    def current(self, request):
        user = request.user
        try:
            role = dcm.UserProfile.objects.get(user=user).current_role
        except dcm.UserProfile.DoesNotExist:
            content = {"detail": "No profile found for current user."}
            return Response(content, status=status.HTTP_404_NOT_FOUND)

        try:
            current_tester = dcm.Tester.objects.get(user=user, role=role)
        except dcm.Tester.DoesNotExist:
            content = {
                "detail": "No tester found with specified user/role combination."
            }
            return Response(content, status=status.HTTP_404_NOT_FOUND)

        return Response(
            dcs.TesterSerializer(current_tester, context={"request": request}).data
        )


class RoleViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.Role.objects.all()
    serializer_class = dcs.RoleSerializer


class UserProfileViewSet(viewsets.ModelViewSet):
    """
    This endpoint represents user profiles

    There is a `user_profiles/current/` endpoint to retrieve the current user's profile
    """

    # TODO: may want to enforce only modifying one's own profile
    permission_classes = (permissions.IsAuthenticated,)
    queryset = dcm.UserProfile.objects.all()
    serializer_class = dcs.UserProfileSerializer

    @action(detail=False)
    def current(self, request):
        user = request.user
        if not user.is_authenticated:
            content = {"detail": "Profile not found or user is not logged in."}
            return Response(content, status=status.HTTP_404_NOT_FOUND)
        try:
            current_profile = dcm.UserProfile.objects.get(user=user)
        except dcm.UserProfile.DoesNotExist:
            content = {"detail": "No profile found for current user."}
            return Response(content, status=status.HTTP_404_NOT_FOUND)
        return Response(
            dcs.UserProfileSerializer(user.profile, context={"request": request}).data
        )


class EventTypeViewSet(viewsets.ModelViewSet):
    """
    This endpoint represents Event Types.

    The *exclusive_with* field can be used to set other event types that, if they have duration, will be closed
    (their end_datetime set) when an event of this type is **created** afterward.  This is a two-way relation,
    so events of this type will also be closed (assuming it has_duration) if events of the other exclusive_with type are **created**.

    The *resets_with* field can be used to set other event types that, if they have duration, will be closed
    (their end_datetime set) when an event of this type is **closed** afterward. This is a two-way relation,
    so events of this type will also be closed if events of the other resets_with type are **closed**.
    """

    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = (
        dcm.EventType.objects.all()
        .select_related("event_level")
        .prefetch_related("exclusive_with", "resets_with")
    )
    serializer_class = dcs.EventTypeSerializer


class EventLevelViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.EventLevel.objects.all()
    serializer_class = dcs.EventLevelSerializer


class PoseSourceViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.PoseSource.objects.all()
    serializer_class = dcs.PoseSourceSerializer


class PoseFilter(filters.FilterSet):
    max_datetime = filters.IsoDateTimeFilter(field_name="timestamp", lookup_expr="lte")
    min_datetime = filters.IsoDateTimeFilter(field_name="timestamp", lookup_expr="gte")
    entity_name = filters.ModelChoiceFilter(
        field_name="entity",
        queryset=dcm.Entity.objects.all(),
    )
    trial = filters.ModelChoiceFilter(
        field_name="trial",
        queryset=dcm.Trial.objects.all(),
        null_label="No trial",
    )

    class Meta:
        model = dcm.Pose
        fields = ["max_datetime", "min_datetime", "entity_name"]


class PoseViewSet(viewsets.ModelViewSet):
    """
    This endpoint represents entity poses

    Poses can be query string filtered based on `entity_name`, `min_datetime`, and `max_datetime`.

    * e.g. `poses/?min_datetime=2015-11-18T18:00:26.756944Z`

    If the *timestamp* field is not provided on creation, it will be assigned `datetime.now()`

    The *point* field must be formatted as WKT. (e.g. `"POINT(-90.5 29.5)"`)

    If the *point* field is not provided, the serializer will try to create a valid pointfield object using the *lat* and *lon* fields.
    If the *point* field is provided, the *lat* and *lon* fields are ignored.

    Poses can be created with a single json object or through a list of json objects.
    This will create one pose or multiple poses respectively.
    """

    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.Pose.objects.all().select_related("entity", "pose_source")
    filterset_class = PoseFilter
    serializer_class = dcs.PoseSerializer
    pagination_class = PosePagination

    def get_serializer(self, *args, **kwargs):
        if isinstance(kwargs.get("data", {}), list):
            kwargs["many"] = True
        return super(PoseViewSet, self).get_serializer(*args, **kwargs)


class NoteViewSet(viewsets.ModelViewSet):
    """
    This endpoint represents notes on events.

    If a new note is submitted without an associated *tester* field, the system will attempt to determine the current
    tester based on the current user and their role set in their profile.  If the user has no profile or if there is no
    tester with the user/role combination, a 400 error is returned.
    """

    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.Note.objects.all().select_related("event")
    serializer_class = dcs.NoteSerializer


class ServerTypeViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.ServerType.objects.all()
    serializer_class = dcs.ServerTypeSerializer


class ServerParamViewSet(viewsets.ModelViewSet):
    """
    This endpoint represents arbitrary server parameters.  These are used to provide additional information to the frontend
    for configuring the server.  Currently, this is used to set the center and zoom extents of tiled map servers.

    For example
        name='Normal Layer Options',
        description='',
        param='layerOptions',
        value='{"minZoom":12, "maxZoom":20, "maxNativeZoom":18}')

    The value parameter must be one of *string*, *number*, *tuple*, *list*, *dictionary*, or *boolean*.
    """

    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.ServerParam.objects.all()
    serializer_class = dcs.ServerParamSerializer


class ServerFilter(filters.FilterSet):
    server_type_key = filters.CharFilter(field_name="server_type__key")

    class Meta:
        model = dcm.Server
        fields = ["name", "server_type", "active", "server_type_key"]


class ServerViewSet(viewsets.ModelViewSet):
    """
    This endpoint represents available servers. These are used to configure the frontend videos, maps, etc.

    Servers can be query string filtered based on `name`, `server_type`, `active`, and `server_type_key`.

    * e.g. `servers/?server_type_key=mjpeg`

    The *base_url* field supports `{window.location.hostname}` instead of a valid hostname.  In this case, the current
    page's hostname will be substituted for the server hostname.

    * e.g. `base_url='http://{window.location.hostname}:8081/map/{z}/{x}/{y}.png'`
    """

    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.Server.objects.all()
    serializer_class = dcs.ServerSerializer
    filterset_class = ServerFilter


class EventFilter(filters.FilterSet):
    modified_since = filters.IsoDateTimeFilter(
        field_name="modified_datetime", lookup_expr="gt"
    )
    has_no_pose = filters.BooleanFilter(field_name="start_pose", lookup_expr="isnull")
    trial_id_major = filters.CharFilter(field_name="trial__id_major")
    trial_id_minor = filters.CharFilter(field_name="trial__id_minor")
    trial_id_micro = filters.CharFilter(field_name="trial__id_micro")
    performer = filters.CharFilter(
        field_name="trial__system_configuration__capabilities_under_test__performer__name",
        distinct=True,
    )
    event_id = filters.ModelMultipleChoiceFilter(
        queryset=dcm.Event.objects.all(), to_field_name="id", field_name="id"
    )
    event_type = filters.ModelMultipleChoiceFilter(
        queryset=dcm.EventType.objects.all(),
        to_field_name="name",
        field_name="event_type__name",
    )
    event_type_id = filters.ModelMultipleChoiceFilter(
        queryset=dcm.EventType.objects.all(),
        to_field_name="id",
        field_name="event_type__id",
    )
    event_level_gte = filters.NumberFilter(
        field_name="event_type__event_level__id", lookup_expr="gte"
    )
    metadata_contains = filters.CharFilter(
        field_name="metadata", lookup_expr="icontains"
    )
    exclude_related_entities = filters.ModelMultipleChoiceFilter(
        queryset=dcm.Entity.objects.all(),
        field_name="entities",
        exclude=True,
        null_label="Exclude empty related_entities",
    )

    class Meta:
        model = dcm.Event
        fields = [
            "trial",
            "event_id",
            "event_type",
            "event_level_gte",
            "has_no_pose",
            "metadata_contains",
            "weather",
            "modified_since",
            "trial_id_major",
            "trial_id_minor",
            "trial_id_micro",
            "performer",
        ]


class EntityEventRoleViewSet(viewsets.ModelViewSet):
    """
    This endpoint represents Entity roles within Events. The metadata_key is used to match entities submitted in
    Event metadata to the associated roles. Roles may optionally define an Entity State that should apply to the 
    entity being related. The associations may also be restricted by Event Type, Entity Type, and Entity Group 
    using the `valid_event_types`, `valid_entity_types`, and `valid_entity_groups` fields respectively; when 
    these fields are set, the association will only be created if the event/entity type and entity group is in 
    the defined set. For example, assume the following EntityEventRole and Entity exist:

    **EntityEventRole**

        {
            "name": "Entity Event Role 1",
            "metadata_key": "metadata_key_1",
            "description": "Entity Event Role 1 description.",
            "entity_state": "/api/entity_states/1",
            "valid_event_types": ["/api/event_types/1"],
            "valid_entity_types": ["/api/entity_types/2"],
            "valid_entity_groups": ["/api/entity_groups/1"]
        }

    **Entity**

        {
            "name": "entity_1"
            ...
        }

    If an event were created or updated with the following metadata:

    **metadata**

        {
            "metadata_key_1": "entity_1"
        }

    the event would include a relation to entity_1 with "Entity Event Role 1" (assuming 
    event type, entity type, and entity group requirements were met). These objects 
    would be serialized within the Event detail view.

    Entities can also be submitted as a list. E.g.,

    **metadata**

        {
            "metadata_key_1": ["entity_1", "entity_2"]
        }
    """

    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.EntityEventRole.objects.all()
    serializer_class = dcs.EntityEventRoleSerializer


class EventViewSet(viewsets.ModelViewSet, rest_pandas.PandasMixin):
    """
    This endpoint represents triggered events.

    list: Events can be query string filtered based on `trial`, `performer`, `event_type`, `event_type_name`, 
    `event_level`, `weather`, `modified_since`, and `exclude_related_entities`.
    The `event_level_gte` query string returns all events that have an event level greater than or equal to the input value.
    The `metadata_contains` query string returns all events that contain the input value in either the key or the value (not case sensitive).
    The `modified_since` query string takes as input the same string formatted datetime objects as returned by the API.
        It returns events that are strictly more recent than the query string parameter (i.e. it will not return an event whose
        modified_datetime exactly matches the query string parameter.)
    The `exclude_related_entities` query string returns all events that are not related to the specified entities (referenced by entity name).
        If the input value is null, the query will return all events that have related entities.
    
    * e.g. `events/?trial=1`
    * e.g. `events/?event_level_gte=3`
    * e.g. `events/?metadata_contains=vehicle`
    * e.g. `events/?modified_since=2015-07-27T11:23:11.239776`
    * e.g. `events/?exclude_related_entities=example_entity`

    The `performer`, `event_type`, `event_id`, and `exclude_related_entities` querystrings can accept a tethered list of values.
    
    * e.g. `events/?event_type=Unassigned&event_type=Safety+Stop`

    Events can also be query string ordered based on *start_datetime* and *modified_datetime*.  Prepending with `-` sorts
      in decreasing order.

    * e.g. `events/?ordering=-modified_datetime`

    There are also format suffixes and format queries that will change the format of the API.
    For example, `/api/events.json` or `/api/events/?format=json` will provide the events in a json encoded output.

    The list of possible formats for events include `json`, `csv` file download, and in-browser `txt` format.
    The `csv` and `txt` formats share the same serialization and differ from the default `json` format. 
    It is intended to provide a flat serialization for Pandas DataFrame manipulation.

    retrieve: Retrieve an event

    update: If the metadata is updated (via PUT/PATCH), the `related_entities` will be re-created. This may result in
    removal of entity relations if either the key or value no longer match valid options. Any entity names that are associated with 
    a matching `metadata_key`, but are not found in entity lookup will be added to the `unfound_entities` list. If the entity 
    exists, but role requirements are not met, the entity name will be added to the `invalid_entities` list. See 
    `/api/entity_event_roles` for additional information.

    create: If a new event is submitted without an associated *start_datetime*, it will be assigned as `datetime.now()`.

    If a new event is submitted without an associated trial, one will be attempted to be matched.  The matched trial
    is the earliest trial whose start_datetime and end_datetime overlap the new event's *start_datetime*.  If one cannot be
    found, *400 bad request* error is returned.

    If a new event is submitted without an associated trigger, it will be assigned as either the first trigger or null
    (if no triggers exist).

    Entities can be associated with events by including them in previously-configured (via entity_event_roles) metadata fields.
    The metadata key in the event must match the `metadata_key` set in `entity_event_roles` for the desired role. The metadata 
    value must match an entity name (or list of entity names). If both metadata key and value match, and the event type, entity 
    type, and entity group requirements on the role are met, the relation will be created and the entities and respective roles 
    will be serialized within the event. 

    Events can be created with a single json object or through a list of json objects.
    This will create one event or multiple events respectively.

    partial_update: If the metadata is updated (via PUT/PATCH), the `related_entities` will be re-created. This may result in
    removal of entity relations if either the key or value no longer match valid options. Any entity names that are associated with 
    a matching `metadata_key`, but are not found in entity lookup will be added to the `unfound_entities` list. If the entity 
    exists, but role requirements are not met, the entity name will be added to the `invalid_entities` list. See 
    `/api/entity_event_roles` for additional information.

    destroy: Delete an event
    """

    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = (
        dcm.Event.objects.all()
        .select_related("trial", "start_pose", "event_type__event_level", "weather")
        .prefetch_related(
            "images",
            "notes",
            "event_type__exclusive_with",
            "event_type__resets_with",
            "trigger__condition_variables",
            "trigger__requested_dataset",
            "trigger__trigger_responses",
        )
    )
    filterset_class = EventFilter
    filter_backends = (filters.DjangoFilterBackend, OrderingFilter)
    ordering = "-start_datetime"
    ordering_fields = ["start_datetime", "modified_datetime"]
    pagination_class = EventPagination
    serializer_class = dcs.EventSerializer
    renderer_classes = list(api_settings.DEFAULT_RENDERER_CLASSES) + [
        rest_pandas.PandasCSVRenderer,
        rest_pandas.PandasTextRenderer,
    ]
    

    def list(self, request, *args, **kwargs):
        # We need a custom list function
        # we don't want to paginate for Pandas output
        renderer = self.request.accepted_renderer
        if hasattr(renderer, "get_default_renderer"):
            # BrowsableAPIRenderer
            renderer = renderer.get_default_renderer(self)

        if isinstance(renderer, rest_pandas.PandasBaseRenderer):
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        else:
            return super().list(request, *args, *kwargs)

    def get_serializer(self, *args, **kwargs):
        # This code block is to account for bulk posts
        if isinstance(kwargs.get("data", {}), list):
            kwargs["many"] = True
        return super().get_serializer(*args, **kwargs)

    def get_serializer_class(self):
        # We can't use the default PandasMixin get_serializer_class()
        # because we want to pass in a different serializer as child
        # for Pandas-rendered output
        if self.request is None:
            return self.serializer_class

        renderer = self.request.accepted_renderer
        if hasattr(renderer, "get_default_renderer"):
            # BrowsableAPIRenderer
            renderer = renderer.get_default_renderer(self)

        if isinstance(renderer, rest_pandas.PandasBaseRenderer):
            return self.with_list_serializer(dcs.EventDataSerializer)
        else:
            return self.serializer_class

    def perform_create(self, serializer):
        saved = serializer.save()
        if isinstance(saved, list):
            return

        try:
            event_producer = pulsar_client.create_producer("public/default/_event_log")
        except Exception:  # Pulsar doesn't provide a subtype of Exception
            # abort the pulsar message if pulsar is not available
            return

        point_style = dcs.PointStyleSerializer(saved.event_type.point_style, context={'request': None})
        related_entity_names = []
        for related_entity in saved.entities.all():
            related_entity_names.append(related_entity.name)

        data = {
            "url": reverse("event-detail", args=[saved.pk], request=self.request),
            "id": saved.id,
            "trial": saved.trial.id,
            "event_type": saved.event_type.name,
            "event_type_id": saved.event_type.id,
            "submitted_datetime": saved.submitted_datetime.isoformat()
            if saved.submitted_datetime
            else None,
            "start_datetime": saved.start_datetime.isoformat()
            if saved.start_datetime
            else None,
            "end_datetime": saved.end_datetime.isoformat()
            if saved.end_datetime
            else None,
            "provided_pk": saved.pk,
            "metadata": saved.metadata if saved.metadata else {},
            "update": False,
            "point_style": point_style.data,
            "related_entities": related_entity_names
        }
        if saved.start_pose:
            data["start_pose_x"] = saved.start_pose.point[0]
            data["start_pose_y"] = saved.start_pose.point[1]
            data["start_pose_z"] = saved.start_pose.elevation

        event_producer.send_async(
            json.dumps(data).encode("utf-8"),
            None,
        )
        event_producer.close()
        ss.schedule_events(saved)

    def perform_update(self, serializer):
        saved = serializer.save()
        if isinstance(saved, list):
            return

        # Send event trigger messages when event is updated.
        # This allows triggers to be created that respond to manually created events.
        try:
            event_producer = pulsar_client.create_producer("public/default/_event_log")
        except Exception:  # Pulsar doesn't provide a subtype of Exception
            # abort the pulsar message if pulsar is not available
            return

        point_style = dcs.PointStyleSerializer(saved.event_type.point_style, context={'request': None})
        
        related_entity_names = []
        for related_entity in saved.entities.all():
            related_entity_names.append(related_entity.name)

        data = {
            "url": reverse("event-detail", args=[saved.pk], request=self.request),
            "id": saved.id,
            "trial": saved.trial.id,
            "event_type": saved.event_type.name,
            "event_type_id": saved.event_type.id,
            "submitted_datetime": saved.submitted_datetime.isoformat()
            if saved.submitted_datetime
            else None,
            "start_datetime": saved.start_datetime.isoformat()
            if saved.start_datetime
            else None,
            "end_datetime": saved.end_datetime.isoformat()
            if saved.end_datetime
            else None,
            "provided_pk": saved.pk,
            "metadata": saved.metadata if saved.metadata else {},
            "update": True,
            "point_style": point_style.data,
            "related_entities": related_entity_names
        }
        if saved.start_pose:
            data["start_pose_x"] = saved.start_pose.point[0]
            data["start_pose_y"] = saved.start_pose.point[1]
            data["start_pose_z"] = saved.start_pose.elevation

        event_producer.send_async(
            json.dumps(data).encode("utf-8"),
            None,
        )
        event_producer.close()
        ss.schedule_events(saved)


class EventDataViewSet(rest_pandas.PandasViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.Event.objects.all().select_related(
        "start_pose", "event_type", "weather"
    )
    serializer_class = dcs.EventDataSerializer
    filter_class = EventFilter
    schema = None


class EntityDataViewSet(rest_pandas.PandasViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.Entity.objects.all().select_related(
        "entity_type",
    )
    serializer_class = dcs.EntityDataSerializer
    filter_class = EntityFilter
    schema = None


class EntityGroupDataViewSet(rest_pandas.PandasViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.EntityGroup.objects.all().select_related(
        "related_entities",
    )

    def get_queryset(self):
        name = self.request.query_params.get("name", None)

        if name is not None:
            queryset = dcm.EntityGroup.objects.filter(name=name)
        else:
            queryset = dcm.EntityGroup.objects.all()

        return queryset

    serializer_class = dcs.EntityGroupDataSerializer
    schema = None


class TrialDataViewSet(rest_pandas.PandasViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.Trial.objects.all().select_related(
        "system_configuration",
    )
    serializer_class = dcs.TrialDataSerializer
    schema = None


class SegmentViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.Segment.objects.all()
    serializer_class = dcs.SegmentSerializer


class ImageTypeViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.ImageType.objects.all()
    serializer_class = dcs.ImageTypeSerializer


class ImageViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.Image.objects.all().select_related("image_type", "event")
    serializer_class = dcs.ImageSerializer


class ImageDataViewSet(rest_pandas.PandasViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.Image.objects.all().select_related("image_type", "event")
    serializer_class = dcs.ImageDataSerializer
    schema = None


class ConditionVariableViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.ConditionVariable.objects.all()
    serializer_class = dcs.ConditionVariableSerializer


class RequestedDataViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.RequestedData.objects.all()
    serializer_class = dcs.RequestedDataSerializer


class KeyValuePairViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.KeyValuePair.objects.all()
    serializer_class = dcs.KeyValuePairSerializer


class TriggerResponseViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.TriggerResponse.objects.all().prefetch_related("parameters")
    serializer_class = dcs.TriggerResponseSerializer


class OrderedTriggerResponseViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.OrderedTriggerResponse.objects.all().select_related(
        "trigger_response"
    )
    serializer_class = dcs.OrderedTriggerResponseSerializer


class TriggerFilter(filters.FilterSet):
    key = filters.ModelMultipleChoiceFilter(
        queryset=dcm.Trigger.objects.all(),
        field_name="key",
        to_field_name="key",
    )

    class Meta:
        model = dcm.Trigger
        fields = []


class TriggerViewSet(viewsets.ModelViewSet):
    """
    This endpoint represents event triggers.

    There is a `triggers/publish` endpoint that will queue messages to configure triggers in the event generator.
    A trigger_setup message will also be automatically queued whenever a trigger is created or modified.
    """

    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.Trigger.objects.all().select_related("event_type")
    queryset = queryset.prefetch_related(
        "condition_variables",
        "requested_dataset",
        "trigger_responses",
        "event_type",
        "event_type",
    )
    serializer_class = dcs.TriggerSerializer
    filterset_class = TriggerFilter

    @action(detail=False)
    def publish(self, request):
        content = {"detail": "Unused endpoint."}
        return Response(content, status=status.HTTP_200_OK)


class ServerDatetimeView(views.APIView):
    permission_classes = []

    def get(self, request, format=None):
        timezone.activate(timezone.get_default_timezone_name())
        now = timezone.localtime(timezone.now())
        now_truncated = datetime.datetime(
            now.year, now.month, now.day, now.hour, now.minute, 0, 0, now.tzinfo
        )
        return Response(
            {"datetime": now_truncated.isoformat(), "datetime_precise": now.isoformat()}
        )


class ClockConfigViewSet(viewsets.ModelViewSet):
    """
    Configuration for Mole experimentation clock.
    """

    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.ClockConfig.objects.all()
    serializer_class = dcs.ClockConfigSerializer

    def perform_create(self, serializer):
        saved = serializer.save()

        try:
            clock_config_producer = pulsar_client.create_producer(
                "public/default/_clock_config_log"
            )
        except Exception:  # Pulsar doesn't provide a subtype of Exception
            # abort the pulsar message if pulsar is not available
            return
        data = {
            "id": saved.id,
            "name": saved.name,
            "timezone": saved.timezone,
            "update": False,
        }

        clock_config_producer.send_async(
            json.dumps(data).encode("utf-8"),
            None,
        )
        clock_config_producer.close()

    def perform_update(self, serializer):
        saved = serializer.save()

        try:
            clock_config_producer = pulsar_client.create_producer(
                "public/default/_clock_config_log"
            )
        except Exception:  # Pulsar doesn't provide a subtype of Exception
            # abort the pulsar message if pulsar is not available
            return
        data = {
            "id": saved.id,
            "name": saved.name,
            "timezone": saved.timezone,
            "update": True,
        }

        clock_config_producer.send_async(
            json.dumps(data).encode("utf-8"),
            None,
        )
        clock_config_producer.close()


class ClockPhaseViewSet(viewsets.ModelViewSet):
    """
    Phases for Mole experimentation clock.
    """

    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.ClockPhase.objects.all()
    serializer_class = dcs.ClockPhaseSerializer

    def perform_create(self, serializer):
        saved = serializer.save()

        try:
            clock_phase_producer = pulsar_client.create_producer(
                "public/default/_clock_phase_log"
            )
        except Exception:  # Pulsar doesn't provide a subtype of Exception
            # abort the pulsar message if pulsar is not available
            return
        data = {
            "id": saved.id,
            "update": False,
        }

        clock_phase_producer.send_async(
            json.dumps(data).encode("utf-8"),
            None,
        )
        clock_phase_producer.close()

    def perform_update(self, serializer):
        saved = serializer.save()

        try:
            clock_phase_producer = pulsar_client.create_producer(
                "public/default/_clock_phase_log"
            )
        except Exception:  # Pulsar doesn't provide a subtype of Exception
            # abort the pulsar message if pulsar is not available
            return
        data = {
            "id": saved.id,
            "update": True,
        }

        clock_phase_producer.send_async(
            json.dumps(data).encode("utf-8"),
            None,
        )
        clock_phase_producer.close()


class RegionFilter(filters.FilterSet):
    name = filters.CharFilter(field_name="name")
    region_type = filters.ModelMultipleChoiceFilter(
        field_name="region_type__name",
        to_field_name="name",
        queryset=dcm.RegionType.objects.all(),
    )
    z_layer = filters.NumberFilter(field_name="z_layer")

    class Meta:
        model = dcm.Region
        fields = [
            "name",
            "region_type",
            "z_layer",
        ]

    @property
    def qs(self):
        queryset = super(RegionFilter, self).qs
        longitude = self.request.query_params.get("longitude", None)
        latitude = self.request.query_params.get("latitude", None)
        nearest_key_point_to = self.request.query_params.get(
            "nearest_key_point_to", None
        )

        if (not latitude and longitude) or (latitude and not longitude):
            raise exceptions.NotFound(
                detail="Both latitude and longitude are required."
            )

        if latitude is not None and longitude is not None:
            try:
                point = Point(float(longitude), float(latitude))
                queryset = queryset.filter(geom__contains=point)
            except ValueError:
                raise exceptions.NotAcceptable(
                    detail="Lat/long is not a valid floating point value."
                )
            except UnboundLocalError:
                raise exceptions.NotFound(
                    detail="Both latitude and longitude are required."
                )

        if nearest_key_point_to is not None:
            key_point = nearest_key_point_to.split(",")

            try:
                key_point = Point(float(key_point[1]), float(key_point[0]), srid=4326)
            except ValueError:
                raise exceptions.NotAcceptable(
                    detail="Lat/long is not a valid floating point value."
                )

            queryset = queryset.annotate(
                distance=Distance("key_point", key_point)
            ).order_by("distance")

        return queryset


class RegionTypeViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.RegionType.objects.all()
    serializer_class = dcs.RegionTypeSerializer


class RegionViewSet(viewsets.ModelViewSet):
    """
    This endpoint represents an area of interests. Regions can be specified in two formats.

    * Well Known Text (WKT): `POLYGON ((30 10, 40 40, 20 40, 10 20, 30 10))`

    * GeoJSON: `{"type": "Polygon", "coordinates": [[[30.0, 10.0], [40.0, 40.0], [20.0, 40.0], [10.0, 20.0], [30.0, 10.0]]]}`

    Three parameters are accepted for intersection lookup: `latitude`, `longtitude`, and `z_layer`.
    If parameter `z_layer` is not provided, a default value of 1.0 will be applied to the filter
    indicating the region only has one layer (e.g an area of interest with three story buildings
    would have `z_layer` of 1.0, 2.0, 3.0).

    * e.g. `/api/regions?longitude=-122.5522033935786&latitude=47.03151963129993&z_layer=1`

    The *key_point* field is an optional field that can be used to indicate an important point of a region.
    The querystring parameter `nearest_key_point_to` can be used to query the closest region via *key_point*.

    * e.g. `/api/regions?nearest_key_point_to=10,30 # latitude, longitude`

    """

    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = dcm.Region.objects.all()
    filterset_class = RegionFilter
    serializer_class = dcs.RegionSerializer
