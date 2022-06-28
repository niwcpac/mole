import os
import stat
import time
import yaml
import pathlib
import pandas as pd

from dash import dcc
from dash import html
from dash import dash_table
import dash_leaflet as dl
import plotly.express as px
import plotly.figure_factory as ff
import plotly.graph_objects as go
import plotly.io as pio

from plotly.validators.scatter.marker import SymbolValidator
from plotly.subplots import make_subplots

import report_generator.data.query_functions as qf
import report_generator.data.utils as util
import report_generator.dash.export as re


PATH = pathlib.Path(__file__).parents[1]
with open(f"{PATH}/config.yml", "r") as config:
    cfg = yaml.safe_load(config)
    event_endpoint = f"{cfg['mole']['api']}{cfg['mole']['endpoints']['event']}"


bulk_export = re.make_bulk_exported()
export = re.make_bulk_exported()

if not os.path.exists("exported_figures"):
    os.mkdir("exported_figures")

    # Equivalent to chmod 777
    os.chmod("exported_figures", stat.S_IRWXU | stat.S_IRWXG | stat.S_IRWXO)


@export
def csv_table(data, filename, font_color, plot_color, height, width):
    """Return a Data Table:

    :param data: A string, the contents from csv upload.
    :param filename: A string, the filename of the upload content.
    :param font_color: A string, the font color for the figure.
    :param plot_color: A string, the background color for the figure.
    :param height: An int, the height of the figure.
    :param width: An int, the width of the figure.
    """

    df = pd.read_json(data)

    values = []
    for column in df:
        values.append(df[column])

    if filename:
        title = filename
    else:
        title = "mole_endpoint_examples.csv"

    fig = go.Figure(
        data=[
            go.Table(
                header=dict(values=df.columns, align="left"),
                cells=dict(values=values, height=30, align="left"),
            ),
        ]
    )

    fig.update_layout(
        title=dict(text=title, font=dict(size=28)),
        height=height,
        font=dict(color="black", size=12),
    )

    return fig, "data_table"


@bulk_export
# Basic Bar Chart with Plotly Graph Objects
def api_event_bar(endpoint, trial, font_color, plot_color, height, width):
    """Return a Bar Chart:

    :param endpoint: An string, the API endpoint.
    :param trial: An int, the current or selected trial id.
    :param font_color: A string, the font color for the figure.
    :param plot_color: A string, the background color for the figure.
    :param height: An int, the height of the figure.
    :param width: An int, the width of the figure.
    """

    title = "Event Statistics"
    if endpoint:
        event = qf.api_request(f"{endpoint}/event_data?trial={trial}")
    else:
        # If an endpoint is not provided on the UI, a default endpoint (Mole event data endpoint) will be used.
        event = qf.api_request(f"{event_endpoint}?trial={trial}")

    if not event.empty:
        eventTotal = event.groupby(["event_type"]).size().reset_index(name="total")

        fig = go.Figure()

        fig.add_trace(
            go.Bar(x=list(eventTotal["event_type"]), y=list(eventTotal["total"]),)
        )

        fig.update_layout(
            title=dict(text=title, font=dict(size=28)),
            xaxis={"gridcolor": "rgba(177 190, 202, 0.5)", "showgrid": False,},
            yaxis={
                "title": "",
                "automargin": True,
                "gridcolor": "rgba(177 190, 202, 0.5)",
                "showgrid": False,
            },
            uirevision=True,
            paper_bgcolor="white",
            plot_bgcolor=plot_color,
            font=dict(color="black", size=16),
            margin=dict(t=100, b=25, l=25, r=25),
            showlegend=False,
            legend_orientation="v",
            height=height,
            width=width,
        )

    else:
        fig = empty_figure(font_color, plot_color, height, width, title)

    return fig, f"trial_{trial}_event_statistics"


@bulk_export
# Basic Scatter Plot with Plotly Express
def api_event_timeline(endpoint, trial, font_color, plot_color, height, width):
    """Return a Scatter Plot:

    :param endpoint: An string, the API endpoint.
    :param trial: An int, the current or selected trial id.
    :param font_color: A string, the font color for the figure.
    :param plot_color: A string, the background color for the figure.
    :param height: An int, the height of the figure.
    :param width: An int, the width of the figure.
    """

    title = "Event Timeline"

    if endpoint:
        event = qf.api_request(f"{endpoint}/event_data?trial={trial}")
    else:
        # If an endpoint is not provided on the UI, use default (Mole must be running)
        event = qf.api_request(f"{event_endpoint}?trial={trial}")

    if not event.empty:
        fig = px.scatter(
            event, x="start_datetime", y="event_type", opacity=1, color="event_type",
        )

        fig.update_layout(
            title=dict(text=title, font=dict(color=font_color, size=28)),
            xaxis={"gridcolor": "rgba(177 190, 202, 0.5)", "showgrid": True,},
            yaxis={
                "automargin": True,
                "gridcolor": "rgba(177 190, 202, 0.5)",
                "showgrid": False,
            },
            xaxis_title=" ",
            yaxis_title=" ",
            uirevision=True,
            # paper_bgcolor = bgColor,
            plot_bgcolor=plot_color,
            font=dict(color=font_color, size=16),
            margin=dict(t=100),
            showlegend=False,
            legend_orientation="h",
            height=height,
            width=width,
        )

    else:
        fig = empty_figure(font_color, plot_color, height, width, title)

    return fig, f"trial_{trial}_event_timeline"


def empty_figure(font_color, plot_color, height, width, title):
    fig = go.Figure()
    fig.update_layout(
        title=dict(text=title, font=dict(size=28)),
        xaxis={"visible": False},
        yaxis={"visible": False},
        annotations=[
            {
                "text": "No Data Found",
                "xref": "paper",
                "yref": "paper",
                "showarrow": False,
                "font": {"size": 28,},
            }
        ],
    )

    return fig


def export_figures(
    source, endpoint, trial, csv, filename, font_color, plot_color, height, width,
):
    """Export all figures."""
    figDirectory = "exported_figures/"
    figType = ".png"
    figScale = 2.0

    if source == "api":
        for t in trial:
            trial_id = t["value"]
            prefix = t["label"].split()[0].replace(".", "_") + "_"

            # Export decorated figure types
            re.export_decorated_figures(
                bulk_decorator=bulk_export,
                fig_directory=figDirectory,
                fig_name_prefix=prefix,
                fig_type=figType,
                fig_scale=figScale,
                endpoint=endpoint,
                trial=trial_id,
                font_color="black",
                plot_color=plot_color,
                height=height,
                width=width,
            )

    elif source == "csv":
        prefix = "csv_upload_"
        re.export_decorated_figures(
            bulk_decorator=export,
            fig_directory=figDirectory,
            fig_name_prefix=prefix,
            fig_type=figType,
            fig_scale=figScale,
            data=csv,
            filename=filename,
            font_color="black",
            plot_color=plot_color,
            height=height,
            width=width,
        )

    else:
        pass
