import subprocess
import os
import typer
from typing import List, Optional
import sys
from utils import stop

from commands import run

app = typer.Typer(add_completion=False)  # Create an typer appplication

################################################################################
###                           Helper Function                                ###
################################################################################


################################################################################
###                   Typer Application Default Callback                     ###
################################################################################


description = "Manage container builds. Load, Store, Save, Containers/images"


@app.callback(invoke_without_command=True, help=description)
def manage(
    ctx: typer.Context,
    load: Optional[str] = typer.Option(
        None,
        "-l",
        "--load",
        flag_value=os.path.realpath(sys.argv[0]).split("/")[-3],
        help="Load docker images from gzipped tarball, can provide optional source archive name. Note: the project root directory should be changed to match the tarball file name.",
    ),
    save: Optional[str] = typer.Option(
        None,
        "-s",
        "--save",
        flag_value=os.path.realpath(sys.argv[0]).split("/")[-3],
        help="Save docker images into gzipped tarball, can take optional target archive name.",
    ),
):

    if ctx.invoked_subcommand is not None:
        return

    if save:
        # This command grabs the:
        #   repo name if it's a custom built image
        #   repo:tag if it's a pulled image
        # used in docker compose file
        command = [
            "docker",
            "compose",
            "config",
            "--images",
        ]
        r = subprocess.run(command, stdout=subprocess.PIPE, encoding="utf8", check=True)
        list_of_images = r.stdout.split("\n")
        list_of_images = [x for x in list_of_images if x]
        second_command = [
            "docker",
            "save",
            "-o",
            f"{save}.tar",
        ]
        second_command.extend(list_of_images)
        print(f"Archiving into {save}.tar...\n\tThis might take a while...")
        r2 = subprocess.run(second_command, check=True)
        print("Finished archiving")
        compress_command = [
            "gzip",
            f"{save}.tar",
        ]
        print("Compressing with gzip...\n\tThis also might take a while...")
        r3 = subprocess.run(compress_command, check=True)
        print("Finished compressing")
    elif load:
        print("Looking for the file...")
        list_of_possible_files = [
            item for item in os.listdir(".") if os.path.isfile(os.path.join(".", item))
        ]
        list_of_possible_files = [
            item for item in list_of_possible_files if load in item
        ]
        print("Found possible files, trying to load into docker...")
        success = False
        for x in list_of_possible_files:
            load_command = ["docker", "load", "-i", x]
            try:
                r = subprocess.run(load_command, check=True)
            except subprocess.CalledProcessError as e:
                continue
            if r.returncode == 0:
                success = True
                print("Finished loading new images")
                break
        if not success:
            print(
                "No valid input for docker load command, please submit a tar archive of docker images"
            )


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
