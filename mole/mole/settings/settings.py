# Django settings for tutorial project.
import os
import datetime

from distutils.version import LooseVersion
from django.db import connection

PROFILE = False
if "PROFILE" in os.environ:
    PROFILE = os.environ["PROFILE"] == "true"

DEBUG = False
TEMPLATE_DEBUG = DEBUG

ALLOWED_HOSTS = ["*"]
CORS_ORIGIN_ALLOW_ALL = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

SITE_ROOT = os.path.dirname(os.path.realpath(__file__))
PROJECT_PATH = os.path.abspath(os.path.dirname(__name__))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))


ADMINS = (
    # ('Your Name', 'your_email@example.com'),
)

MANAGERS = ADMINS

POSTGIS_VERSION = (3, 0, 1)


DATABASES = {
    "default": {
        "ENGINE": "django.contrib.gis.db.backends.postgis",  # Or use an alternate database backend.
        "NAME": os.environ["PGDATABASE"],  # Postgres DB name.
        "USER": os.environ["PGUSER"],
        "PASSWORD": os.environ["PGPASSWORD"],
        "HOST": "postgres",  # Set to empty string for localhost.
        "PORT": "5432",  # Set to empty string for default.
    }
}

CACHES = {
    "default": {
        "BACKEND": "redis_cache.RedisCache",
        "LOCATION": "redis://redis:6379/1",
    }
}

SESSION_ENGINE = "django.contrib.sessions.backends.cached_db"
SESSION_CACHE_ALIAS = "default"

TEST_RUNNER = "django.test.runner.DiscoverRunner"

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# In a Windows environment this must be set to your system time zone.
TIME_ZONE = os.environ.get("TIMEZONE", "America/Los_Angeles")

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = "en-us"

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = False

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale.
USE_L10N = True

# If you set this to False, Django will not use timezone-aware datetimes.
USE_TZ = True

# Absolute filesystem path to the directory that will hold user-uploaded files.
# Example: "/home/media/media.lawrence.com/media/"
MEDIA_ROOT = os.path.join(PROJECT_PATH, "media")

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash.
# Examples: "http://media.lawrence.com/media/", "http://example.com/media/"
MEDIA_URL = "/media/"

# Absolute path to the directory static files should be collected to.
# Don't put anything in this directory yourself; store your static files
# in apps' "static/" subdirectories and in STATICFILES_DIRS.
# Example: "/home/media/media.lawrence.com/static/"
STATIC_ROOT = "static_autocollected"

# URL prefix for static files.
# Example: "http://media.lawrence.com/static/"
STATIC_URL = "/static/"

# Additional locations of static files
STATICFILES_DIRS = (
    # Put strings here, like "/home/html/static" or "C:/www/django/static".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    os.path.join(PROJECT_PATH, "static"),
    "/angular_static",
)

# List of finder classes that know how to find static files in
# various locations.
STATICFILES_FINDERS = (
    "django.contrib.staticfiles.finders.FileSystemFinder",
    "django.contrib.staticfiles.finders.AppDirectoriesFinder",
    #    'django.contrib.staticfiles.finders.DefaultStorageFinder',
)

# Make this unique, and don't share it with anybody.
SECRET_KEY = "472hl78gf94h%7^g76IjAakksIfbcHadfLk20Tsms5r0flsl3#49@$&%azdmfkGjDjKELGZO"

MIDDLEWARE = (
    #    'django.middleware.cache.UpdateCacheMiddleware',
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
)

if PROFILE:
    MIDDLEWARE += ("silk.middleware.SilkyMiddleware",)
    SILKY_PYTHON_PROFILER = True
    # Uncomment the line below to enable downloading .prof files for more in depth profiling using tools like snakeviz or other cProfile tools.
    # Note: enabling this setting creates many .prof files in the mole/media directory.
    # SILKY_PYTHON_PROFILER_BINARY = True
    SILKY_META = True

MIDDLEWARE += (
    #    'django.middleware.cache.FetchFromCacheMiddleware',
    # Uncomment the next line for simple clickjacking protection:
    # 'django.middleware.clickjacking.XFrameOptionsMiddleware',
)

ROOT_URLCONF = "mole.urls"

# Python dotted path to the WSGI application used by Django's runserver.
WSGI_APPLICATION = "mole.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [
            # insert your TEMPLATE_DIRS here
            os.path.join(PROJECT_PATH, "templates"),
            os.path.join(PROJECT_PATH, STATIC_ROOT),
        ],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                # Insert your TEMPLATE_CONTEXT_PROCESSORS here or use this
                # list if you haven't customized them:
                "django.contrib.auth.context_processors.auth",
                "django.template.context_processors.debug",
                "django.template.context_processors.i18n",
                "django.template.context_processors.media",
                "django.template.context_processors.static",
                "django.template.context_processors.tz",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

INSTALLED_APPS = (
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "django.contrib.sessions",
    "django.contrib.sites",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Uncomment the next line to enable the admin:
    # 'django.contrib.admin',
    # Uncomment the next line to enable admin documentation:
    # 'django.contrib.admindocs',
    "rest_framework",
    "rest_framework_gis",
    "django_extensions",
    "easy_thumbnails",
    "data_collection",
    "django_filters",
    "corsheaders",
    "automation",
)

if PROFILE:
    INSTALLED_APPS += ("silk",)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {
            "format": "[%(asctime)s] %(levelname)s [%(name)s:%(lineno)s] %(message)s",
            "datefmt": "%d/%b/%Y %H:%M:%S",
        },
    },
    "handlers": {
        "null": {"level": "DEBUG", "class": "logging.NullHandler",},
        "logfile": {
            "level": "DEBUG",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": "_logs/logfile",
            "maxBytes": 50000,
            "backupCount": 2,
            "formatter": "standard",
        },
        "console": {
            "level": "INFO",
            "class": "logging.StreamHandler",
            "formatter": "standard",
        },
    },
    "loggers": {
        "django": {"handlers": ["console"], "propagate": True, "level": "WARN",},
        "django.db.backends": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
        "mole": {"handlers": ["console", "logfile"], "level": "DEBUG",},
    },
}

# CACHE_MIDDLEWARE_ALIAS = "default"
# CACHE_MIDDLEWARE_SECONDS = 3
# CACHE_MIDDLEWARE_KEY_PREFIX = ""

INTERNAL_IPS = ("127.0.0.1",)

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.DjangoModelPermissionsOrAnonReadOnly"
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
        "rest_framework.authentication.BasicAuthentication",
    ],
    #'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.LimitOffsetPagination',
    #'PAGE_SIZE': 100,
    "DEFAULT_FILTER_BACKENDS": ("django_filters.rest_framework.DjangoFilterBackend",),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": datetime.timedelta(seconds=43200),
}

THUMBNAIL_ALIASES = {"": {"thumb": {"size": (64, 64), "crop": True}}}

THUMBNAIL_SUBDIR = "thumbs"

LOGIN_REDIRECT_URL = "/"

DEFAULT_AUTO_FIELD = "django.db.models.AutoField"
