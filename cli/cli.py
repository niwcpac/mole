import importlib
import pkgutil
import typer
import commands

description="""
    Mole is a tool to assist with testing and experimentation involving
    robots and autonomous systems
    """
def main():
    APP = typer.Typer(add_completion=False, no_args_is_help=True, help=description)

    ### Adds commands
    for _, name, _ in pkgutil.iter_modules(commands.__path__):
        _app = importlib.import_module(f"commands.{name}")
        APP.add_typer(_app.app, name=name)

    return APP
    


if __name__ == "__main__":
    APP = main()
    APP(prog_name="ml")

