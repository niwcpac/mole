#!/usr/bin/env python

import argparse
import sys
import subprocess
import os
import signal
import glob
import time

try:
    # Python3
    from urllib.request import urlopen
except ImportError:
    # Python2
    from urllib import urlopen
from contextlib import closing
import json

# BACKUP_FLAG is used to handle if/where backup is called so timing and appropriate context string
# can be set.
#    - pre -- Created by Django container prior to init, or by ml prior to load. db_backup service doesn't backup on load.
#    - true -- Created by db_backup service on load. Django container doesn't backup on start.
#    - false -- No backup created on startup / periodically. Still able to backup on demand.
#    - demand -- used by ml script to indicate call is on demand. Similar behavior to 'false'

CONFIGURE_MOLE_PATH = "mole/data_collection/management/commands/"
MAP_TILES_PATH = "maps/maptiles/"


CERT_CONF_DIR = os.path.join(".", "traefik", "configuration")
CA_CONF_FILE = os.path.join(CERT_CONF_DIR, "ca.config")
CERT_EXT_FILE = os.path.join(CERT_CONF_DIR, "cert.ext")
REQ_CONF_FILE = os.path.join(CERT_CONF_DIR, "req.config")

CERT_DIR = os.path.join(".", "traefik", "certificates")
CA_KEY_FILE = os.path.join(CERT_DIR, "moleCA.key")
CA_CERT_FILE = os.path.join(CERT_DIR, "moleCA.pem")
SERVER_CSR_FILE = os.path.join(CERT_DIR, "mole.csr")
SERVER_KEY_FILE = os.path.join(CERT_DIR, "mole.key")
SERVER_CERT_FILE = os.path.join(CERT_DIR, "mole.crt")

SERVICES = {
    "proxy",
    "postgres",
    "redis",
    "django",
    "docs",
    "maptiles",
    "report",
    "portainer",
    "db_backup",
    "angular",
    "event_generator",
    "pulsar",
}


def terminate_mole(mole_subprocess, db_backup=True):
    """
    CTRL-C to docker-compose allows for consecutive SIGTERMS to attempt a graceful stop
    followed by killing.  This function is to maintain that construct.
    """
    try:
        if db_backup:
            print("\n\nStop requested. Backing up database.")
            backup_db(name_string="shutdown&sync=true")
        print("\n")
        mole_subprocess.send_signal(signal.SIGTERM)
        mole_subprocess.wait()
    except KeyboardInterrupt:
        mole_subprocess.send_signal(signal.SIGTERM)
        mole_subprocess.wait()


def build_angular():
    # Tell the angular container to build the angular static files and remove the container afterward
    print("Building angular static files ...")
    FNULL = open(os.devnull, "w")
    subprocess.call(
        [
            "docker-compose",
            "run",
            "--rm",
            "--entrypoint",
            "ng",
            "angular",
            "build",
            "--configuration",
            "production",
            "--base-href",
            "static/"
        ]
    )
    print("Angular container finished building files")


def init(
    configure_script,
    build_only,
    skip_static_build=False,
    angular=False,
    quiet=False,
    nomaps=False,
    lite=False,
    profile=False,
    db_backup=False,
    pre_init_backup=True,
    unlock_redis=False,
    make_migrations=False,
    debug=False,
):

    if debug:
        DEBUG_DJANGO = "true"
    else:
        DEBUG_DJANGO = "false"

    # Generate https keys/certs if they don't exist
    if not os.path.isfile(CA_KEY_FILE):
        keys()

    if build_only:
        print("Building container images...\n")
        cmd = [
            "docker-compose",
            "-f",
            "docker-compose.yml",
            "-f",
            "docker-compose-e2e.yml",
            "build",
        ]

        env = {
            "PATH": str(os.getenv("PATH")),
            "NEWUSERID": str(os.getuid()),
            "BUILD_TAG": short_hash,
            "LONG_BUILD_TAG": long_hash,
        }
        p = subprocess.call(cmd, env=env)
        return

    if pre_init_backup:
        print("Backing up the database...")
        standalone_backup("pre-init&sync=true")


    print("Clearing containers and volumes...\n")
    cmd = [
        "docker-compose",
        "down",
        "--volumes",
        "--remove-orphans",
    ]
    p = subprocess.call(cmd)
    print("Containers and volumes deleted...\n")

    try:
        short_hash = subprocess.check_output(["git", "rev-parse", "--short", "HEAD"])
        long_hash = subprocess.check_output(["git", "rev-parse", "HEAD"])
    except subprocess.CalledProcessError as e:
        print("Error retrieving git hash, defaulting to 'latest'")
        print(e)
        short_hash = "latest"
        long_hash = "latest"
    short_hash = short_hash.strip()
    long_hash = long_hash.strip()

    # Verify configure_script exists
    print("Building containers and initializing Mole...")
    configure_script_file = os.path.join(
        CONFIGURE_MOLE_PATH, "{}.py".format(configure_script)
    )
    if not os.path.isfile(configure_script_file):

        available_scripts = glob.glob(CONFIGURE_MOLE_PATH + "[!_]*.py")
        available_scripts = [os.path.splitext(x)[0] for x in available_scripts]
        available_scripts = [os.path.basename(x) for x in available_scripts]

        print('ERROR: configuration script "{}" not found.\n'.format(configure_script))
        print(
            "The available scripts are:\n   {}".format("\n   ".join(available_scripts))
        )
        return

    prompt = """
    WARNING: You have requested to initialize Mole.
    This will permanently overwrite your current database. Do you wish to proceed?

    Do you wish to continue? [y/N]: """

    sys.stdout.write(prompt)
    if sys.version_info.major == 3:
        choice = input().lower()
    else:
        choice = raw_input().lower()

    yes = ("yes", "y", "ye")
    if choice in yes:
        cmd = [
            "docker-compose",
            "up",
            "--build",
            "--force-recreate",
            "--always-recreate-deps",
        ]
        if os.environ.get("UNLOCK_REDIS") or unlock_redis:
            cmd = [
                "docker-compose",
                "-f",
                "docker-compose.yml",
                "-f",
                "docker-compose-unlocked-redis.yml",
                "up",
                "--build",
                "--force-recreate",
                "--always-recreate-deps",
            ]
        # Don't run portainer if "lite" flag is set
        if lite:
            SERVICES.discard("portainer")
            SERVICES.discard("docs")
            SERVICES.discard("event_generator")
            SERVICES.discard("zookeeper1")
            SERVICES.discard("zookeeper2")
            SERVICES.discard("zookeeper3")
            SERVICES.discard("bookkeeper1")
            SERVICES.discard("bookkeeper2")
            SERVICES.discard("bookkeeper3")
            SERVICES.discard("pulsar")
            SERVICES.discard("pulsar_proxy")
        if not db_backup:
            SERVICES.discard("db_backup")
        if not angular or skip_static_build:
            SERVICES.discard("angular")

        if make_migrations:
            MAKE_MIGRATIONS_FLAG = "true"
        else:
            MAKE_MIGRATIONS_FLAG = "false"

        # Don't run map tile server if there are no tile sets available
        available_mbtiles = glob.glob(MAP_TILES_PATH + "*.mbtiles")

        if not available_mbtiles:
            print(
                "No .mbtiles tile sets available.  Not starting maptiles service.  See Mole docs for more information."
            )
            nomaps = True

        if nomaps:
            SERVICES.discard("maptiles")

        env = {
            "PROFILE": str(profile).lower(),
            "MAKE_MIGRATIONS": MAKE_MIGRATIONS_FLAG,
            "POPULATE_DB": configure_script,
            "NEWUSERID": str(os.getuid()),
            "DEBUG_DJANGO": DEBUG_DJANGO,
            "PATH": str(os.getenv("PATH")),
            "BUILD_TAG": short_hash,
            "LONG_BUILD_TAG": long_hash,
        }

        if not skip_static_build:
            build_angular()
        else:
            print("Skipping static build...")

        clear_images_cmd = ["find", "mole/media/images/", "-type", "f", "-not", "-name", "README", "-delete"]
        subprocess.call(clear_images_cmd)

        cmd.extend(SERVICES)
        p = subprocess.Popen(cmd, preexec_fn=os.setpgrp, env=env)

        try:
            return p.wait()
        except KeyboardInterrupt:
            terminate_mole(p, db_backup)

    else:
        print("\n    Exiting...")
        return


def run(
    quiet=False,
    nomaps=False,
    lite=False,
    profile=False,
    db_backup=False,
    unlock_redis=False,
    angular=False,
    debug=False,
):
    # Need recreate on so new environment variable get set. (BACKUP_FLAG, etc.)
    cmd = ["docker-compose", "up"]
    if os.environ.get("UNLOCK_REDIS") or unlock_redis:
        cmd =  ["docker-compose", "-f", "docker-compose.yml", "-f", "docker-compose-unlocked-redis.yml", "up"]
    if quiet:
        cmd.append("-d")

    # Don't run non-essential services if "lite" flag is set
    if lite:
        SERVICES.discard("portainer")
        SERVICES.discard("docs")
        SERVICES.discard("event_generator")
        SERVICES.discard("zookeeper1")
        SERVICES.discard("zookeeper2")
        SERVICES.discard("zookeeper3")
        SERVICES.discard("bookkeeper1")
        SERVICES.discard("bookkeeper2")
        SERVICES.discard("bookkeeper3")
        SERVICES.discard("pulsar")
        SERVICES.discard("pulsar_proxy")

    if not db_backup:
        SERVICES.discard("db_backup")

    if not angular:
        SERVICES.discard("angular")

    # Don't run map tile server if there are no tile sets available
    available_mbtiles = glob.glob(MAP_TILES_PATH + "*.mbtiles")

    if not available_mbtiles:
        print(
            "No .mbtiles tile sets available.  Not starting maptiles service.  See Mole docs for more information."
        )
        nomaps = True

    if nomaps:
        SERVICES.discard("maptiles")

    cmd.extend(SERVICES)

    if db_backup:
        BACKUP_FLAG = "true"
    else:
        BACKUP_FLAG = "false"

    if debug:
        DEBUG_DJANGO = "true"
    else:
        DEBUG_DJANGO = "false"

    env = {
        "PROFILE": str(profile).lower(),
        "BACKUP_FLAG": BACKUP_FLAG,
        "POPULATE_DB": "false",
        "DEBUG_DJANGO": DEBUG_DJANGO,
        "PATH": str(os.getenv("PATH")),
    }

    p = subprocess.Popen(cmd, preexec_fn=os.setpgrp, env=env)

    try:
        return p.wait()
    except KeyboardInterrupt:
        terminate_mole(p, db_backup)


def stop():
    print("Stop requested. Backing up database.")
    backup_db(name_string="ml_stop")
    cmd = ["docker-compose", "stop"]
    subprocess.call(cmd)


def test(dropdb=False, integration=False):

    if dropdb:
        cmd = ["docker-compose", "-f", "compose_init_db.yml", "up", "-d", "postgres"]
        subprocess.call(cmd)

        cmd = [
            "docker-compose",
            "exec",
            "postgres",
            "dropdb",
            "--username=mole_user",
            "test_mole",
        ]
        subprocess.call(cmd)
        return

    if integration:
        standalone_backup()

        cmd = [
            "docker-compose",
            "-f",
            "docker-compose-e2e.yml",
            "-f",
            "docker-compose.yml",
            "up",
            "--force-recreate",
            "--renew-anon-volumes",
            "--abort-on-container-exit",
            "--exit-code-from",
            "django",
        ]

        env = {
            "PROFILE": "false",
            "BACKUP_FLAG": "false",
            "MAKE_MIGRATIONS": "false",
            "POPULATE_DB": "integration_test",
            "NEWUSERID": str(os.getuid()),
            "DEBUG_DJANGO": "false",
            "PATH": str(os.getenv("PATH")),
        }
        p = subprocess.Popen(cmd, preexec_fn=os.setpgrp, env=env)
        try:
            return p.wait()
        except KeyboardInterrupt:
            terminate_mole(p, False)

    cmd = [
        "docker-compose",
        "-f",
        "docker-compose-tests.yml",
        "up",
    ]
    p = subprocess.Popen(cmd, preexec_fn=os.setpgrp)

    try:
        return p.wait()
    except KeyboardInterrupt:
        terminate_mole(p, False)


def service_is_running(service_name, id=False):
    running = False

    cmd = ["docker-compose", "ps", "-q", service_name]
    container_id = subprocess.check_output(cmd)

    if container_id:
        # Returns empty string if not running
        cmd = ["docker", "ps", "-q", "--no-trunc"]
        docker_ps = subprocess.check_output(cmd)
        running = container_id in docker_ps

    if id:
        return bool(running), container_id.rstrip().decode()
    return bool(running)


def standalone_backup(name_string="on_demand&sync=true"):
    """
    docker-compose up -d postgres
    """
    postgres_running = service_is_running("postgres")
    db_backup_running = service_is_running("db_backup")

    if not (postgres_running and db_backup_running):
        # BACKUP_FLAG == "demand" so db_backup container skips backup on startup if not running.
        env = {
            "BACKUP_FLAG": "demand",
            "POPULATE_DB": "false",
            "NEWUSERID": str(os.getuid()),
            "PATH": str(os.getenv("PATH")),
        }
        print("Starting necessary services...")
        cmd = ["docker-compose", "up", "-d", "postgres", "db_backup"]
        subprocess.call(cmd, env=env)
    else:
        print("Necessary services already running.")

    response = backup_db(name_string=name_string)

    if response["status"] == 200:
        filename = json.loads(response["body"])["backup_filename"]
        print("Backup file created: {}".format(filename))
    elif response["status"] == 429:
        print("Backup request throttled. Try again later.")
    else:
        print("Error creating backup.")

    print("Stopping previously stopped services...")

    # Stop postgres if it wasn't running already
    if not postgres_running:
        cmd = ["docker-compose", "stop", "postgres"]
        subprocess.call(cmd, env=env)

    # Stop db_backup if it wasn't running already
    if not db_backup_running:
        cmd = ["docker-compose", "stop", "db_backup"]
        subprocess.call(cmd, env=env)


def backup_db(name_string=""):
    """
    Backup the postgres db.
    """
    url = "http://localhost:8003/backup_db/"
    if name_string:
        url += "?context={}".format(name_string)
    # retry 3 times in case db_backup service isn't ready yet
    for i in range(3):
        try:
            # Use closing since Python 2 urlopen doesn't have context handler necessary for with...as statement
            with closing(urlopen(url)) as response:
                status = response.getcode()
                body = response.read()
                return {"status": status, "body": body}
        except IOError:
            print("Backup service unavailable. Retrying...")
            time.sleep(1.0)

    return {
        "status": None,
        "body": "Failed to connect to backup service. No backup created.",
    }


def get_project_config():
    project_info = []
    docker_compose = ["docker-compose", "images"]
    awk = ["awk", "NR>2"]
    project_images = subprocess.Popen(
        docker_compose,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    cleaned_project_images = subprocess.Popen(
        awk, stdin=project_images.stdout, stdout=subprocess.PIPE
    )
    if sys.version_info.major == 3:
        output, err = cleaned_project_images.communicate(
            "Grabbing the project images".encode()
        )
        output = output.decode()
    else:
        output, err = cleaned_project_images.communicate(b"Grabbing the project images")
    print("\ncontents of project:")
    print(output)
    img_data = output.split("\n")
    for img_info in img_data:
        if img_info:
            container = {}
            container_info = img_info.split()
            container["name"] = container_info[0]
            container["repository"] = container_info[1]
            container["tag"] = container_info[2]
            container["img_id"] = container_info[3]
            project_info.append(container)
    return project_info


def export_project_containers():
    project_info = get_project_config()
    containers_file = open("project_containers.txt", "w")
    for instance in project_info:
        print("Exporting container %s" % (instance["name"]))
        containers_file.write(instance["name"] + "\n")
        cmd = [
            "docker",
            "export",
            "--output=%s.tar" % (instance["name"]),
            instance["name"],
        ]
        subprocess.call(cmd)
    containers_file.close()


def import_project_containers():
    project_containers = open("project_containers.txt", "r").readlines()
    for container in project_containers:
        print("importing %s" % (container))
        cmd = ["docker", "import", container + ".tar"]
        subprocess.call(cmd)


def delete_project_config():
    project_info = get_project_config()
    for instance in project_info:
        print("Deleting container: %s" % (instance["name"]))
        cmd = ["docker", "rm", instance["name"]]
        print("Deleting image: %s" % (instance["repository"]))
        subprocess.call(cmd)
        cmd = ["docker", "image", "rm", instance["img_id"]]
        subprocess.call(cmd)
        print("DELETING Volumes")
    cmd = ["docker", "volume", "prune"]
    subprocess.call(cmd)


def save_project_images(target, repos):
    project_config = get_project_config()
    img_save_cmd = ["docker", "save", "-o", "%s.tar" % (target)]
    for instance in project_config:
        repository = instance["repository"]
        tag = instance["tag"]
        if len(repos) > 0:
            if repository in repos:
                print("Adding %s to repository." % (repository))
                command_txt = repository + ":" + tag
                img_save_cmd.append(command_txt)
                repos.remove(repository)
        else:
            print("Adding %s:%s to archive" % (repository, tag))
            command_txt = repository + ":" + tag
            img_save_cmd.append(command_txt)
    if len(repos) > 0:
        for name in repos:
            print("Error!!! Image %s NOT FOUND! Could not add to archive" % (name))

    print("Creating Project Repository Tarball")
    subprocess.call(img_save_cmd)

    print("Compressing Tarball")
    compress_tarball_cmd = ["gzip", "%s.tar" % (target)]
    subprocess.call(compress_tarball_cmd)


def manage(
    target,
    load="mole_project",
    save=False,
    imp=False,
    exp=False,
):
    if load:
        yes = ("yes", "y", "ye")
        prompt = """
        WARNING: You have requested to load images for Mole.
        This will permanently delete all current docker images for the project.

        Would you like to backup the current images? [y/N]: """

        sys.stdout.write(prompt)
        if sys.version_info.major == 3:
            choice = input().lower()
        else:
            choice = raw_input().lower()

        if choice in yes:
            save_project_images("mole_project_backup", [])

        delete_project_config()
        load_cmd = ["docker", "load", "-i", load]
        print("Loading images from: %s" % load)
        subprocess.call(load_cmd)
    if save != None:
        save_project_images(target[0], save)
    if imp != None:
        import_project_containers()
    if exp != None:
        export_project_containers()


def db(backup=False, load=False):
    if backup:
        standalone_backup()
    if load:
        postgres_running, pg_container_id = service_is_running("postgres", id=True)
        db_backup_running = service_is_running("db_backup")

        if not postgres_running:
            cmd = ["docker-compose", "up", "-d", "postgres"]
            subprocess.call(cmd)
            _, pg_container_id = service_is_running("postgres", id=True)

        # BACKUP_FLAG="pre" so db_backup service doesn't backup on start. Backup called below.
        env = {
            "BACKUP_FLAG": "pre",
            "PATH": str(os.getenv("PATH")),
        }
        if not db_backup_running:
            cmd = ["docker-compose", "up", "-d", "db_backup"]
            subprocess.call(cmd, env=env)

        backup_db(name_string="pre_load&sync=true")
        
        perform_backup = True
        is_archive = False

        file_path = load[0]

        # parse file name
        file_path_split = file_path.split("/")
        if file_path.endswith(".tar.gz"):
            file_name = file_path_split[-1][:-7]
            is_archive = True
        elif file_path.endswith(".sql"):
            file_name = file_path_split[-1][:-4]
        else:
            file_name = file_path_split[-1]

        # check if valid backup file & update file paths
        if file_path[0] == "/": # check if the file path is explicit

            # if not a valid file path, don't try to load it
            if not os.path.isfile(file_path): 
                print("Not a valid file path.")
                perform_backup = False

            else: # file path is verified
                # if not an archive, only need to copy sql to postgres 
                # (archives are extracted by default later, no need to copy here)
                if not is_archive: 
                    # copy sql to backups directory
                    cmd = [ "cp", file_path, "db_backup/backups/%s.sql" % (file_name) ]
                    subprocess.call(cmd, env=env)

        else: # only database name was provided, construct file path and validate
            file_path = "db_backup/backups/%s.tar.gz" % (file_name)
            is_archive = True
            if not os.path.isfile(file_path): # test if it's an archive
                file_path = "db_backup/backups/%s.sql" % (file_name)
                is_archive = False

                if not os.path.isfile(file_path): # test if it's sql
                    print("Not a valid file path.")
                    perform_backup = False


        # Drop old DB & perform backup
        if perform_backup:
            if is_archive:

                # make directory to extract zip archive into
                backup_dir_path = "db_backup/backups/%s" % (file_name)
                cmd = [ "mkdir", "-p", backup_dir_path ]
                subprocess.call(cmd, env=env)

                # unzip the archive
                cmd = [ "tar", "-zxvf", "%s" % file_path, "-C", backup_dir_path ]
                subprocess.call(cmd, env=env)

                # Copy images over
                cmd = ["rsync", "-a", "--delete", "%s/mole_media/images/" % (backup_dir_path), "mole/media/images"]
                subprocess.call(cmd, env=env)

                # it's assumed the sql has the same name as the archive name
                postgres_sql_path = "/backups/%s/%s.sql" % (file_name, file_name)

                # handle case where the sql in archive doesn't match the name of the archive
                if not os.path.isfile("db_backup/backups/%s/%s.sql" % (file_name, file_name)):
                    sql_glob = glob.glob("db_backup/backups/%s/*.sql" % (file_name))

                    if len(sql_glob) >= 1:
                        sql_path = sql_glob[0] # take first sql file found
                        sql_path_split = sql_path.split("/")
                        sql_name = sql_path_split[len(sql_path_split)-1][:-4]
                        postgres_sql_path = "/backups/%s/%s.sql" % (file_name, sql_name)

                    else: # uh oh..
                        print("No sql backup found in archive!")
                        postgres_sql_path = None

            else: # no archive, sql should be directly under backups
                postgres_sql_path = "/backups/%s.sql" % (file_name)

            if postgres_sql_path:
                # Force disconnect of active connections
                cmd = [
                    "docker-compose",
                    "exec",
                    "postgres",
                    "psql",
                    "-U",
                    "mole_user",
                    "-d",
                    "postgres",
                    "-c",
                    "SELECT pg_terminate_backend(pg_stat_activity.pid) \
                    FROM pg_stat_activity \
                    WHERE pg_stat_activity.datname = 'mole';",
                ]
                subprocess.call(cmd, env=env)

                print("Dropping db: mole")
                cmd = (
                    'docker exec -it %s psql -U mole_user -d postgres -c "DROP DATABASE mole;"'
                    % (pg_container_id)
                )
                subprocess.call(cmd, shell=True)

                print("Loading backup from %s" % (postgres_sql_path))
                cmd = [ "docker-compose", "exec", "postgres", "psql", "--quiet", "-U", "mole_user", "-d", "postgres", "-f", postgres_sql_path ]
                subprocess.call(cmd, env=env)


        # Stop services that were not previously running.
        if not postgres_running:
            cmd = ["docker-compose", "stop", "postgres"]
            subprocess.call(cmd, env=env)

        if not db_backup_running:
            cmd = ["docker-compose", "stop", "db_backup"]
            subprocess.call(cmd, env=env)


def django(make_migrations=False):
    if make_migrations:
        django_running, dj_container_id = service_is_running("django", id=True)

        if django_running:
            print("Django running, attempting to make migrations.")
            cmd = "docker exec -it %s ./manage.py makemigrations" % (dj_container_id)
            subprocess.call(cmd, shell=True)


def docs(serve=True, schema=False, graph_models=False):
    db_backup = False
    cmd = []

    if schema or graph_models:
        if schema and graph_models:
            msg = "Generating OpenAPI schema and graphing models. Waiting for Django service..."
        elif schema:
            msg = "Generating OpenAPI schema. Waiting for Django service..."
        elif graph_models:
            msg = "Graphing models. Waiting for Django servoce..."
        print(msg)

        url = "http://mole.localhost:8000/api/"

        cmd = [
            "docker-compose",
            "-f",
            "docker-compose.yml",
            "-f",
            "docker-compose-docs-livereload-override.yml",
            "up",
            "django",
        ]
        subprocess.Popen(cmd, preexec_fn=os.setpgrp)

        num_tries = 15
        # retry num_tries for Django service to be ready
        for i in range(num_tries + 1):
            try:
                # Use closing since Python 2 urlopen doesn't have context handler necessary for with...as statement
                with closing(urlopen(url)) as response:
                    status = response.getcode()
                    body = response.read()

                    if schema:
                        cmd = [
                            "docker-compose",
                            "exec",
                            "django",
                            "python",
                            "manage.py",
                            "generateschema",
                            "--file",
                            "openapi_schema.yml",
                        ]
                        p1 = subprocess.call(cmd)

                        print("\nOpenAPI Schema generated: mole/openapi_schema.yml\n")
                    if graph_models:
                        cmd = [
                            "docker-compose",
                            "exec",
                            "django",
                            "python",
                            "manage.py",
                            "graph_models",
                            "-a",
                            "-g",
                            "-o",
                            "mole_models_graph.png",
                        ]
                        p1 = subprocess.call(cmd)

                        print("\nModels graphed: mole/mole_models_graph.png\n")

                    print("Stopping Django service...")
                    cmd = ["docker-compose", "stop", "django"]
                    subprocess.call(cmd)
                    break

            except IOError:
                time.sleep(1.0)

        if i == num_tries:
            print(
                "Schema Generation Error: Django service failed to start. Unable to generate OpenAPI schema."
            )

    if serve:
        print("Serving documentation at http://localhost:8001.")
        print("Note: Only limited Mole services are running in this mode.\n")

        cmd = [
            "docker-compose",
            "-f",
            "docker-compose.yml",
            "-f",
            "docker-compose-docs-livereload-override.yml",
            "up",
            "docs",
            "proxy",
        ]

        p = subprocess.Popen(cmd, preexec_fn=os.setpgrp)

        try:
            return p.wait()

        except KeyboardInterrupt:
            terminate_mole(p, db_backup)

    else:
        print(
            "Building documentation. Other Mole services are not running in this mode."
        )
        # override default "mkdocs serve" entrypoint
        cmd = ["docker-compose", "run", "--entrypoint", '""', "docs", "mkdocs", "build"]

        try:
            subprocess.call(cmd)
        except KeyboardInterrupt:
            stop()


def maps():
    cmd = ["docker-compose", "up", "maptiles"]
    try:
        subprocess.call(cmd)
    except KeyboardInterrupt:
        stop()


def ang(build=False):
    try:
        if build:
            # check if django service running, start before angular build to ensure it
            # is up before attempting to collect static
            django_running = service_is_running("django")
            if not django_running:
                print("Django service not running, starting Django...")
                subprocess.call(["docker-compose", "up", "-d", "django"])
            
            # build angular files
            build_angular()

            # collect static
            print("Collecting front-end static files...")
            subprocess.call([
                "docker-compose", 
                "exec",
                "django",
                "./manage.py",
                "collectstatic",
                "--no-input"
            ])

            # if django wasn't originally running, stop django
            if not django_running:
                subprocess.call(
                    ["docker-compose", "stop", "django", "postgres", "redis"]
                )
                
        else:
            print("Spinning up angular development container ...")
            subprocess.call(["docker-compose", "up", "angular"])

    except KeyboardInterrupt:
        print("Stopping angular development container ...")


def keys(skip_server=False, skip_ca=False):
    if os.path.isfile(CA_KEY_FILE):
        yes = ("yes", "y", "ye")
        prompt = """
        WARNING: You have requested to generate new certificates for serving
        via https. The old certificates and keys will be replaced.

        Do you wish to continue, replacing any existing https certificates/keys? [y/N]: """

        sys.stdout.write(prompt)
        if sys.version_info.major == 3:
            choice = input().lower()
        else:
            choice = raw_input().lower()

        if choice not in yes:
            return

        print("\n")

    if not skip_ca:
        if os.path.isfile(CA_KEY_FILE):
            print("Backing up certificate authority certificates...")
            os.rename(CA_KEY_FILE, CA_KEY_FILE + ".bak")
        if os.path.isfile(CA_CERT_FILE):
            os.rename(CA_CERT_FILE, CA_CERT_FILE + ".bak")
    if not skip_server:
        if os.path.isfile(SERVER_KEY_FILE):
            print("Backing up server certificates...")
            os.rename(SERVER_KEY_FILE, SERVER_KEY_FILE + ".bak")
        if os.path.isfile(SERVER_CERT_FILE):
            os.rename(SERVER_CERT_FILE, SERVER_CERT_FILE + ".bak")
        if os.path.isfile(SERVER_CSR_FILE):
            os.rename(SERVER_CSR_FILE, SERVER_CSR_FILE + ".bak")

    if not skip_ca:
        print("Generating certificate authority certificates...")

        cmd = [
            "openssl",
            "req",
            "-new",
            "-x509",
            "-newkey",
            "rsa:2048",
            "-sha256",
            "-nodes",
            "-keyout",
            CA_KEY_FILE,
            "-days",
            "3650",
            "-out",
            CA_CERT_FILE,
            "-config",
            CA_CONF_FILE,
        ]
        try:
            subprocess.call(
                cmd, stderr=open(os.devnull, "wb"), stdout=open(os.devnull, "wb")
            )
        except OSError:
            raise OSError(
                "Unable to generate https certificates. Do you have openssl installed?"
            )

    if not skip_server:
        print("Generating server certificates...")

        cmd = ["openssl", "genrsa", "-out", SERVER_KEY_FILE, "2048"]
        try:
            subprocess.call(
                cmd, stderr=open(os.devnull, "wb"), stdout=open(os.devnull, "wb")
            )
        except OSError:
            raise OSError(
                "Unable to generate https certificates. Do you have openssl installed?"
            )

        cmd = [
            "openssl",
            "req",
            "-new",
            "-key",
            SERVER_KEY_FILE,
            "-out",
            SERVER_CSR_FILE,
            "-config",
            REQ_CONF_FILE,
        ]
        try:
            subprocess.call(
                cmd, stderr=open(os.devnull, "wb"), stdout=open(os.devnull, "wb")
            )
        except OSError:
            raise OSError(
                "Unable to generate https certificates. Do you have openssl installed?"
            )

        cmd = [
            "openssl",
            "x509",
            "-req",
            "-in",
            SERVER_CSR_FILE,
            "-CA",
            CA_CERT_FILE,
            "-CAkey",
            CA_KEY_FILE,
            "-CAcreateserial",
            "-out",
            SERVER_CERT_FILE,
            "-days",
            "3650",
            "-sha256",
            "-extfile",
            CERT_EXT_FILE,
        ]
        try:
            subprocess.call(
                cmd, stderr=open(os.devnull, "wb"), stdout=open(os.devnull, "wb")
            )
        except OSError:
            raise OSError(
                "Unable to generate https certificates. Do you have openssl installed?"
            )

            
def report():
    cmd = ["docker-compose", "up", "report"]
    try:
        subprocess.call(cmd)
    except KeyboardInterrupt:
        stop()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()

    subparsers = parser.add_subparsers(dest="subparser")

    init_help = """
    Create the Docker containers and initialize a database
    based on the available configuration scripts.
    If no CONFIGURE_SCRIPT is specified, "configure_mole" is used.
    """

    # INIT
    init_parser = subparsers.add_parser("init", description=init_help)

    init_parser.add_argument("configure_script", nargs="?", default="configure_mole")

    init_parser.add_argument(
        "-b",
        "--build-only",
        help="Only build container images. Do not configure Mole database.",
        action="store_true",
    )

    init_parser.add_argument(
        "--profile",
        help="Run Mole with Silk profiler available at /silk/.",
        action="store_true",
    )

    init_parser.add_argument(
        "--nomaps", help="Do not run maps service along with Mole.", action="store_true"
    )

    init_parser.add_argument(
        "--lite",
        help="Do not run non-essential services (portainer, docs, proxy).",
        action="store_true",
    )

    init_parser.add_argument(
        "-d",
        "--debug",
        help="Debug the Django container",
        action="store_true",
        dest="debug",
    )

    init_parser.add_argument(
        "-db",
        "--db_backup",
        help="Backup database automatically.",
        action="store_true",
    )

    init_parser.add_argument(
        "-nb",
        "--pre_init_backup",
        help="Do not backup the database prior to init.",
        action="store_false",
    )

    init_parser.add_argument(
        "-mm",
        "--make_migrations",
        help="Make Django migrations.",
        action="store_true",
        dest="make_migrations",
    )

    init_parser.add_argument(
        "-s",
        "--skip_static_build",
        help="Skip the angular build process.",
        action="store_true",
    )

    init_parser.add_argument(
        "-a",
        "--angular",
        help="Start the angular development server on port 4200.",
        action="store_true",
    )

    init_parser.add_argument(
        "--unlock-redis",
        help="Expose the port for Redis, allowing external access to the Redis server",
        action="store_true",
        dest="unlock_redis",
    )

    # RUN
    run_parser = subparsers.add_parser(
        "run", description="Run Mole services. Note: use -q to run as daemon."
    )

    run_parser.add_argument(
        "-q",
        "--quiet",
        help="Run pre-configured containers in daemon mode.",
        action="store_true",
    )

    run_parser.add_argument(
        "--nomaps", help="Do not run maps service along with Mole.", action="store_true"
    )

    run_parser.add_argument(
        "--profile",
        help="Run Mole with Silk profiler available at /silk/.",
        action="store_true",
    )

    run_parser.add_argument(
        "--lite",
        help="Do not run non-essential services (portainer, docs, proxy).",
        action="store_true",
    )

    run_parser.add_argument(
        "-a",
        "--angular",
        help="Start angular development server on port 4200.",
        action="store_true",
    )

    run_parser.add_argument(
        "-d",
        "--debug",
        help="Debug the Django container",
        action="store_true",
        dest="debug",
    )

    run_parser.add_argument(
        "-db",
        "--db_backup",
        help="Backup database automatically.",
        action="store_true",
    )

    run_parser.add_argument(
        "--unlock-redis",
        help="Expose the port for Redis, allowing external access to the Redis server",
        action="store_true",
        dest="unlock_redis",
    )

    # STOP
    stop_parser = subparsers.add_parser("stop", description="Stop all containers.")

    # TEST
    test_parser = subparsers.add_parser(
        "test",
        description="Run the Django unit tests. Note: Mole does not run when this flag is set.",
    )

    test_parser.add_argument(
        "--integration",
        help="Run integration tests with event generator.",
        action="store_true",
    )

    test_parser.add_argument(
        "--dropdb",
        help="Drop the test database.  Should only need to use if tests fail because test_mole database already exists.",
        action="store_true",
    )

    # DOCS
    docs_parser = subparsers.add_parser(
        "docs", description="Build and serve documentation at http://localhost:8001"
    )

    docs_parser.add_argument(
        "-b",
        "--build_only",
        help="Build only. Do not serve documentation.",
        action="store_false",
        dest="serve",
    )

    ## Schema generation is currently broken. Once it is fixed, this will be enabled.
    # docs_parser.add_argument(
    #     "-s",
    #     "--generate-schema",
    #     help="Generate an OpenAPI Schema.",
    #     action="store_true",
    #     dest="schema",
    # )

    docs_parser.add_argument(
        "-g",
        "--graph-models",
        help="Graph database models.",
        action="store_true",
        dest="graph_models",
    )

    # MAPS
    docs_parser = subparsers.add_parser(
        "maps",
        description="Serve map tiles at http://localhost:8081.  Note: Mole does not run with this sub-command.  See Docs for more information.",
    )

    # ANGULAR
    angular_parser = subparsers.add_parser(
        "ang", description="Start angular development server at http://localhost:4200."
    )

    angular_parser.add_argument(
        "-b",
        "--build",
        help="Build the angular files and store in django container",
        action="store_true",
    )

    # REPORT GENERATOR
    report_parser = subparsers.add_parser(
        "report",
        description="Serve report generator at http://localhost:8400.  Note: Mole does not run with this sub-command.  See Docs for more information.",
    )

    # Database
    database_parser = subparsers.add_parser("db", description="Manage dababase")

    database_parser.add_argument(
        "-b",
        "--backup",
        help="backup the database hosted in the postgres container",
        action="store_true",
    )

    database_parser.add_argument(
        "-l", "--load", nargs=1, type=str, help="Load a database into postgres"
    )

    # DJANGO
    django_parser = subparsers.add_parser("django", description="Manage Django.")

    django_parser.add_argument(
        "-mm",
        "--make_migrations",
        help="Make Django migrations. If there are migrations to be made, they will be saved in mole/data_collection/migrations",
        action="store_true",
    )

    # load/save image
    management_parser = subparsers.add_parser(
        "manage",
        description="Manage container builds. Load, Store, Save, Containers/images",
    )

    management_parser.add_argument(
        "-s",
        "--save",
        nargs="*",
        help="Save docker image/images to tarball onto host machine.",
    )

    management_parser.add_argument(
        "-t",
        "--target",
        nargs=1,
        type=str,
        default=["mole_project"],
        help="Specify name for your archive.",
    )

    management_parser.add_argument(
        "-l",
        "--load",
        nargs="?",
        type=str,
        const="mole_project.tar.gz",
        help="Load an archived images into local docker repo. Default name is mole_project.tar.gz if none is specified.",
    )

    management_parser.add_argument(
        "-i",
        "--imp",
        nargs="*",
        help="Load an archived containers or container into local docker repo. Default names are [container name].tar.gz if none are specified.",
    )

    management_parser.add_argument(
        "-e",
        "--exp",
        nargs="*",
        help="save an archived containers into local docker repos. Default names are [container name].tar.gz if none are specified.",
    )


    # https certs/keys
    key_parser = subparsers.add_parser(
        "keys", description="Generate keys/certificates for serving via https"
    )

    key_group = key_parser.add_mutually_exclusive_group()

    key_group.add_argument(
        "--ca",
        help="Only generate Certificate Authority certificates. Do not generate server certificates.",
        action="store_true",
        dest="skip_server",
    )

    key_group.add_argument(
        "--server",
        help="Only generate server certificates. Do not generate Certificate Authority certificates.",
        action="store_true",
        dest="skip_ca",
    )

    # show help if no commands are included
    if len(sys.argv) < 2:
        parser.print_help()
        sys.exit(1)

    # parse args and dispatch appropriate functions
    kwargs = vars(parser.parse_args())
    globals()[kwargs.pop("subparser")](**kwargs)
