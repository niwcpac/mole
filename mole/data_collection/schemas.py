from rest_framework_gis.schema import GeoFeatureAutoSchema

from data_collection import serializers as dcs

class MoleBaseSchema(GeoFeatureAutoSchema):
    def get_tags(self, path, method):

        if path.startswith('/'):
            path = path[1:]

        # The original implementation uses the first element of the path,
        # which doesn't work for our paths (api/<model_name>/)
        # it sets the tag as 'api' instead of the actual model
        return [path.split('/')[1].replace('_', '-')]

class EntitySchema(MoleBaseSchema):
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

    def get_responses(self, path, method):
        method_name = getattr(self.view, 'action', method.lower())
        if method_name == "around" or method_name == "radius":
            status_code = "200"
            if method_name == "around":
                description = "list entities that are within a certain distance from a target entity"
            elif method_name == "radius":
                description = "list entities that are within a certain distance from a target location"
            return {
                status_code: {
                    "content": {
                        "application/json": {"schema": {
                            "type": "array",
                            "items": {
                                "type": "array",
                                "items": {
                                    "oneOf": ["string", "number"],
                                },
                                "minItems": 2,
                                "maxItems": 2,
                            },
                        }}
                    },
                    # description is a mandatory property,
                    # https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#responseObject
                    # TODO: put something meaningful into it
                    "description": description,
                }
            }
        return super().get_responses(path, method)


class CampaignSchema(MoleBaseSchema):
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

    def get_responses(self, path, method):
        method_name = getattr(self.view, 'action', method.lower())
        if method_name == "latest" or method_name == "latest_trial":
            status_code = "200"
            serializer = self.get_request_serializer(path, method)
            return {
                status_code: {
                    "content": {
                        "application/json": {"schema": {'$ref': '#/components/schemas/{}'.format(self.get_component_name(serializer))}}
                    },
                    # description is a mandatory property,
                    # https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#responseObject
                    # TODO: put something meaningful into it
                    "description": "",
                }
            }
        return super().get_responses(path, method)


class TrialSchema(MoleBaseSchema):
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


class TestMethodSchema(MoleBaseSchema):
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


class EventSchema(MoleBaseSchema):
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


class TesterSchema(MoleBaseSchema):
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


class TriggerSchema(MoleBaseSchema):
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


class RegionSchema(MoleBaseSchema):
    """Extension of ``AutoSchema`` to add support for custom field schemas."""

    def map_field(self, field):
        if field.field_name == "entities":
            return {
                "type": "object",
            }

        # Handle SerializerMethodFields or custom fields here...
        # ...
        return super().map_field(field)


class NoteSchema(MoleBaseSchema):
    """Extension of ``AutoSchema`` to add support for custom field schemas."""

    def map_field(self, field):
        if field.field_name == "tester":
            data = TesterSchema().map_serializer(dcs.TesterSerializer())
            data["type"] = "object"
            return data

        # Handle SerializerMethodFields or custom fields here...
        # ...
        return super().map_field(field)
