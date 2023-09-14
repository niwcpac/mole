import os
import subprocess
import signal
import json

# DEBUG = True
# if not DEBUG:
#     import subprocess

# else:
#     from unittest.mock import MagicMock, patch
#     subprocess = MagicMock()


USER_UID = str(os.getuid())
ENV_PATH = str(os.getenv("PATH"))

# Move to config file?
CONFIGURE_MOLE_PATH = "mole/data_collection/management/commands/"

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


def get_git_hash():
    """
    Retrieve Git repository SHA1 hash (Short and long version)

    Return:
        tuple(short_hash, long_hash)

        short_hash: Length of 4
        long_hash:
    """
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

    return short_hash, long_hash


def service_is_running(service_name, id=False):
    """
    Args:
        service_name(str): Docker Service Name
        id (bool): Default False

    Return:
        tuple(running, container_id)

        running(bool): True if docker container is running
        container_id: docker container's unique identifier

    """
    running = False

    if service_name not in SERVICES:
        print(
            f"Error: Service '{service_name}' does not exist. Verify service names is defined within docker-compose.yml."
        )
        return False

    cmd = ["docker", "compose", "ps", "--format", "json", service_name]
    # Compose CLI aligned with Docker CLI: https://docs.docker.com/compose/release-notes/#2210
    host_compose_version = subprocess.check_output(
        ["docker", "compose", "version", "--short"]
    ).decode()
    
    compose_docker_cli_aligned = (
        int(host_compose_version.split(".")[1]) >= 21
        and int(host_compose_version.split(".")[1]) >= 2
    )

    service_info = {}
    try:
        output = subprocess.check_output(cmd)
        service_info = json.loads(output.rstrip().decode()) if output else service_info
    except subprocess.CalledProcessError:
        return False

    if not service_info:
        if id:
            return False, -1
        else:
            return False

    if not compose_docker_cli_aligned:
        service_info = service_info[0]

    if service_info["State"] == "running":
        running = True
    container_id = service_info["ID"]

    if id:
        return running, container_id
    return running


def terminate_mole(mole_subprocess, db_backup=True):
    """
    CTRL-C to docker compose allows for consecutive SIGTERMS to attempt a graceful stop
    followed by killing.  This function is to maintain that construct.

    Args:
        mole_subprocess:
        db_backup(bool):
    """
    try:
        if db_backup:
            from commands.db import backup_db

            print("\n\nStop requested. Backing up database.")
            backup_db(name_string="shutdown&sync=true")
        print("\n")

        mole_subprocess.send_signal(signal.SIGTERM)
        mole_subprocess.wait()
    except KeyboardInterrupt:
        mole_subprocess.send_signal(signal.SIGTERM)
        mole_subprocess.wait()


def stop():
    """
    Backups database and stops all running docker containers
    """
    print("Stop requested. Backing up database.")
    from commands.db import backup_db

    backup_db(name_string="ml_stop")
    cmd = ["docker", "compose", "stop"]
    subprocess.call(cmd)


def configure_script_exists(configure_script: str):
    # Verify configure_script exists
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
        return False

    return True


def install_poetry_env():
    try:
        import typer
    except ModuleNotFoundError:
        # print("Virtual environment not found. Creating...")
        cmd = ["poetry", "install"]
        subprocess.call(cmd)
