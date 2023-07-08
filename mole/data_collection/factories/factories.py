import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mole.settings.settings")

import random, datetime
import django
from django.utils import timezone
from django.template.defaultfilters import slugify

django.setup()

from data_collection import models

import factory
from factory.django import DjangoModelFactory

class UserFactory(DjangoModelFactory):
    class Meta:
        model = "auth.User"
        django_get_or_create = ("username",)

    username = "user"
    password = None
    is_staff = False
    is_superuser = False

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        # Note: it appears that the _create method is called even if a User with matching username exists
        #  This leads to password being overwritten with the default password if the user exists but
        #  no password was provided to the factory.
        password = kwargs.pop("password", None)
        obj = super(UserFactory, cls)._create(model_class, *args, **kwargs)
        # Don't overwrite an existing password if one wasn't submitted
        if not obj.password or password is not None:
            # This is a new user creation (with default password)
            if password is None:
                password = "password"
            # ensure the raw password gets set after the initial save
            obj.set_password(password)
            obj.save()
        return obj


class CapabilityFactory(DjangoModelFactory):
    class Meta:
        model = models.Capability
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "capability_%d" % n)


class ModFactory(DjangoModelFactory):
    class Meta:
        model = models.Mod
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "mod_%d" % n)

    # handle many-to-many relationship
    @factory.post_generation
    def capabilities(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            for capability in extracted:
                self.capabilities.add(capability)


class PointStyleFactory(DjangoModelFactory):
    class Meta:
        model = models.PointStyle
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "point_style_%d" % n)


class EntityTypeFactory(DjangoModelFactory):
    class Meta:
        model = models.EntityType
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "entity_type_%d" % n)
    point_style = factory.SubFactory(PointStyleFactory)

    # handle many-to-many relationship
    @factory.post_generation
    def capabilities(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            for capability in extracted:
                self.capabilities.add(capability)


class EntityStateFactory(DjangoModelFactory):
    class Meta:
        model = models.EntityState
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "entitystate_%d" % n)


class EntityFactory(DjangoModelFactory):
    class Meta:
        model = models.Entity
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "entity_%d" % n)
    entity_type = factory.SubFactory(EntityTypeFactory)

    # handle many-to-many relationship
    @factory.post_generation
    def mods(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            # A list of mods was passed in, add them to the entity
            for mod in extracted:
                self.mods.add(mod)


class EntityGroupFactory(DjangoModelFactory):
    class Meta:
        model = models.EntityGroup
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "entityGroup_%d" % n)


class QuerySetSpecificationFactory(DjangoModelFactory):
    class Meta:
        model = models.QuerySetSpecification
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "querysetSpecification_%d" % n)


class QuerySetMethodFactory(DjangoModelFactory):
    class Meta:
        model = models.QuerySetMethod
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "querysetMethod_%d" % n)


class ExtractionSpecificationFactory(DjangoModelFactory):
    class Meta:
        model = models.ExtractionSpecification
        django_get_or_create = ("name", "queryset")

    name = factory.Sequence(lambda n: "extractionSpecification_%d" % n)
    queryset = factory.SubFactory(QuerySetSpecificationFactory)

    # handle many-to-many relationship
    @factory.post_generation
    def extraction_fields(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            for extraction_field in extracted:
                self.extraction_fields.add(extraction_field)


class ExtractionFieldFactory(DjangoModelFactory):
    class Meta:
        model = models.ExtractionField
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "extractionField_%d" % n)


class DataManipulatorFactory(DjangoModelFactory):
    class Meta:
        model = models.DataManipulator
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "dataManipulator_%d" % n)


class IteratorFactory(DjangoModelFactory):
    class Meta:
        model = models.Iterator
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "Iterator_%d" % n)
    extraction_spec = factory.SubFactory(ExtractionSpecificationFactory)
    unique_field = factory.SubFactory(ExtractionFieldFactory)


class IteratedExtractionSpecificationFactory(DjangoModelFactory):
    class Meta:
        model = models.IteratedExtractionSpecification
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "iteratedExtractionSpecification_%d" % n)
    iterator = factory.SubFactory(IteratorFactory)
    extraction_spec = factory.SubFactory(ExtractionSpecificationFactory)


class IteratedDataManipulatorFactory(DjangoModelFactory):
    class Meta:
        model = models.IteratedDataManipulator
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "iteratedDataManipulator_%d" % n)
    iterator = factory.SubFactory(IteratorFactory)
    data_manipulator = factory.SubFactory(DataManipulatorFactory)


class FigureFamilyFactory(DjangoModelFactory):
    class Meta:
        model = models.FigureFamily
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "figureFamily_%d" % n)
    method_name = "bar_chart"
    module = "figures"


class FigureTypeFactory(DjangoModelFactory):
    class Meta:
        model = models.FigureType
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "figureType_%d" % n)
    figure_family = factory.SubFactory(FigureFamilyFactory)
    data_manipulator = factory.SubFactory(DataManipulatorFactory)
    iterator = factory.SubFactory(IteratorFactory)


class FigureFactory(DjangoModelFactory):
    class Meta:
        model = models.Figure
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "figure_%d" % n)
    figure_type = factory.SubFactory(FigureTypeFactory)


class ReportFactory(DjangoModelFactory):
    class Meta:
        model = models.Report
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "figure_%d" % n)
    template = factory.django.FileField(filename="junk.rst", data=b"test")

    # handle many-to-many relationship
    @factory.post_generation
    def iterators(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            # A list of server_params was passed in, use them
            for iterator in extracted:
                self.iterators.add(iterator)

    # handle many-to-many relationship
    @factory.post_generation
    def figure_types(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            # A list of server_params was passed in, use them
            for figure_type in extracted:
                self.figure_types.add(figure_type)

    # handle many-to-many relationship
    @factory.post_generation
    def iterated_extraction_specs(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            # A list of server_params was passed in, use them
            for iterated_extraction_spec in extracted:
                self.iterated_extraction_specs.add(iterated_extraction_spec)

    # handle many-to-many relationship
    @factory.post_generation
    def iterated_data_manipulators(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            # A list of server_params was passed in, use them
            for iterated_data_manipulator in extracted:
                self.iterated_data_manipulators.add(iterated_data_manipulator)


class LocationFactory(DjangoModelFactory):
    class Meta:
        model = models.Location
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "location_%d" % n)


class ServerTypeFactory(DjangoModelFactory):
    class Meta:
        model = models.ServerType
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "server_type_%d" % n)
    key = factory.Sequence(lambda n: "server_type_%d" % n)


class ServerParamFactory(DjangoModelFactory):
    class Meta:
        model = models.ServerParam
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "server_param_%d" % n)
    param = factory.Sequence(lambda n: "server_param_param_%d" % n)
    value = factory.Sequence(lambda n: "server_param_value_%d" % n)


class ServerFactory(DjangoModelFactory):
    class Meta:
        model = models.Server
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "server_%d" % n)
    server_type = factory.SubFactory(ServerTypeFactory)
    base_url = factory.Sequence(lambda n: "http://example.com/%d" % n)

    # handle many-to-many relationship
    @factory.post_generation
    def server_params(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            # A list of server_params was passed in, use them
            for server_param in extracted:
                self.server_params.add(server_param)


def get_visibility():
    visibility_choices = range(6)
    return random.choice(visibility_choices)


class EventLevelFactory(DjangoModelFactory):
    class Meta:
        model = models.EventLevel
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "event_level_%d" % n)
    key = factory.Sequence(lambda n: "%d" % n)
    visibility = factory.LazyFunction(get_visibility)


class EventTypeFactory(DjangoModelFactory):
    class Meta:
        model = models.EventType
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "event_type_%d" % n)
    event_level = factory.SubFactory(EventLevelFactory)
    point_style = factory.SubFactory(PointStyleFactory)

    # handle many-to-many relationship
    @factory.post_generation
    def exclusive_with(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            # A list of EventTypes was passed in, use them
            for event_type in extracted:
                self.exclusive_with.add(event_type)

    # handle many-to-many relationship
    @factory.post_generation
    def resets_with(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            # A list of EventTypes was passed in, use them
            for event_type in extracted:
                self.resets_with.add(event_type)

    # handle many-to-many relationship
    @factory.post_generation
    def metadatakey_set(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            # A list of MetadataKeys was passed in, use them
            for metadata_key in extracted:
                self.metadatakey_set.add(metadata_key)


class CampaignFactory(DjangoModelFactory):
    class Meta:
        model = models.Campaign
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "campaign_%d" % n)
    start_datetime = factory.LazyFunction(timezone.now)


class TestMethodFactory(DjangoModelFactory):
    class Meta:
        model = models.TestMethod
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "test_method_%d" % n)
    version_major = factory.Sequence(lambda n: "%d" % n)
    version_minor = factory.Sequence(lambda n: "%d" % n)
    version_micro = factory.Sequence(lambda n: "%d" % n)


class ScenarioFactory(DjangoModelFactory):
    class Meta:
        model = models.Scenario
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "scenario_%d" % n)
    test_method = factory.SubFactory(TestMethodFactory)
    location = factory.SubFactory(LocationFactory)

    # handle many-to-many relationship
    @factory.post_generation
    def scripts(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            for script in extracted:
                self.scripts.add(script)


class RoleFactory(DjangoModelFactory):
    class Meta:
        model = models.Role
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "role_%d" % n)


class TesterFactory(DjangoModelFactory):
    class Meta:
        model = models.Tester
        django_get_or_create = ("user", "role")

    user = factory.SubFactory(UserFactory)
    role = factory.SubFactory(RoleFactory)


class WeatherFactory(DjangoModelFactory):
    class Meta:
        model = models.Weather
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "weather_%d" % n)


class TestConditionFactory(DjangoModelFactory):
    class Meta:
        model = models.TestCondition
        django_get_or_create = ("weather",)

    weather = factory.SubFactory(WeatherFactory)


class PerformerFactory(DjangoModelFactory):
    class Meta:
        model = models.Performer
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "performer_%d" % n)


class CapabilityUnderTestFactory(DjangoModelFactory):
    class Meta:
        model = models.CapabilityUnderTest
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "capability_under_test_%d" % n)
    performer = factory.SubFactory(PerformerFactory)


class SystemConfigurationFactory(DjangoModelFactory):
    class Meta:
        model = models.SystemConfiguration
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "system_configuration_%d" % n)

    # handle many-to-many relationship
    @factory.post_generation
    def capabilities_under_test(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            # A list of capabilites_under_test was passed in, use them
            for capability_under_test in extracted:
                self.capabilities_under_test.add(capability_under_test)


class TrialFactory(DjangoModelFactory):
    class Meta:
        model = models.Trial
        django_get_or_create = ("id_major", "id_minor", "id_micro")

    id_major = factory.Sequence(lambda n: "%d" % n)
    id_minor = factory.Sequence(lambda n: "%d" % n)
    id_micro = factory.Sequence(lambda n: "%d" % n)
    system_configuration = factory.SubFactory(SystemConfigurationFactory)
    scenario = factory.SubFactory(ScenarioFactory)
    start_datetime = factory.LazyFunction(timezone.now)
    campaign = factory.SubFactory(CampaignFactory)

    # handle many-to-many relationship
    @factory.post_generation
    def testers(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            # A list of testers was passed in, use them
            for tester in extracted:
                self.testers.add(tester)

    # handle many-to-many relationship
    @factory.post_generation
    def entities(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            # A list of entities was passed in, use them
            for entity in extracted:
                self.entities.add(entity)

    # handle many-to-many relationship
    @factory.post_generation
    def script_run_counts(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            # A list of entities was passed in, use them
            for count in extracted:
                self.script_run_counts.add(count)


class SegmentFactory(DjangoModelFactory):
    class Meta:
        model = models.Segment
        django_get_or_create = ("name",)

    tag = factory.Sequence(lambda n: "%d" % n)
    name = factory.Sequence(lambda n: "segment_%d" % n)

    # handle many-to-many relationship
    @factory.post_generation
    def scenarios(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            # A list of scenarios was passed in, use them
            for scenario in extracted:
                self.scenarios.add(scenario)


class PoseSourceFactory(DjangoModelFactory):
    class Meta:
        model = models.PoseSource
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "pose_source_%d" % n)


def get_point():
    lat = random.uniform(11, 39)
    lon = random.uniform(21, 29)
    return "POINT({lon} {lat})".format(lat=lat, lon=lon)


def get_geom():
    return "POLYGON ((30 10, 40 40, 20 40, 10 20, 30 10))"


class PoseFactory(DjangoModelFactory):
    class Meta:
        model = models.Pose
        django_get_or_create = ("timestamp", "entity", "pose_source")

    point = factory.LazyFunction(get_point)
    timestamp = factory.LazyFunction(timezone.now)
    pose_source = factory.SubFactory(PoseSourceFactory)
    entity = factory.SubFactory(EntityFactory)


class UserProfileFactory(DjangoModelFactory):
    class Meta:
        model = models.UserProfile
        django_get_or_create = ("user",)

    user = factory.SubFactory(UserFactory)
    current_role = factory.SubFactory(RoleFactory)


class ImageTypeFactory(DjangoModelFactory):
    class Meta:
        model = models.ImageType
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "image_type_%d" % n)


class ConditionVariableFactory(DjangoModelFactory):
    class Meta:
        model = models.ConditionVariable
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "condition_variable_%d" % n)
    variable = factory.Sequence(lambda n: "condition_variable_variable_%d" % n)


class RequestedDataFactory(DjangoModelFactory):
    class Meta:
        model = models.RequestedData
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "requested_data_%d" % n)
    destination_url = factory.Sequence(lambda n: "destination_url_%d" % n)


class KeyValuePairFactory(DjangoModelFactory):
    class Meta:
        model = models.KeyValuePair

    key = factory.Sequence(lambda n: "key_%d" % n)
    value = factory.Sequence(lambda n: "value_%d" % n)


class TriggerResponseFactory(DjangoModelFactory):
    class Meta:
        model = models.TriggerResponse
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "name_%d" % n)

    @factory.post_generation
    def parameters(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            for parameter in extracted:
                self.parameters.add(parameter)


class OrderedTriggerResponseFactory(DjangoModelFactory):
    class Meta:
        model = models.OrderedTriggerResponse
        django_get_or_create = ("order", "trigger_response")


class TriggerFactory(DjangoModelFactory):
    class Meta:
        model = models.Trigger
        django_get_or_create = ("key",)

    name = factory.Sequence(lambda n: "trigger_%d" % n)
    key = factory.Sequence(lambda n: "trigger_key_%d" % n)

    @factory.post_generation
    def condition_variables(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            for condition_variable in extracted:
                self.condition_variables.add(condition_variable)

    @factory.post_generation
    def requested_dataset(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            for requested_data in extracted:
                self.requested_dataset.add(requested_data)

    @factory.post_generation
    def trigger_responses(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            for response in extracted:
                self.trigger_responses.add(response)


class EventFactory(DjangoModelFactory):
    class Meta:
        model = models.Event

    trial = factory.SubFactory(TrialFactory)
    start_pose = factory.SubFactory(PoseFactory)
    start_datetime = factory.LazyFunction(timezone.now)
    event_type = factory.SubFactory(EventTypeFactory)
    segment = factory.SubFactory(SegmentFactory)
    weather = factory.SubFactory(WeatherFactory)

    # handle many-to-many relationship
    @factory.post_generation
    def entities(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            # A list of server_params was passed in, use them
            for entity in extracted:
                self.entities.add(entity)


class EntityEventRoleFactory(DjangoModelFactory):
    class Meta:
        model = models.EntityEventRole
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "entity_event_role_%d" % n)
    metadata_key = factory.SubFactory("data_collection.factories.factories.MetadataKeyFactory")

    @factory.post_generation
    def valid_event_types(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            for event_type in extracted:
                self.valid_event_types.add(event_type)

    @factory.post_generation
    def valid_entity_types(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            for entity_type in extracted:
                self.valid_entity_types.add(entity_type)

    @factory.post_generation
    def valid_entity_groups(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            for group in extracted:
                self.valid_entity_groups.add(group)


class EntityEventRelationFactory(DjangoModelFactory):
    class Meta:
        model = models.EntityEventRelation

    entity_event_role = factory.SubFactory(EntityEventRoleFactory)
    event = factory.SubFactory(EventFactory)
    entity = factory.SubFactory(EntityFactory)


class EventWithEntityFactory(EventFactory):
    entity_relation = factory.RelatedFactory(
        EntityEventRelationFactory, factory_related_name="event"
    )


class NoteFactory(DjangoModelFactory):
    class Meta:
        model = models.Note

    tester = factory.SubFactory(TesterFactory)
    note = factory.Sequence(lambda n: "note_%d" % n)
    event = factory.SubFactory(EventFactory)


class ClockConfigFactory(DjangoModelFactory):
    class Meta:
        model = models.ClockConfig
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "clock_config_%d" % n)

    # handle many-to-many relationship
    @factory.post_generation
    def phases(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            # A list of clock phases was passed in, use them
            for phase in extracted:
                self.phases.add(phase)


class ClockPhaseFactory(DjangoModelFactory):
    class Meta:
        model = models.ClockPhase


class RegionTypeFactory(DjangoModelFactory):
    class Meta:
        model = models.RegionType
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "region_type_%d" % n)


class RegionFactory(DjangoModelFactory):
    class Meta:
        model = models.Region

    name = factory.Sequence(lambda n: "region_%d" % n)
    region_type = factory.SubFactory(RegionTypeFactory)
    geom = factory.LazyFunction(get_geom)
    key_point = factory.LazyFunction(get_point)
    z_layer = factory.Sequence(lambda n: "%d" % n)

    # handle many-to-many relationship
    @factory.post_generation
    def scenarios(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            # A list of scenarios was passed in, use them
            for scenario in extracted:
                self.scenarios.add(scenario)


class MetadataKeyFactory(DjangoModelFactory):
    class Meta:
        model = models.MetadataKey
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "metadata_key_%d" % n)

    # handle many-to-many relationship
    @factory.post_generation
    def event_type_list(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            # A list of scenarios was passed in, use them
            for event_type in extracted:
                self.event_type_list.add(event_type)

    # handle many-to-many relationship
    @factory.post_generation
    def metadatavalue_set(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            # A list of scenarios was passed in, use them
            for metadatavalue in extracted:
                self.metadatavalue_set.add(metadatavalue)
    

class MetadataValueFactory(DjangoModelFactory):
    class Meta:
        model = models.MetadataValue
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "metadata_value_%d" % n)

    # handle many-to-many relationship
    @factory.post_generation
    def metadata_keys(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            # A list of scenarios was passed in, use them
            for key in extracted:
                self.metadata_keys.add(key)
