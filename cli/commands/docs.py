import os
import time
import subprocess
from contextlib import closing
from urllib.request import urlopen


import typer
from utils import terminate_mole, stop

app = typer.Typer(add_completion=False)  # Create an typer appplication

NUM_TRIES = 15

# TODO: Get Current State of Docker servers. Upon exit, return to original system state
################################################################################
###                           Helper Function                                ###
################################################################################

# [ Add Helper Function Here ]


################################################################################
###                   Typer Application Default Callback                     ###
################################################################################

description = "Build and serve documentation at http://localhost/docs/"


@app.callback(invoke_without_command=True, help=description)
def docs(
    ctx: typer.Context,
    serve: bool = typer.Option(
        True,
        "-b",
        "--build_only",
        show_default=False,
        help="Build only. Do not serve documentation.",
    ),
    schema: bool = typer.Option(
        False,
        "-s",
        "--generate-schema",
        show_default=False,
        help="Generate an OpenAPI Schema.",
    ),
    graph_models: bool = typer.Option(
        False, "-g", "--graph-models", show_default=False, help="Graph database models."
    ),
):

    if ctx.invoked_subcommand is not None:
        return

    cmd = []

    if schema or graph_models:
        if schema and graph_models:
            msg = "Generating OpenAPI schema and graphing models. Waiting for Django service..."
        elif schema:
            msg = "Generating OpenAPI schema. Waiting for Django service..."
        elif graph_models:
            msg = "Graphing models. Waiting for Django service..."
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
        subprocess.Popen(cmd)

        # retry num_tries for Django service to be ready
        for i in range(NUM_TRIES + 1):
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
    
        if i == NUM_TRIES:
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

        p = subprocess.Popen(cmd)

        try:
            return p.wait()

        except KeyboardInterrupt:
            terminate_mole(p, db_backup=False)
            

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