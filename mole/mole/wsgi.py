"""
WSGI config for tutorial project.

This module contains the WSGI application used by Django's development server
and any production WSGI deployments. It should expose a module-level variable
named ``application``. Django's ``runserver`` and ``runfcgi`` commands discover
this application via the ``WSGI_APPLICATION`` setting.

Usually you will have the standard Django WSGI application here, but it also
might make sense to replace the whole Django WSGI application with a custom one
that later delegates to the Django one. For example, you could introduce WSGI
middleware here, or combine a Django application with an application of another
framework.

"""
import os
import logging

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mole.settings.settings")

log = logging.getLogger("mole")
logging.basicConfig(level=logging.INFO)

if os.environ.get("DEBUG_DJANGO") == "true":
    import debugpy

    debugpy.listen(("0.0.0.0", 5678))
    log.info(
        " **************** Debugging Django container. Waiting for debugger client to attach..."
    )
    debugpy.wait_for_client()
    log.info(" **************** Debugger client attached. Continuing.")


# This application object is used by any WSGI server configured to use this
# file. This includes Django's development server, if the WSGI_APPLICATION
# setting points here.
from django.core.wsgi import get_wsgi_application
from dj_static import Cling, MediaCling

application = Cling(MediaCling(get_wsgi_application()))

# Apply WSGI middleware here.
# from helloworld.wsgi import HelloWorldApplication
# application = HelloWorldApplication(application)
