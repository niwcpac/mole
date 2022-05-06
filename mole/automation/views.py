from rest_framework import permissions
from rest_framework import viewsets
import automation.models as amm
import data_collection.models as dcm
import automation.serializers as serializers
from django_filters import rest_framework as filters


class ScriptConditionViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = amm.ScriptCondition.objects.all()
    serializer_class = serializers.ScriptConditionSerializer

class ScriptedEventViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = amm.ScriptedEvent.objects.all()
    serializer_class = serializers.ScriptedEventSerializer

class ScriptViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    queryset = amm.Script.objects.all()
    serializer_class = serializers.ScriptSerializer