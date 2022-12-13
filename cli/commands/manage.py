import subprocess
import typer
from typing import List, Optional
import sys
from utils import stop

from commands import run

app = typer.Typer(add_completion=False)  # Create an typer appplication

################################################################################
###                           Helper Function                                ###
################################################################################

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


################################################################################
###                   Typer Application Default Callback                     ###
################################################################################


description = "Manage container builds. Load, Store, Save, Containers/images"


@app.callback(invoke_without_command=True, help=description)
def manage(
    ctx: typer.Context,
    target: Optional[List[str]] = typer.Option(
        ["mole_project"], "-t", "--target", help="Specify name for your archive."
    ),
    load: str = typer.Option(
        None,
        "-l",
        "--load",
        flag_value="mole_project.tar.gz",
        help="Load an archived images into local docker repo. Default name is mole_project.tar.gz if none is specified.",
    ),
    build: bool = typer.Option(
        False,
        "-b",
        "--build",
        help="Build containers in local image repository. Will only build containers that exist for this project",
    ),
    save: Optional[List[str]] = typer.Option(
        None,
        "-s",
        "--save",
        help="Save docker image/images to tarball onto host machine.",
    ),
    imp: str = typer.Option(
        None,
        "-i",
        "--imp",
        flag_value="",
        help="Load an archived containers or container into local docker repo. Default names are [container name].tar.gz if none are specified.",
    ),  # list
    exp: str = typer.Option(
        None,
        "-e",
        "--exp",
        flag_value="",
        help="save an archived containers into local docker repos. Default names are [container name].tar.gz if none are specified.",
    ),  # list
    all: bool = typer.Option(False, "-a", "--all", help="Does nothing at the moment"),
):

    if ctx.invoked_subcommand is not None:
        return
    
    if load:
        yes = ("yes", "y", "ye")
        prompt = """
        WARNING: You have requested to load images for Mole.
        This will permanently delete all current docker images for the project.

        Would you like to backup the current images? [y/N]: """

        sys.stdout.write(prompt)
        choice = input().lower()

        if choice in yes:
            save_project_images("mole_project_backup", [])

        delete_project_config()
        load_cmd = ["docker", "load", "-i", load]
        print("Loading images from: %s" % load)
        subprocess.call(load_cmd)
    
    if build:
        run.run()

    if len(save) > 0:
        save_project_images(target[0], save)

    if imp != None:
        import_project_containers()

    if exp != None:
        export_project_containers()


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
