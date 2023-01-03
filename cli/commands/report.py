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

description = """Serve report generator at http://localhost/report/. 
            Note: Mole does not run with this sub-command.  See Docs for more information."""


@app.callback(invoke_without_command=True, help=description)
def report(ctx: typer.Context):

    if ctx.invoked_subcommand is not None:
        return

    cmd = ["docker", "compose", "up", "report"]
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
