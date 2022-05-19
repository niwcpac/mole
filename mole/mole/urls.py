from data_collection import views, routers
from automation import views as auto_views
from django.conf.urls import include
from django.urls import re_path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
import mole.views as viewpath
from django.contrib.auth import views as auth_views
from django.conf import settings
from rest_framework.schemas import get_schema_view
from django.urls import path
from django.views.generic import TemplateView

router = routers.HybridRouter()
router.register(r"users", views.UserViewSet)
router.register(r"user_profiles", views.UserProfileViewSet)
router.register(r"roles", views.RoleViewSet)
router.register(r"testers", views.TesterViewSet)

router.register(r"entity_states", views.EntityStateViewSet)
router.register(r"entity_types", views.EntityTypeViewSet)
router.register(r"entity_event_roles", views.EntityEventRoleViewSet)
router.register(r"entities", views.EntityViewSet)
router.register(r"entity_groups", views.EntityGroupViewSet)
router.register(r"point_styles", views.PointStyleViewSet)

router.register(r"locations", views.LocationViewSet)
router.register(r"campaigns", views.CampaignViewSet)
router.register(r"trials", views.TrialViewSet)

router.register(r"weather", views.WeatherViewSet)
router.register(r"test_condition", views.TestConditionViewSet)
router.register(r"performers", views.PerformerViewSet)
router.register(r"test_methods", views.TestMethodViewSet)
router.register(r"scenarios", views.ScenarioViewSet)
router.register(r"capabilities_under_test", views.CapabilityUnderTestViewSet)
router.register(r"system_configurations", views.SystemConfigurationViewSet)

router.register(r"pose_sources", views.PoseSourceViewSet)
router.register(r"poses", views.PoseViewSet)

router.register(r"queryset_specifications", views.QuerySetSpecificationViewSet)
router.register(r"queryset_methods", views.QuerySetMethodViewSet)
router.register(r"extraction_fields", views.ExtractionFieldViewSet)
router.register(r"extraction_specications", views.ExtractionSpecificationViewSet)
router.register(
    r"iterated_extraction_specications", views.IteratedExtractionSpecificationViewSet
)
router.register(r"data_manipulators", views.DataManipulatorViewSet)
router.register(r"iterated_data_manipulators", views.IteratedDataManipulatorViewSet)
router.register(r"iterators", views.IteratorViewSet)
router.register(r"figure_families", views.FigureFamilyViewSet)
router.register(r"figure_types", views.FigureTypeViewSet)
router.register(r"reports", views.ReportViewSet)

router.register(r"mods", views.ModViewSet)
router.register(r"capabilities", views.CapabilityViewSet)

router.register(r"event_levels", views.EventLevelViewSet)
router.register(r"event_types", views.EventTypeViewSet)
router.register(r"events", views.EventViewSet)
router.register(r"event_data", views.EventDataViewSet, basename="event_data")
router.register(r"entity_data", views.EntityDataViewSet, basename="entity_data")
router.register(r"trial_data", views.TrialDataViewSet, basename="trial_data")
router.register(
    r"entity_groups_data", views.EntityGroupDataViewSet, basename="entity_groups_data"
)

router.register(r"segments", views.SegmentViewSet)
router.register(r"notes", views.NoteViewSet)
router.register(r"image_types", views.ImageTypeViewSet)
router.register(r"image_data", views.ImageDataViewSet, basename="image_data")
router.register(r"images", views.ImageViewSet)

router.register(r"server_types", views.ServerTypeViewSet)
router.register(r"server_params", views.ServerParamViewSet)
router.register(r"servers", views.ServerViewSet)

router.register(r"key_value_pairs", views.KeyValuePairViewSet)
router.register(r"trigger_responses", views.TriggerResponseViewSet)
router.register(r"ordered_trigger_responses", views.OrderedTriggerResponseViewSet)
router.register(r"triggers", views.TriggerViewSet)
router.register(r"condition_variables", views.ConditionVariableViewSet)
router.register(r"requested_data", views.RequestedDataViewSet)
router.register(r"regions", views.RegionViewSet)
router.register(r"region_types", views.RegionTypeViewSet)

router.register(r"clock_configs", views.ClockConfigViewSet)
router.register(r"clock_phases", views.ClockPhaseViewSet)

router.register(r"scripts", auto_views.ScriptViewSet)
router.register(r"scripted_events", auto_views.ScriptedEventViewSet)
router.register(r"script_conditions", auto_views.ScriptConditionViewSet)

router.add_api_view(
    "server_datetime",
    re_path(
        r"server_datetime/$", views.ServerDatetimeView.as_view(), name="server_datetime"
    ),
)

base_urls = [
    re_path(r"^api/", include(router.urls)),
]

urlpatterns = base_urls + [
    re_path(
        "^api/openapi/", 
        get_schema_view(
            title="Mole",
            description="Mole API",
            version="1.0.0",
            patterns=base_urls,
        ), 
        name='openapi-schema',
    ),
    path('api/swagger-ui/', TemplateView.as_view(
        template_name='SwaggerUI_4.11.1/index.html',
        extra_context={'schema_url':'openapi-schema'}
    ), name='swagger-ui'),
    re_path(r"^api/", include(router.urls)),
    re_path(r"^api-auth/", include("rest_framework.urls")),
    re_path(r"api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    re_path(r"api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    re_path(r"^accounts/login/$", auth_views.LoginView.as_view()),
    re_path(r"^accounts/logout/$", auth_views.LogoutView.as_view()),
    re_path(r"^$", viewpath.home),
    re_path(r".*/$", viewpath.home),
]

if settings.PROFILE:
    urlpatterns += [re_path(r"^silk/", include("silk.urls", namespace="silk"))]
