import subprocess
import typer
from utils import stop

app = typer.Typer(add_completion=False)  # Create an typer appplication

MAP_TILES_PATH = "maps/maptiles/"


################################################################################
###                           Helper Function                                ###
################################################################################

# [ Add Helper Function Here ]


################################################################################
###                   Typer Application Default Callback                     ###
################################################################################

description = "Serve map tiles at http://localhost/maps/.  Note: Mole does not run with this sub-command.  See Docs for more information."


@app.callback(invoke_without_command=True, help=description)
def maps(ctx: typer.Context):

    if ctx.invoked_subcommand is not None:
        return

    cmd = ["docker", "compose", "up", "maptiles"]
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
