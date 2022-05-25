# from django.db import models

import operator, uuid, os
from datetime import datetime, timedelta
from django.utils import timezone
import pytz

from django.contrib.gis.db import models
from django.contrib.postgres.fields import ArrayField
from django.db.models import JSONField
from django.db.models import signals, Q
from easy_thumbnails.fields import ThumbnailerImageField

from django.conf import settings
from django.db.models import signals
from django.utils.text import get_text_list
from django.db import connection, IntegrityError
from django.utils.translation import ugettext as _

# Set up image thumbnail pre-generation
from easy_thumbnails.signals import saved_file
from easy_thumbnails.signal_handlers import generate_aliases_global

saved_file.connect(generate_aliases_global)

import re


class Capability(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, null=True, default="")
    display_name = models.CharField(max_length=100, blank=True, default="")


class Mod(models.Model):
    name = models.CharField(
        max_length=100, blank=False, null=False, unique=True, primary_key=True
    )
    description = models.TextField(blank=True, null=True, default="")
    display_name = models.CharField(max_length=100, blank=True, default="")
    capabilities = models.ManyToManyField(
        Capability, blank=True, related_name="mods_providing"
    )

    def __str__(self):
        return self.display_name if self.display_name else self.name


class PointStyle(models.Model):
    name = models.CharField(
        max_length=100, blank=False, null=False, unique=True, primary_key=True
    )
    description = models.TextField(blank=True, null=True, default="")
    icon = models.CharField(max_length=200, blank=True, null=True, unique=False)
    color = models.CharField(max_length=100, blank=True, null=True, unique=False)
    use_marker_pin = models.BooleanField(default=True)
    marker_color = models.CharField(max_length=100, blank=True, null=True, unique=False)
    scale_factor = models.DecimalField(
        max_digits=7, decimal_places=4, blank=True, null=True, unique=False
    )
    animation = models.CharField(max_length=100, blank=True, null=True, unique=False)
    # render_as_symbol indicates that the icon will be rendered using MapBox gl-js 'symbol' rather than 'marker'
    #   The primary use for this is for icons that should rotate with the map rotation.  Symbol icons must
    #   currently be .png files (.svg not supported)
    render_as_symbol = models.BooleanField(blank=True, null=True, default=False)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class EntityState(models.Model):
    name = models.CharField(
        max_length=100, blank=False, null=False, primary_key=True
    )
    description = models.TextField(blank=True, default="")
    point_style_icon_transform = models.CharField(max_length=100, blank=True, null=True)
    point_style_color_transform = models.CharField(
        max_length=100, blank=True, null=True
    )
    point_style_use_marker_pin_override = models.BooleanField(
        blank=True, null=True, default=None
    )
    point_style_marker_color_transform = models.CharField(
        max_length=100, blank=True, null=True
    )
    point_style_scale_factor_override = models.DecimalField(
        max_digits=7,
        decimal_places=4,
        blank=True,
        null=True,
        unique=False,
        default=None,
    )
    point_style_animation_transform = models.CharField(
        max_length=100, blank=True, null=True
    )
    point_style_render_as_symbol_override = models.BooleanField(
        blank=True, null=True, default=None
    )

    def __eq__(self, other):
        return self.name == other.name

    def __str__(self):
        return self.name


class EntityType(models.Model):
    # slug = models.SlugField(max_length=50, blank=False, unique=True)
    name = models.CharField(
        max_length=100, blank=False, null=False, unique=True, primary_key=True
    )
    display_name = models.CharField(max_length=100, blank=True, default="")
    description = models.TextField(blank=True, null=True, default="")
    capabilities = models.ManyToManyField(
        Capability, blank=True, related_name="entity_types_posessing"
    )
    point_style = models.ForeignKey(
        PointStyle,
        blank=True,
        null=True,
        related_name="entity_types_styled",
        on_delete=models.SET_NULL,
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class EntityGroup(models.Model):
    name = models.CharField(max_length=100, blank=False)
    description = models.TextField(blank=True, null=True, default="")
    # basemap_element indicates that entities in the group should be drawn on page load
    basemap_element = models.BooleanField(default=False)

    def __str__(self):
        return self.name


class RegionType(models.Model):
    name = models.CharField(
        max_length=100, blank=False, null=False, unique=True, primary_key=True
    )
    description = models.TextField(blank=True, null=True, default="")

    def __str__(self):
        return self.name


class Role(models.Model):
    # slug = models.SlugField(max_length=50, blank=False, unique=True)
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, null=True, default="")

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Performer(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, null=True, default="")

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class CapabilityUnderTest(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, null=True, default="")
    performer = models.ForeignKey(
        Performer, blank=False, null=False, on_delete=models.CASCADE
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class SystemConfiguration(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, null=True, default="")
    capabilities_under_test = models.ManyToManyField(CapabilityUnderTest, blank=False)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Tester(models.Model):
    user = models.ForeignKey("auth.User", on_delete=models.CASCADE)
    role = models.ForeignKey(Role, on_delete=models.CASCADE)

    class Meta:
        unique_together = (
            "user",
            "role",
        )
        ordering = ["role", "user"]

    def __str__(self):
        tester_str = "{} / {}".format(self.role.name, self.user)
        return tester_str


class UserProfile(models.Model):
    user = models.OneToOneField(
        "auth.User", related_name="profile", unique=True, on_delete=models.CASCADE
    )
    current_role = models.ForeignKey(Role, on_delete=models.CASCADE)

    def __str__(self):
        return "User profile for {}".format(self.user)


class TestCondition(models.Model):
    weather = models.ForeignKey(
        "Weather",
        blank=True,
        null=True,
        related_name="test_conditions",
        on_delete=models.CASCADE,
    )

    def __str__(self):
        test_condition_str = str(self.weather)
        return test_condition_str


class Weather(models.Model):
    # slug = models.SlugField(max_length=50, blank=False, unique=True)
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, default="")
    current = models.BooleanField(default=False)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.current:
            Weather.objects.filter(current=True).update(current=False)
        super(Weather, self).save(*args, **kwargs)


def default_weather():
    try:
        weather = Weather.objects.get(current=True)
    except Weather.DoesNotExist:
        weather = Weather.objects.all()[0]
    return weather


class Location(models.Model):
    # slug = models.SlugField(max_length=50, blank=False, unique=True)
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, default="")

    point = models.PointField(blank=True, null=True)
    timezone = models.CharField(
        max_length=100, blank=True, default="America/Los_Angeles"
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Campaign(models.Model):
    # slug = models.SlugField(max_length=50, blank=False, unique=True)
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField("Description", blank=True, default="")
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField(blank=True, null=True)
    location = models.ForeignKey(
        Location, blank=True, null=True, on_delete=models.CASCADE
    )
    # trial_id_*_name represents the name of the given trial id. e.g. 'Day', 'Shift', 'Leg'.
    trial_id_major_name = models.CharField(max_length=100, blank=True, default="")
    trial_id_minor_name = models.CharField(max_length=100, blank=True, default="")
    trial_id_micro_name = models.CharField(max_length=100, blank=True, default="")

    class Meta:
        ordering = ["-start_datetime"]

    def __str__(self):
        return self.name


class TestMethod(models.Model):
    # slug = models.SlugField(max_length=50, blank=False, unique=True)
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, default="")
    version_major = models.IntegerField()
    version_minor = models.IntegerField()
    version_micro = models.IntegerField()
    has_segments = models.BooleanField(default=False)
    variant = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["name"]


class Scenario(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, default="")
    variant = models.CharField(max_length=100, blank=True, null=True)
    time_limit = models.DurationField(null=True, blank=True, default=timedelta)
    test_method = models.ForeignKey(
        TestMethod, related_name="scenarios", on_delete=models.CASCADE
    )
    location = models.ForeignKey(
        Location, related_name="scenarios", on_delete=models.CASCADE
    )
    entity_groups = models.ManyToManyField(
        EntityGroup, blank=True, related_name="scenarios"
    )
    scripts = models.ManyToManyField(
        "automation.Script", blank=True, related_name="scenarios"
    )

    def __str__(self):
        return self.name


class Region(models.Model):
    name = models.CharField(max_length=100, primary_key=True)
    region_type = models.ForeignKey(
        RegionType,
        blank=False,
        null=False,
        related_name="regions",
        on_delete=models.CASCADE,
    )
    geom = models.PolygonField(srid=4326)
    key_point = models.PointField(srid=4326, blank=True, null=True, default=None)
    z_layer = models.FloatField()
    scenarios = models.ManyToManyField(Scenario, blank=True, related_name="regions")

    def __str__(self):
        return self.name


class Entity(models.Model):
    # slug = models.SlugField(max_length=50, blank=False, unique=True)
    name = models.CharField(
        max_length=100, blank=False, null=False, unique=True, primary_key=True
    )
    display_name = models.CharField(max_length=100, blank=True, default="")
    physical_id = models.CharField(max_length=100, blank=True, default="")
    description = models.TextField(blank=True, null=True, default="")
    entity_type = models.ForeignKey(
        EntityType,
        blank=True,
        null=True,
        related_name="entities",
        on_delete=models.CASCADE,
    )
    groups = models.ManyToManyField(
        EntityGroup, blank=True, related_name="related_entities"
    )
    mods = models.ManyToManyField(Mod, blank=True, related_name="entities_installed")

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.display_name if self.display_name else self.name


class Trial(models.Model):
    campaign = models.ForeignKey(
        Campaign, related_name="trials", blank=True, null=True, on_delete=models.CASCADE
    )
    id_major = models.IntegerField()
    id_minor = models.IntegerField()
    id_micro = models.IntegerField()
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField(blank=True, null=True)
    testers = models.ManyToManyField(Tester)
    system_configuration = models.ForeignKey(
        SystemConfiguration, blank=False, null=False, on_delete=models.CASCADE
    )
    test_condition = models.ForeignKey(
        TestCondition,
        blank=True,
        null=True,
        related_name="trials",
        on_delete=models.CASCADE,
    )
    bagfile = models.CharField(max_length=100, blank=True, default="")
    note = models.TextField(blank=True, default="")
    entities = models.ManyToManyField(Entity, blank=True, related_name="trials")
    scenario = models.ForeignKey(
        Scenario,
        blank=False,
        null=False,
        related_name="trials",
        on_delete=models.CASCADE,
    )
    current = models.BooleanField(default=False)
    reported = models.BooleanField(default=True)
    clock_config = models.ForeignKey(
        "ClockConfig",
        blank=True,
        null=True,
        related_name="trials",
        on_delete=models.SET_NULL,
    )

    class Meta:
        unique_together = ("id_major", "id_minor", "id_micro", "campaign")
        ordering = ["id_major", "id_minor", "id_micro"]

    def get_performers(self):
        performers = []
        try:
            performers = [
                capability.performer.name
                for capability in self.system_configuration.capabilities_under_test.all()
            ]
            performers_str = ", ".join(set(sorted(performers)))
        except:
            pass
        return performers_str

    def __str__(self):
        scenario = self.scenario
        #        performers = self.get_performers()
        system_configuration = self.system_configuration.name

        major = self.id_major if self.id_major is not None else ""
        minor_separator = "." if self.id_minor is not None else ""
        minor = self.id_minor if self.id_minor is not None else ""
        micro_separator = "." if self.id_micro is not None else ""
        micro = self.id_micro if self.id_micro is not None else ""

        return "{}{}{}{}{} ({}: {})".format(
            major,
            minor_separator,
            minor,
            micro_separator,
            micro,
            system_configuration,
            scenario,
        )

    def save(self, *args, **kwargs):
        if self.current:
            Trial.objects.filter(current=True).update(current=False)
        if self.scenario.time_limit and not self.end_datetime:
            if type(self.start_datetime) == str:
                self.end_datetime = (
                    datetime.strptime(self.start_datetime, "%Y-%m-%dT%H:%M:%S%z")
                    + self.scenario.time_limit
                )
            else:
                self.end_datetime = (
                    datetime.strptime(
                        self.start_datetime.isoformat(), "%Y-%m-%dT%H:%M:%S%z"
                    )
                    + self.scenario.time_limit
                )
        super(Trial, self).save(*args, **kwargs)


def get_current_trial(dt=None):
    if dt is None:
        dt = timezone.now()
    try:
        trial = Trial.objects.get(current=True)
    except Trial.DoesNotExist:
        trial = (
            Trial.objects.exclude(start_datetime__gt=dt)
            .exclude(end_datetime__lt=dt)
            .latest("start_datetime")
        )
        trial.current = True
        trial.save()
    return trial


class EventLevel(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, default="")
    key = models.CharField(max_length=100, blank=False, null=False, unique=True)
    visibility = models.IntegerField()

    def __str__(self):
        return self.name


class EventType(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, default="")
    has_duration = models.BooleanField(blank=False, null=False, default=False)
    event_level = models.ForeignKey(
        EventLevel, blank=False, null=False, on_delete=models.CASCADE
    )
    exclusive_with = models.ManyToManyField("self", blank=True)
    resets_with = models.ManyToManyField("self", blank=True)
    ends_segment = models.BooleanField(default=False)
    is_manual = models.BooleanField(default=True)
    point_style = models.ForeignKey(
        PointStyle,
        blank=True,
        null=True,
        related_name="event_types_styled",
        on_delete=models.SET_NULL,
    )
    priority_metadata = ArrayField(
        models.CharField(max_length=100), blank=True, null=False, default=list
    )
    metadata_style_fields = ArrayField(
        models.CharField(max_length=100), blank=True, null=True
    )

    def __str__(self):
        return self.name


def default_event_type():
    try:
        event_type = EventType.objects.all()[0]
    except EventType.DoesNotExist:
        event_type = None
    return event_type


class ClockPhase(models.Model):
    message = models.CharField(max_length=100)
    message_only = models.BooleanField(default=False)
    countdown = models.BooleanField(default=True)
    duration_seconds = models.PositiveIntegerField(blank=True, null=True, default=0)
    starts_with_datetime = models.DateTimeField(blank=True, null=True)
    starts_with_trial_start = models.BooleanField(default=False)
    starts_with_trial_end = models.BooleanField(default=False)
    ends_with_datetime = models.DateTimeField(blank=True, null=True)
    ends_with_trial_start = models.BooleanField(default=False)
    ends_with_trial_end = models.BooleanField(default=False)
    starts_with_event_type = models.ForeignKey(
        "EventType",
        blank=True,
        null=True,
        default=None,
        related_name="event_type_start",
        on_delete=models.SET_NULL,
    )
    ends_with_event_type = models.ForeignKey(
        "EventType",
        blank=True,
        null=True,
        default=None,
        related_name="event_type_end",
        on_delete=models.SET_NULL,
    )

    class Meta:
        ordering = ["-starts_with_datetime", "ends_with_datetime"]

    def __str__(self):
        return self.message


class ClockConfig(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    timezone = models.CharField(
        max_length=50, blank=False, null=False, default="America/Los_Angeles"
    )
    phases = models.ManyToManyField(
        "ClockPhase", blank=False, related_name="clock_configs"
    )

    def __str__(self):
        return self.name


def set_clock_phase_start_end_times(clock_phases, trial):

    for phase in clock_phases.all():

        # SET START ANCHORS
        # rule: if multiple start times, select the most recent

        # starts with trial start time
        if phase.starts_with_trial_start:
            if trial.start_datetime:
                phase.starts_with_datetime = trial.start_datetime
            else:
                phase.starts_with_datetime = None

        # starts with trial end time
        if phase.starts_with_trial_end:
            if trial.end_datetime:
                phase.starts_with_datetime = trial.end_datetime
            else:
                phase.starts_with_datetime = None

        # starts with event type:
        if phase.starts_with_event_type:
            event = Event.objects.filter(
                trial__id=trial.id, event_type__id=phase.starts_with_event_type.id
            ).first()
            if event:
                phase.starts_with_datetime = event.start_datetime
            else:
                phase.starts_with_datetime = None

        # SET END ANCHORS
        # rule: if multiple end times, select the most recent

        # ends with trial start time
        if phase.ends_with_trial_start:
            if trial.start_datetime:
                phase.ends_with_datetime = trial.start_datetime

                # start time could be set via duration to end time
                if phase.duration_seconds:
                    phase.starts_with_datetime = phase.ends_with_datetime - timedelta(
                        seconds=phase.duration_seconds
                    )
            else:
                phase.ends_with_datetime = None

        # ends with trial end time
        if phase.ends_with_trial_end:
            if trial.end_datetime:
                phase.ends_with_datetime = trial.end_datetime

                # start time could be set via duration to end time
                if phase.duration_seconds:
                    phase.starts_with_datetime = phase.ends_with_datetime - timedelta(
                        seconds=phase.duration_seconds
                    )
            else:
                phase.ends_with_datetime = None

        # ends with event type:
        ended_with_event_type = False
        if phase.ends_with_event_type:
            event = Event.objects.filter(
                trial__id=trial.id, event_type__id=phase.ends_with_event_type.id
            ).first()
            if event:
                # if phase has start time, verify ending event occurs after the start time
                if phase.starts_with_datetime:
                    if event.start_datetime > phase.starts_with_datetime:
                        phase.ends_with_datetime = event.start_datetime
                        ended_with_event_type = True
                else:
                    phase.ends_with_datetime = event.start_datetime
                    ended_with_event_type = True
            else:
                phase.ends_with_datetime = None

        # ends after specified duration
        if phase.duration_seconds and not ended_with_event_type:
            if phase.starts_with_datetime:
                phase.ends_with_datetime = phase.starts_with_datetime + timedelta(
                    seconds=phase.duration_seconds
                )
            else:
                phase.ends_with_datetime = None

        phase.save()

    return clock_phases


def get_next_clock_calltime(phases, trial):

    tz = pytz.timezone(trial.clock_config.timezone)
    now = datetime.now(tz)

    try:
        phase = phases.filter(
            starts_with_datetime__isnull=False, starts_with_datetime__gte=now
        ).earliest("starts_with_datetime")

    except ClockPhase.DoesNotExist:
        return None

    if phase.starts_with_datetime:
        return phase.starts_with_datetime
    else:
        return None


def get_clock_phase(trial):

    # verify trial
    if not trial:
        return None, None

    # verify trial has clock phases
    if not trial.clock_config:
        return None, None
    if trial.clock_config.phases.count == 0:
        return None, None

    # get current time
    tz = pytz.timezone(trial.clock_config.timezone)
    now = datetime.now(tz)

    raw_phases = trial.clock_config.phases

    # set the phase start and end times
    phases = set_clock_phase_start_end_times(raw_phases, trial)

    # request phase based on current time
    selected_phase = (
        phases.filter(starts_with_datetime__lt=now, ends_with_datetime__gt=now)
        .order_by("-starts_with_datetime")
        .first()
    )

    # a phase may not have a start time, but might count down to an end time
    if not selected_phase:
        selected_phase = (
            phases.filter(starts_with_datetime__isnull=True, ends_with_datetime__gt=now)
            .order_by("ends_with_datetime")
            .first()
        )

    # a phase may not have an end time, but counts up from a start time
    if not selected_phase:
        selected_phase = (
            phases.filter(ends_with_datetime__isnull=True, starts_with_datetime__lt=now)
            .order_by("-starts_with_datetime")
            .first()
        )

    return selected_phase, get_next_clock_calltime(phases, trial)


def get_clock_base_time(trial, clock_phase):

    # if timer counting down, return the end time, else the start time
    if clock_phase.countdown:
        if clock_phase.ends_with_datetime:
            return clock_phase.ends_with_datetime
        else:
            return None
    else:
        if clock_phase.starts_with_datetime:
            return clock_phase.starts_with_datetime
        else:
            return None






class PoseSource(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, default="")

    def __str__(self):
        return self.name


class Pose(models.Model):
    point = models.PointField(blank=True, null=False, srid=4326)
    elevation = models.FloatField(blank=True, null=True)
    heading = models.FloatField(blank=True, null=True)
    entity = models.ForeignKey(
        Entity, blank=False, null=False, related_name="poses", on_delete=models.CASCADE
    )
    pose_source = models.ForeignKey(
        PoseSource, blank=False, null=False, on_delete=models.CASCADE
    )
    timestamp = models.DateTimeField(blank=True, null=False)
    trial = models.ForeignKey(
        Trial, blank=True, null=True, related_name="poses", on_delete=models.CASCADE
    )
    speed = models.FloatField(blank=True, null=True)
    velocity = ArrayField(
        models.FloatField(), blank=True, null=False, default=list
    )
    def __str__(self):
        return "{}/{} ({})".format(self.entity, self.pose_source, self.timestamp)


class Note(models.Model):
    tester = models.ForeignKey(Tester, blank=True, null=False, on_delete=models.CASCADE)
    note = models.TextField(blank=False, null=False)
    event = models.ForeignKey("Event", related_name="notes", on_delete=models.CASCADE)

    def save(self, *args, **kwargs):
        # On save, update related event's modified_datetime
        self.event.save()
        return super(Note, self).save(*args, **kwargs)


class Segment(models.Model):
    tag = models.PositiveIntegerField(null=False, blank=False, unique=False)
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, default="")
    scenarios = models.ManyToManyField(Scenario, related_name="potential_segments")

    def __str__(self):
        return "{} -- {}".format(self.tag, self.name)


class Event(models.Model):
    modified_datetime = models.DateTimeField(editable=False)
    trial = models.ForeignKey(Trial, on_delete=models.CASCADE)
    submitted_datetime = models.DateTimeField(auto_now_add=True, blank=True)
    start_datetime = models.DateTimeField(blank=True, null=False)
    end_datetime = models.DateTimeField(blank=True, null=True)
    start_pose = models.ForeignKey(
        Pose, blank=True, null=True, related_name="events", on_delete=models.CASCADE
    )
    event_type = models.ForeignKey(EventType, on_delete=models.CASCADE)
    weather = models.ForeignKey(Weather, on_delete=models.CASCADE)
    trigger = models.ForeignKey(
        "Trigger", blank=True, null=True, on_delete=models.CASCADE
    )
    segment = models.ForeignKey(
        Segment, blank=True, null=True, on_delete=models.CASCADE
    )
    metadata = JSONField(default=dict)
    entities = models.ManyToManyField(
        Entity, related_name="associated_events", through="EntityEventRelation"
    )
    unfound_entities = JSONField(default=list)
    invalid_entities = JSONField(default=list)

    class Meta:
        ordering = ["-start_datetime"]

    def __str__(self):
        return "{} ({})".format(self.event_type.name, self.start_datetime)

    def save(self, *args, **kwargs):
        now = timezone.now()

        # On save, check exclusive_with and resets_with of other open events (with duration)
        close_resets_with_events = False
        close_exclusive_with_events = False

        # This is a new event
        if not self.id:
            close_exclusive_with_events = True
            # Event has duration and end_datetime is set
            if self.event_type.has_duration and self.end_datetime is not None:
                close_resets_with_events = True

        # This is an existing event
        else:
            # Event has duration and end_datetime is set
            if self.event_type.has_duration and self.end_datetime is not None:
                # This is the first time end_datetime has been set
                if Event.objects.get(id=self.id).end_datetime is None:
                    close_resets_with_events = True

        if close_resets_with_events:
            for event_type in self.event_type.resets_with.all():
                events_to_close = Event.objects.filter(
                    event_type__has_duration=True,
                    end_datetime=None,
                    event_type=event_type,
                ).all()
                for event in events_to_close:
                    event.end_datetime = self.end_datetime
                    event.save()

        if close_exclusive_with_events:
            for event_type in self.event_type.exclusive_with.all():
                events_to_close = Event.objects.filter(
                    event_type__has_duration=True,
                    end_datetime=None,
                    event_type=event_type,
                ).all()
                for event in events_to_close:
                    # Should this be self.start_datetime instead of now?
                    event.end_datetime = now
                    event.save()

        # On save, update modified_datetime
        self.modified_datetime = now
        return super(Event, self).save(*args, **kwargs)


class EntityEventRole(models.Model):
    # This model defines possible Roles an Entity may have in an Event
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    # metadata_key is used if the entity is submitted via metadata. This key is used to match the entity in the associated metadata value.
    metadata_key = models.CharField(max_length=100, blank=True, null=True, unique=True)
    description = models.TextField(blank=True, default="")
    entity_state = models.ForeignKey(
        "EntityState", blank=True, null=True, on_delete=models.SET_NULL
    )
    valid_event_types = models.ManyToManyField("EventType", blank=True)
    valid_entity_types = models.ManyToManyField("EntityType", blank=True)
    valid_entity_groups = models.ManyToManyField("EntityGroup", blank=True)


class EntityEventRelation(models.Model):
    entity_event_role = models.ForeignKey(EntityEventRole, on_delete=models.CASCADE)
    event = models.ForeignKey(
        Event, on_delete=models.CASCADE, related_name="related_entities"
    )
    entity = models.ForeignKey(Entity, on_delete=models.CASCADE)


class ImageType(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, default="")
    topic = models.CharField(max_length=100, blank=True, default="")

    def __str__(self):
        return self.name


def default_image_type():
    return ImageType.objects.all()[0]


def get_unique_image_file_path(instance, filename="dummy.jpg"):
    """
    determines where to save images.
    """
    ext = filename.split(".")[-1]
    filename = "{}_{}.{}".format(instance.image_type, instance.timestamp, ext)
    filename = filename.replace(" ", "_")
    filename = filename.replace(":", "-")
    return os.path.join("images", filename)


class Image(models.Model):
    image = ThumbnailerImageField(upload_to=get_unique_image_file_path)
    image_type = models.ForeignKey(
        ImageType, blank=True, null=False, on_delete=models.CASCADE
    )
    event = models.ForeignKey(
        Event, blank=False, null=False, related_name="images", on_delete=models.CASCADE
    )
    timestamp = models.DateTimeField()

    class Meta:
        ordering = ["-image_type__id"]

    def save(self, *args, **kwargs):
        # On save, update related event's modified_datetime
        self.event.save()
        return super(Image, self).save(*args, **kwargs)


class ServerType(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=False)
    description = models.TextField(blank=True, default="")
    key = models.CharField(max_length=100, blank=False, null=False, unique=True)

    def __str__(self):
        return self.name


class ServerParam(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, default="")
    param = models.CharField(max_length=100, blank=False, null=False, unique=False)
    value = models.CharField(max_length=1000, blank=False, null=False, unique=False)

    def __str__(self):
        return self.name


class Server(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    server_type = models.ForeignKey(
        ServerType, blank=False, null=False, on_delete=models.CASCADE
    )
    active = models.BooleanField(default=True)
    base_url = models.CharField(max_length=1000, blank=False, null=False)
    server_params = models.ManyToManyField(ServerParam, blank=True)

    def __str__(self):
        return self.name


class ConditionVariable(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, default="")
    variable = models.TextField(blank=False, default="")

    def __str__(self):
        return self.name


class QuerySetMethod(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, default="")
    method_name = models.CharField(
        max_length=100, blank=False, null=False, unique=False
    )
    parameters = models.CharField(max_length=255, blank=True, null=False)

    def __str__(self):
        return self.method_name + self.parameters


class QuerySetSpecification(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, default="")
    model_name = models.CharField(max_length=100, blank=False, null=False, unique=False)
    methods = models.CharField(max_length=255, blank=True, null=False)

    def __str__(self):
        return self.name + ": " + self.model_name + ":" + self.methods


class ExtractionField(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, default="")
    label = models.CharField(max_length=255, blank=False, null=False, unique=False)
    field_name = models.CharField(max_length=255, blank=True, null=False)

    def __str__(self):
        return self.label + ": " + self.field_name


class ExtractionSpecification(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, default="")
    queryset = models.ForeignKey(
        QuerySetSpecification, blank=False, null=False, on_delete=models.CASCADE
    )
    extraction_fields = models.ManyToManyField(ExtractionField, blank=False)

    def __str__(self):
        return self.name


class DataManipulator(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, default="")
    module = models.CharField(max_length=100, blank=False, null=False, unique=False)
    method_name = models.CharField(
        max_length=100, blank=False, null=False, unique=False
    )
    parameters = models.CharField(max_length=255, blank=True, null=False)
    dataset = models.CharField(max_length=255, blank=True, null=False)

    def __str__(self):
        return "{}: {}({})".format(self.name, self.method_name, self.parameters)


class Iterator(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, default="")
    extraction_spec = models.ForeignKey(
        ExtractionSpecification, blank=False, null=False, on_delete=models.CASCADE
    )
    unique_field = models.ForeignKey(
        ExtractionField, blank=False, null=False, unique=False, on_delete=models.CASCADE
    )

    def __str__(self):
        return self.name


class IteratedExtractionSpecification(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, default="")
    iterator = models.ForeignKey(
        Iterator, blank=True, null=False, on_delete=models.CASCADE
    )
    prefix = models.CharField(max_length=100, unique=True, blank=True, null=True)
    extraction_spec = models.ForeignKey(
        ExtractionSpecification, blank=True, null=False, on_delete=models.CASCADE
    )

    def __str__(self):
        return self.name


class IteratedDataManipulator(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, default="")
    iterator = models.ForeignKey(
        Iterator, blank=True, null=False, on_delete=models.CASCADE
    )
    prefix = models.CharField(max_length=100, unique=True, blank=True, null=True)
    data_manipulator = models.ForeignKey(
        DataManipulator, blank=True, null=False, on_delete=models.CASCADE
    )

    def __str__(self):
        return self.name


class FigureFamily(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, default="")
    method_name = models.CharField(
        max_length=100, blank=False, null=False, unique=False
    )
    module = models.CharField(max_length=100, blank=False, null=False, unique=False)

    def __str__(self):
        return self.name


class FigureType(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, default="")
    figure_family = models.ForeignKey(
        FigureFamily, blank=False, null=False, on_delete=models.CASCADE
    )
    data_manipulator = models.ForeignKey(
        DataManipulator, blank=False, null=False, on_delete=models.CASCADE
    )
    parameters = models.CharField(max_length=255, blank=True, null=False)
    iterator = models.ForeignKey(
        Iterator, blank=True, null=True, on_delete=models.CASCADE
    )
    prefix = models.CharField(max_length=100, unique=True, blank=True, null=True)

    def __str__(self):
        return self.name


class Figure(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    image = models.ImageField(upload_to="report_figures/")
    generated_datetime = models.DateTimeField(editable=False)

    def save(self, *args, **kwargs):
        now = timezone.now()
        self.generated_datetime = now
        return super(Figure, self).save(*args, **kwargs)


REPORT_FORMAT_CHOICES = (("pdf", ".pdf"), ("html", ".html"))


def report_templates_path(instance, filename):
    return os.path.join("report_templates", instance.name, filename)


def rendered_report_templates_path(instance, filename):
    return os.path.join("rendered_report_templates", instance.name, filename)


def online_report_path(instance, filename):
    return os.path.join(
        "online_reports",
        instance.name,
        instance.name + "_" + datetime.now().isoformat().replace(":", "-"),
        filename,
    )


def report_archive_path(instance, filename):
    return os.path.join("report_archives", instance.name, filename)


class Report(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, default="")
    template = models.FileField(upload_to=report_templates_path, blank=False)
    rendered_template = models.FileField(
        upload_to=rendered_report_templates_path, editable=False
    )
    online_report = models.FileField(upload_to=online_report_path)
    report_archive = models.FileField(upload_to=report_archive_path)
    modified_datetime = models.DateTimeField(editable=False)
    iterators = models.ManyToManyField(Iterator, blank=True)
    figure_types = models.ManyToManyField(FigureType, blank=True)
    iterated_extraction_specs = models.ManyToManyField(
        IteratedExtractionSpecification, blank=True
    )
    iterated_data_manipulators = models.ManyToManyField(
        IteratedDataManipulator, blank=True
    )
    format = models.CharField(
        max_length=100, choices=REPORT_FORMAT_CHOICES, blank=True, default=".html"
    )
    status = models.CharField(max_length=100, editable=False)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        now = timezone.now()
        self.modified_datetime = now
        return super(Report, self).save(*args, **kwargs)


class RequestedData(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, default="")
    destination_url = models.TextField(default="")
    payload = JSONField(default=dict)

    def __str__(self):
        return self.name


class KeyValuePair(models.Model):
    key = models.CharField(max_length=255, blank=False, null=False)
    value = models.CharField(max_length=255, blank=False, null=False)

    def __str__(self):
        return "{}:{}".format(self.key, self.value)


class TriggerResponse(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, default="")
    method = models.CharField(max_length=100, blank=False, null=False, unique=False)
    module = models.CharField(max_length=100, blank=False, null=False, unique=False)
    parameters = models.ManyToManyField(KeyValuePair, blank=True)


class OrderedTriggerResponse(models.Model):
    order = models.IntegerField(blank=False, null=False)
    trigger_response = models.ForeignKey(
        TriggerResponse, blank=False, null=False, on_delete=models.CASCADE
    )

    class Meta:
        unique_together = ("order", "trigger_response")
        ordering = ["order", "trigger_response"]

    def __str__(self):
        return "Order {}:{}".format(self.order, self.trigger_response.name)


class Trigger(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    is_manual = models.BooleanField(default=False)
    creates_event = models.BooleanField(default=True)
    key = models.CharField(max_length=100, blank=False, null=False, unique=True)
    condition = models.TextField(blank=True, null=True)
    condition_variables = models.ManyToManyField(ConditionVariable, blank=True)
    event_type = models.ForeignKey(
        EventType, blank=True, null=True, on_delete=models.CASCADE
    )
    requested_dataset = models.ManyToManyField(RequestedData, blank=True)
    trigger_transport = models.CharField(
        max_length=10, blank=True, null=False, default=""
    )
    trigger_responses = models.ManyToManyField(OrderedTriggerResponse, blank=True)

    def __str__(self):
        return self.name


def default_trigger():
    try:
        trigger = Trigger.objects.all()[:1].get()
    except Trigger.DoesNotExist:
        trigger = None
    return trigger
