import os, sys
import glob
import subprocess

import typer
from utils import SERVICES, terminate_mole, configure_script_exists
from commands.build import get_git_hash, _build_only, clean
from commands.keys import generate_keys, is_key_exists
from commands.maps import MAP_TILES_PATH
from commands.ang import build_angular
from commands.db import standalone_backup


app = typer.Typer(add_completion=False)  # Create an typer appplication

# CONFIGURE_MOLE_PATH = "mole/data_collection/management/commands/"

################################################################################
###                           Helper Function                                ###
################################################################################

# [ Add Helper Function Here ]


################################################################################
###                   Typer Application Default Callback                     ###
################################################################################


@app.callback(invoke_without_command=True)
def init(
    ctx: typer.Context,
    configure_script: str = typer.Argument(
        "configure_mole", help="Configuration Script"
    ),
    angular: bool = typer.Option(
        False,
        "-a",
        "--angular",
        help="Start the angular development server on port 4200.",
        show_default=False,
    ),
    build_only: bool = typer.Option(
        False,
        "-b",
        "--build-only",
        help="Only build container images. Do not configure Mole database.",
        show_default=False,
    ),
    db_backup: bool = typer.Option(
        False,
        "-db",
        "--db_backup",
        help="Backup database automatically.",
        show_default=False,
    ),
    debug: bool = typer.Option(
        False, "-d", "--debug", help="Debug the Django container", show_default=False
    ),
    deep_clean: bool = typer.Option(
        False,
        "--deep-clean",
        help="Remove all existing containers and volumes prior to running Mole",
        show_default=False,
    ),
    lite: bool = typer.Option(
        False,
        "--lite",
        help="Do not run non-essential services (portainer, docs, proxy).",
        show_default=False,
    ),
    make_migrations: bool = typer.Option(
        False,
        "-mm",
        "--make_migrations",
        help="Make Django migrations.",
        show_default=False,
    ),
    nomaps: bool = typer.Option(
        False,
        "--nomaps",
        help="Do not run maps service along with Mole.",
        show_default=False,
    ),
    pre_init_backup: bool = typer.Option(
        True,
        "-nb",
        "--pre_init_backup",
        help="Do not backup the database prior to init.",
        show_default=False,
    ),
    profile: bool = typer.Option(
        False,
        "--profile",
        help="Run Mole with Silk profiler available at /silk/.",
        show_default=False,
    ),
    quiet: bool = typer.Option(
        False,
        "--quiet",
        help="Run pre-configured containers in daemon mode.",
        show_default=False,
    ),
    skip_static_build: bool = typer.Option(
        False,
        "-s",
        "--skip_static_build",
        help="Skip the angular build process.",
        show_default=False,
    ),
    unlock_redis: bool = typer.Option(
        False,
        "--unlock-redis",
        help="Expose the port for Redis, allowing external access to the Redis server",
        show_default=False,
    ),
):
    """
    Create the Docker containers and initialize a database.
    Database is based on the available configuration scripts.
    If no CONFIGURE_SCRIPT is specified, "configure_mole" is used.
    """

    if db_backup:
        BACKUP_FLAG = "pre"
    else:
        BACKUP_FLAG = "false"

    if debug:
        DEBUG_DJANGO = "true"
    else:
        DEBUG_DJANGO = "false"

    if pre_init_backup:
        print("Backing up the database...")
        standalone_backup("pre-init&sync=true")

    # Generate https keys/certs if they don't exist
    if not is_key_exists():
        generate_keys()

    if deep_clean:
        clean()

    if build_only:
        _build_only()
        return

    # Verify configure_script exists
    print("Building containers and initializing Mole...")

    if not configure_script_exists(configure_script):
        return

    prompt = """
    WARNING: You have requested to initialize Mole.
    This will permanently overwrite your current database. Do you wish to proceed?

    Do you wish to continue? [y/N]: """

    sys.stdout.write(prompt)
    choice = input().lower()
    yes = ("yes", "y", "ye")

    if choice in yes:
        cmd = [
            "docker",
            "compose",
            "up",
            "--build",
            "--force-recreate",
            "--always-recreate-deps",
        ]

        if quiet:
            cmd.append("-d")

        if os.environ.get("UNLOCK_REDIS") or unlock_redis:
            cmd = [
                "docker",
                "compose",
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
            # Should reverse-proxy always be included even under lite mode?
            SERVICES.discard("proxy")
            SERVICES.discard("event_generator")
            SERVICES.discard("pulsar")
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

        short_hash, long_hash = get_git_hash()
        env = {
            "PROFILE": str(profile).lower(),
            "BACKUP_FLAG": BACKUP_FLAG,
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

        clear_images_cmd = [
            "find",
            "mole/media/images/",
            "-type",
            "f",
            "-not",
            "-name",
            "README",
            "-delete",
        ]
        subprocess.call(clear_images_cmd)

        cmd.extend(SERVICES)
        p = subprocess.Popen(cmd, env=env)

        try:
            return p.wait()
        except KeyboardInterrupt:

            terminate_mole(p, db_backup)  # TODO: 5/24 SIGTERM is not being triggered

    else:
        print("\n    Exiting...")
        return


################################################################################
###                          Typer Application Command                       ###
################################################################################

# @app.command()
# def command1(arg1 : bool= typer.Option(False,"-x", "--argx", help="Required Argument"),
#              arg2 : bool= typer.Option(False,"-y", "--argy", help="Optional Argument")):
#     """
#     Add Help information here
#     """
#     typer.echo("This is a command")
