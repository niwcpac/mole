import os, sys
import subprocess

import typer
from utils import service_is_running
from utils import SERVICES

app = typer.Typer(add_completion=False)  # Create an typer appplication


################################################################################
###                           Helper Function                                ###
################################################################################


def build_angular():
    # Tell the angular container to build the angular static files and remove the container afterward
    print("Building angular static files ...")

    # TODO: Add verbose option
    org_stdout = sys.stdout
    FNULL = open(os.devnull, "w")
    sys.stdout = FNULL

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
    sys.stdout = org_stdout
    print("Angular container finished building files")


################################################################################
###                   Typer Application Default Callback                     ###
################################################################################

description = "Start the angular development server on port 4200."


@app.callback(invoke_without_command=True, help=description)
def ang(
    ctx: typer.Context,
    build: bool = typer.Option(
        False, 
        "-b", 
        "--build", 
        show_default=False,
        help="Build angular static files"),
):

    if ctx.invoked_subcommand is not None:
        return

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
            subprocess.call(
                [
                    "docker-compose",
                    "exec",
                    "django",
                    "./manage.py",
                    "collectstatic",
                    "--no-input",
                ]
            )

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
