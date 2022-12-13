
import typer

app = typer.Typer(add_completion=False)  # Create an typer appplication

import time

################################################################################
###                           Helper Function                                ###
################################################################################

def helper():
    typer.echo("Helper Function")



################################################################################
###                   Typer Application Default Callback                     ###
################################################################################

# @app.callback(invoke_without_command=True,)
@app.callback(invoke_without_command=True)
def callback1(ctx : typer.Context,
        arg1 : bool= typer.Option(False,"-a", "--arg", help="Argument 1")):
    """
    Add Help information here

    May also pass infomation string to 'help' keyword in app.callback decorator
    """

    typer.echo("Callbacks are always called")
    
    if ctx.invoked_subcommand is not None:
        return

    typer.echo("This is a callback")



################################################################################
###                          Typer Application Command                       ###
################################################################################

@app.command()
def command1(arg1 : bool= typer.Option(False,"-x", "--argx", help="Required Argument"),
             arg2 : bool= typer.Option(False,"-y", "--argy", help="Optional Argument")):
    """
    Add Help information here
    """
    typer.echo(f"This is a command {str(arg1)}")
    try:
        typer.echo("SLEEPING")
        time.sleep(5)

    except KeyboardInterrupt:
        print("INTERRUPT")
    