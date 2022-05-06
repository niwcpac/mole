from rest_framework import serializers
import automation.models as amm

class ScriptConditionSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = amm.ScriptCondition
        fields = [
            "url",
            "name",
            "description",
            "trial_has_event",
            "trial_missing_event",
            "event_metadata_contains",
            "event_metadata_excludes",
            "trigger_metadata_contains",
            "trigger_metadata_excludes",
        ]


class ScriptedEventSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = amm.ScriptedEvent
        fields = [
            "url",
            "name",
            "conditions",
            "conditions_pass_if_any",
            "delay_seconds",
            "event_type",
            "add_event_metadata",
            "copy_trigger_metadata",
            "next_scripted_event",
        ]

class ScriptRunCountSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = amm.ScriptRunCount
        fields = [
            "url",
            "trial",
            "script",
            "count"
        ]

class ScriptSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = amm.Script
        fields = [
            "url",
            "name",
            "initiating_event_types",
            "conditions",
            "run_limit",
            "auto_repeat_count",
            "conditions_pass_if_any",
            "cancelling_event_type",
            "scripted_event_head"
        ]