import subprocess
import typer
from utils import terminate_mole
from commands.db import standalone_backup
import os

app = typer.Typer(add_completion=False)  # Create an typer appplication


################################################################################
###                           Helper Function                                ###
################################################################################

# [ Add Helper Function Here ]


################################################################################
###                   Typer Application Default Callback                     ###
################################################################################

description = (
    "Run the Django unit tests. Note: Mole does not run when this flag is set."
)


@app.callback(invoke_without_command=True, help=description)
def test(
    ctx: typer.Context,
    dropdb: bool = typer.Option(
        False,
        "--dropdb",
        help="Drop the test database.  Should only need to use if tests fail because test_mole database already exists.",
        show_default=False,
    ),
    integration: bool = typer.Option(
        False,
        "--integration",
        help="Run integration tests with event generator.",
        show_default=False,
    ),
    pulsar: bool = typer.Option(
        False,
        "--pulsar",
        help="Run pulsar tests.",
        show_default=False,
    ),
):

    if ctx.invoked_subcommand is not None:
        return

    if dropdb:
        cmd = ["docker", "compose", "-f", "compose_init_db.yml", "up", "-d", "postgres"]
        subprocess.call(cmd)

        cmd = [
            "docker",
            "compose",
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
            "docker",
            "compose",
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
        p = subprocess.Popen(cmd, env=env)
        try:
            return p.wait()
        except KeyboardInterrupt:
            terminate_mole(p, False)
    
    if pulsar:
        cmd = [
            "docker",
            "compose",
            "-f",
            "docker-compose-pulsar-tests.yml",
            "up",
            "--exit-code-from",
            "pulsar",
        ]    
        p = subprocess.Popen(cmd)
        try:
            return p.wait()
        except KeyboardInterrupt:
            terminate_mole(p, False)

    cmd = [
        "docker",
        "compose",
        "-f",
        "docker-compose-django-tests.yml",
        "up",
        "--exit-code-from",
        "django",
    ]
    p = subprocess.Popen(cmd)

    try:
        return p.wait()
    except KeyboardInterrupt:
        terminate_mole(p, False)


################################################################################
###                          Typer Application Command                       ###
################################################################################


@app.command()
def pytest():
    """
    Verify ml commands using Pytest
    """
    cmd = ["pytest", "cli/test/"]
    p = subprocess.call(cmd)
