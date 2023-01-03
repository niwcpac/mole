import subprocess
import typer
from utils import stop

app = typer.Typer(add_completion=False)  # Create an typer appplication


################################################################################
###                           Helper Function                                ###
################################################################################

# [ Add Helper Function Here ]


################################################################################
###                   Typer Application Default Callback                     ###
################################################################################

description = "Brings up all containers and starts interactive shell. Note: Mole does not run in this mode."


@app.callback(invoke_without_command=True, help=description)
def shell(ctx: typer.Context):

    if ctx.invoked_subcommand is not None:
        return

    print("Building container for shell. Mole is not running in this mode.")
    cmd = ["cp", "docker-compose.yml", "compose_init_db.yml"]
    subprocess.call(cmd)

    cmd = ["sed", "-i", "-e", "s/init/init_shell/g", "compose_init_db.yml"]
    subprocess.call(cmd)

    cmd = ["docker", "compose", "-f", "compose_init_db.yml", "up", "-d"]
    subprocess.call(cmd)

    try:
        cmd = ["docker", "compose", "exec", "django", "/bin/bash"]
        subprocess.call(cmd)
        stop()
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
