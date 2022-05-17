from rest_framework_gis.schema import GeoFeatureAutoSchema

from data_collection import serializers as dcs

class EntitySchema(GeoFeatureAutoSchema):
    """Extension of ``AutoSchema`` to add support for custom field schemas."""

    def map_field(self, field):
        if field.field_name == "campaigns":
            return {
                "type": "array",
                "items": { "type" : "string" },
            }
        elif field.field_name == "region":
            return {
                "type": "array",
                "items": { "type" : "string" },
            }
        elif field.field_name == "latest_pose":
            data = self.map_serializer(dcs.PoseSerializer())
            data["type"] = "object"
            data["nullable"] = True
            return data

        # Handle SerializerMethodFields or custom fields here...
        # ...
        return super().map_field(field)


class CampaignSchema(GeoFeatureAutoSchema):
    """Extension of ``AutoSchema`` to add support for custom field schemas."""

    def map_field(self, field):
        if field.field_name == "entities":
            return {
                "type": "array",
                "items": { "type" : "object" },
            }
        elif field.field_name == "scenarios":
            return {
                "type": "array",
                "items": { "type" : "object" },
            }

        # Handle SerializerMethodFields or custom fields here...
        # ...
        return super().map_field(field)


class TrialSchema(GeoFeatureAutoSchema):
    """Extension of ``AutoSchema`` to add support for custom field schemas."""

    def map_field(self, field):
        if field.field_name == "performers":
            return {
                "type": "array",
                "items": { "type" : "string" },
            }
        elif field.field_name == "script_run_counts":
            return {
                "type": "array",
                "items": { "type" : "object" },
            }

        # Handle SerializerMethodFields or custom fields here...
        # ...
        return super().map_field(field)


class TestMethodSchema(GeoFeatureAutoSchema):
    """Extension of ``AutoSchema`` to add support for custom field schemas."""

    def map_field(self, field):
        if field.field_name == "trials":
            return {
                "type": "array",
                "items": { "type" : "object" },
            }
        elif field.field_name == "campaigns":
            return {
                "type": "array",
                "items": { "type" : "string" },
            }

        # Handle SerializerMethodFields or custom fields here...
        # ...
        return super().map_field(field)


class EventSchema(GeoFeatureAutoSchema):
    """Extension of ``AutoSchema`` to add support for custom field schemas."""

    def map_field(self, field):
        if isinstance(field.parent, dcs.EventSerializer) and field.field_name == "point_style":
            data = self.map_serializer(dcs.AggregatedPointStyleSerializer())
            data["type"] = "object"
            return data
        elif field.field_name == "related_entities":
            return {
                "type": "object",
            }
        elif field.field_name == "unfound_entities":
            return {
                "type": "array",
                "items": { "type" : "string" },
            }
        elif field.field_name == "invalid_entities":
            return {
                "type": "array",
                "items": { "type" : "string" },
            }
        elif field.field_name == "start_pose":
            data = self.map_serializer(dcs.PoseSerializer())
            data["type"] = "object"
            data["nullable"] = True
            return data

        # Handle SerializerMethodFields or custom fields here...
        # ...
        return super().map_field(field)


class TesterSchema(GeoFeatureAutoSchema):
    """Extension of ``AutoSchema`` to add support for custom field schemas."""

    def map_field(self, field):
        if field.field_name == "user_id":
            return {
                "type": "integer",
            }
        elif field.field_name == "role_id":
            return {
                "type": "integer",
            }

        # Handle SerializerMethodFields or custom fields here...
        # ...
        return super().map_field(field)


class TriggerSchema(GeoFeatureAutoSchema):
    """Extension of ``AutoSchema`` to add support for custom field schemas."""

    def map_field(self, field):
        if field.field_name == "converted_cond_vars":
            return {
                "type": "array",
                "items": { "type" : "string" },
            }
        elif field.field_name == "trig_resp":
            return {
                "type": "array",
                "items": { "type" : "object" },
            }

        # Handle SerializerMethodFields or custom fields here...
        # ...
        return super().map_field(field)


class RegionSchema(GeoFeatureAutoSchema):
    """Extension of ``AutoSchema`` to add support for custom field schemas."""

    def map_field(self, field):
        if field.field_name == "entities":
            return {
                "type": "object",
            }

        # Handle SerializerMethodFields or custom fields here...
        # ...
        return super().map_field(field)


class NoteSchema(GeoFeatureAutoSchema):
    """Extension of ``AutoSchema`` to add support for custom field schemas."""

    def map_field(self, field):
        if field.field_name == "tester":
            data = TesterSchema().map_serializer(dcs.TesterSerializer())
            data["type"] = "object"
            return data

        # Handle SerializerMethodFields or custom fields here...
        # ...
        return super().map_field(field)
