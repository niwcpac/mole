import subprocess
import typer
from utils import stop, service_is_running

app = typer.Typer(add_completion=False)  # Create an typer appplication

################################################################################
###                           Helper Function                                ###
################################################################################

# [ Add Helper Function Here ]


################################################################################
###                   Typer Application Default Callback                     ###
################################################################################


@app.callback(invoke_without_command=True, help="Manage Django.")
def django(
    ctx: typer.Context,
    make_migrations: bool = typer.Option(
        False,
        "-mm",
        "--make_migrations",
        help="Make Django migrations. If there are migrations to be made, they will be saved in mole/data_collection/migrations",
    ),
):
 
    if ctx.invoked_subcommand is not None:
        return

    
    if make_migrations:
        django_running, dj_container_id = service_is_running("django", id=True)
        if django_running:
            print("Django running, attempting to make migrations.")
            cmd = "docker exec -it %s ./manage.py makemigrations" % (dj_container_id)
            subprocess.call(cmd, shell=True)


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
