import os, stat
import plotly.io as pio

# Decorator to mark functions used for bulk figure export
def make_bulk_exported():
    """To use this decorator, first create the decorator:

    bulk_export = make_bulk_exported()

    Then for any function that creates a figure to be bulk exported,
    1) Ensure it can accept any number of parameters (using *args, **kwargs).  Note: all figure functions
       run with the same bulk export call will be passed the same set of parameters.
    2) Ensure it returns the figure and a name for the figure type (to be used in the exported filename)
    2) Decorate it using @bulk_exported on the line above the function definition

    To bulk export figures, call export_decorated_figures() function with the following keyword arguments
    (see export_decorated_figures() docs):
    1) bulk_decorator
    2) fig_directory
    3) fig_name_prefix
    4) fig_type
    5) any additional arguments/keyword arguments to be passed to each of the figure functions
    """

    bulk_exported_figs = {}

    def add_to_bulk_exported(func):
        bulk_exported_figs[func.__name__] = func
        return func

    add_to_bulk_exported.all = bulk_exported_figs
    return add_to_bulk_exported


def export_decorated_figures(
    bulk_decorator=None,
    fig_directory="",
    fig_name_prefix="",
    fig_type=".pdf",
    fig_scale=1.0,
    *args,
    **kwargs
):
    """Exports all figure types decorated with bulk_exported decorator.

    Note: all additional arguments
    and keyword arguments are passed to the figure functions.

    Keyword Arguments:
        bulk_decorator {function} -- Decorator created using make_bulk_exported() (default: {None})
        fig_directory {str} -- Relative directory in which figures will be placed (default: {''})
        fig_name_prefix {str} -- Prefix for all figure file names (default: {''})
        fig_type {str} -- File type for export.  One of ['.pdf', '.svg', '.png'] (default: {'.pdf'})
    """
    progress = 0
    bulk_fig_output = []
    for fig_func_name, fig_func in bulk_decorator.all.items():
        # print("Preparing figure for export using function {}.".format(fig_func_name))
        bulk_fig_output.append(fig_func(*args, **kwargs))

    for fig in bulk_fig_output:
        fig_name = fig_name_prefix + fig[1] + fig_type
        full_fig_name = os.path.join(fig_directory, fig_name)
        full_fig_name = full_fig_name.replace(" ", "_")

        # print("writing figure {} to file.".format(full_fig_name))
        pio.write_image(fig[0], full_fig_name, scale=fig_scale)
