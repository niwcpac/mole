import os, sys
import subprocess

import typer
from utils import get_git_hash

app = typer.Typer(add_completion=False)  # Create an typer appplication


################################################################################
###                           Helper Function                                ###
################################################################################


def clean():
    prompt = """
    WARNING: You have requested to delete containers and volumes.
    No automatic database backup will be created prior to init.
    Do you wish to proceed? [y/N]: """

    sys.stdout.write(prompt)

    if input().lower() in ("yes", "y", "ye"):
        print("Clearing containers and volumes...\n")
        cmd = [
            "docker",
            "compose",
            "down",
            "--volumes",
            "--remove-orphans",
        ]
        p = subprocess.call(cmd)
        print("Containers and volumes deleted...\n")
        BACKUP_FLAG = "false"
    else:
        print("Skipping, containers and volumes not deleted")


def _build_only():
    print("Building container images...\n")
    cmd = [
        "docker",
        "compose",
        "-f",
        "docker-compose.yml",
        "-f",
        "docker-compose-e2e.yml",
        "build",
    ]

    short_hash, long_hash = get_git_hash()

    env = {
        "PATH": str(os.getenv("PATH")),
        "NEWUSERID": str(os.getuid()),
        "BUILD_TAG": short_hash,
        "LONG_BUILD_TAG": long_hash,
    }
    p = subprocess.call(cmd, env=env)


################################################################################
###                   Typer Application Default Callback                     ###
################################################################################


@app.callback(invoke_without_command=True, help="Build Containers")
def build(
    ctx: typer.Context,
    deep_clean: bool = typer.Option(
        False,
        "--deep_clean",
        help="Remove all existing containers and volumes prior to running Mole",
    ),
    build_only: bool = typer.Option(
        False, "--build_only", help="Build only. Do not serve documentation"
    ),
):

    # Check if command is ran without args
    if ctx.invoked_subcommand is not None:
        return

    if deep_clean:
        clean()

    if build_only:
        _build_only()
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
