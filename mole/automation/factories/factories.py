from automation import models
from data_collection.factories import factories as dcf

import factory
from factory.django import DjangoModelFactory



class ScriptConditionFactory(DjangoModelFactory):
    class Meta:
        model = models.ScriptCondition

class ScriptedEventFactory(DjangoModelFactory):
    event_type = factory.SubFactory(dcf.EventTypeFactory)

    class Meta:
        model = models.ScriptedEvent

    # handle many-to-many relationship
    @factory.post_generation
    def conditions(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            # A list of scenarios was passed in, use them
            for condition in extracted:
                self.conditions.add(condition)
    
class ScriptFactory(DjangoModelFactory):
    class Meta:
        model = models.Script
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "script_%d" % n)

    # handle many-to-many relationship
    @factory.post_generation
    def conditions(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            # A list of scenarios was passed in, use them
            for condition in extracted:
                self.conditions.add(condition)

    # handle many-to-many relationship
    @factory.post_generation
    def initiating_event_types(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            # A list of scenarios was passed in, use them
            for event_type in extracted:
                self.initiating_event_types.add(event_type)


class ScriptRunCountFactory(DjangoModelFactory):
    trial = factory.SubFactory(dcf.TrialFactory)
    script = factory.SubFactory(ScriptFactory)
    
    class Meta:
        model = models.ScriptRunCount