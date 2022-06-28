from django.contrib.gis.db import models
from django.contrib.postgres.fields import JSONField


class ScriptedEvent(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=False)
    conditions = models.ManyToManyField("ScriptCondition", blank=True)
    conditions_pass_if_any = models.BooleanField(default=False)
    delay_seconds = models.PositiveIntegerField(blank=True, null=True, default=0)
    event_type = models.ForeignKey(
        "data_collection.EventType",
        blank=False,
        null=False,
        related_name="scripted_event",
        on_delete=models.CASCADE,
    )
    add_event_metadata = JSONField(default=dict)
    copy_trigger_metadata = models.BooleanField(default=False)
    next_scripted_event = models.ForeignKey(
        "self",
        blank=True,
        null=True,
        default=None,
        related_name="scripted_event",
        on_delete=models.SET_NULL,
    )

    def __str__(self):
        return self.name


class ScriptCondition(models.Model):
    name = models.CharField(max_length=100, blank=True, null=True, unique=False)
    description = models.TextField(blank=True, null=True, default="")
    trial_has_event = models.ForeignKey(
        "data_collection.EventType",
        blank=True,
        null=True,
        default=None,
        related_name="script_condition_has_event",
        on_delete=models.SET_NULL,
    )
    trial_missing_event = models.ForeignKey(
        "data_collection.EventType",
        blank=True,
        null=True,
        default=None,
        related_name="script_condition_missing_event",
        on_delete=models.SET_NULL,
    )
    event_metadata_contains = models.CharField(
        max_length=100, blank=True, null=True, unique=False
    )
    event_metadata_excludes = models.CharField(
        max_length=100, blank=True, null=True, unique=False
    )
    trigger_metadata_contains = models.CharField(
        max_length=100, blank=True, null=True, unique=False
    )
    trigger_metadata_excludes = models.CharField(
        max_length=100, blank=True, null=True, unique=False
    )

    def __str__(self):
        return self.name


class ScriptRunCount(models.Model):
    trial = models.ForeignKey(
        "data_collection.Trial",
        blank=False,
        null=False,
        related_name="script_run_count",
        on_delete=models.CASCADE,
    )
    script = models.ForeignKey(
        "Script",
        blank=False,
        null=False,
        related_name="script_run_count",
        on_delete=models.CASCADE,
    )
    count = models.PositiveIntegerField(blank=False, null=False, default=0)

    class Meta:
        unique_together = (
            "trial",
            "script",
        )

    def __eq__(self, other):
        return self.id == other.id


class Script(models.Model):
    name = models.CharField(max_length=100, blank=False, null=False, unique=True)
    initiating_event_types = models.ManyToManyField(
        "data_collection.EventType",
        blank=False,
        related_name="initiating_types",
    )
    conditions = models.ManyToManyField(
        "ScriptCondition", blank=True, related_name="script_conditions"
    )
    run_limit = models.PositiveIntegerField(blank=True, null=True, default=None)
    auto_repeat_count = models.PositiveIntegerField(blank=False, null=False, default=0)
    conditions_pass_if_any = models.BooleanField(default=False)
    cancelling_event_type = models.ForeignKey(
        "data_collection.EventType",
        blank=True,
        null=True,
        default=None,
        related_name="cancelling_type",
        on_delete=models.SET_NULL,
    )
    scripted_event_head = models.ForeignKey(
        "ScriptedEvent",
        blank=True,
        null=True,
        default=None,
        related_name="script",
        on_delete=models.SET_NULL,
    )

    def __str__(self):
        return self.name
