import subprocess
import typer
from commands.db import backup_db

app = typer.Typer(add_completion=False)  # Create an typer appplication

################################################################################
###                           Helper Function                                ###
################################################################################

# [ Add Helper Function Here ]


################################################################################
###                   Typer Application Default Callback                     ###
################################################################################

description = "Stop all containers."


@app.callback(invoke_without_command=True, help=description)
def stop(ctx: typer.Context):

    if ctx.invoked_subcommand is not None:
        return

    print("Stop requested. Backing up database.")
    backup_db(name_string="ml_stop")
    cmd = ["docker", "compose", "stop"]
    subprocess.call(cmd)


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
