import subprocess
from utils import SERVICES, terminate_mole
import glob
import typer
import os


app = typer.Typer(add_completion=False)  # Create an typer appplication


CONFIGURE_MOLE_PATH = "mole/data_collection/management/commands/"
MAP_TILES_PATH = "maps/maptiles/"

################################################################################
###                    Typer Application Commands                            ###
################################################################################

description = "Run Mole services. Note: use -q to run as daemon."


@app.callback(invoke_without_command=True, help=description)
def run(
    ctx: typer.Context,
    quiet: bool = typer.Option(
        False, "-q", "--quiet", help="Run pre-configured containers in daemon mode"
    ),
    angular: bool = typer.Option(
        False,
        "-a",
        "--angular",
        help="Start the angular development server on port 4200.",
    ),
    nomaps: bool = typer.Option(
        False, "--nomaps", help="Do not run maps service along with Mole."
    ),
    lite: bool = typer.Option(
        False,
        "--lite",
        help="Do not run non-essential services (portainer, docs, proxy).",
    ),
    profile: bool = typer.Option(
        False, "--profile", help="Run Mole with Silk profiler available at /silk/."
    ),
    db_backup: bool = typer.Option(
        False, "-db", "--db_backup", help="Do not backup database automatically."
    ),
    unlock_redis: bool = typer.Option(
        False,
        "--unlock_redis",
        help="Expose the port for Redis, allowing external access to the Redis server",
    ),
    debug: bool = typer.Option(
        False,
        "-d",
        "--debug",
        help="Debug the Django container",
    ),
):

    # Verify command is invoked without args
    if ctx.invoked_subcommand is not None:
        return

    # Need recreate on so new environment variable get set. (BACKUP_FLAG, etc.)
    cmd = ["docker", "compose", "up"]
    if os.environ.get("UNLOCK_REDIS") or unlock_redis:
        cmd = [
            "docker",
            "compose",
            "-f",
            "docker-compose.yml",
            "-f",
            "docker-compose-unlocked-redis.yml",
            "up",
        ]

    if quiet:
        cmd.append("-d")

    # Don't run non-essential services if "lite" flag is set
    if lite:
        SERVICES.discard("portainer")
        SERVICES.discard("docs")
        # Should reverse-proxy always be included even under lite mode?
        SERVICES.discard("proxy")
        SERVICES.discard("event_generator")
        SERVICES.discard("pulsar")

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

    p = subprocess.Popen(cmd, env=env)

    try:
        return p.wait()
    except KeyboardInterrupt:
        terminate_mole(p, db_backup)
