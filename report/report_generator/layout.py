import yaml
import pathlib

from dash import dcc
from dash import html

import dash_bootstrap_components as dbc
import report_generator.dash.report_modules as rm

from report_generator.pages import api, csv_upload

PATH = pathlib.Path(__file__).parent
with open(f"{PATH}/config.yml", "r") as config:
    cfg = yaml.safe_load(config)
    event_endpoint = f"{cfg['mole']['api']}"


def create_report():
    """Return report dashboard with tabs."""
    report = html.Div(
        children=[
            dbc.Row(
                [
                    dbc.Navbar(
                        [
                            dbc.Container(
                                [
                                    dbc.Row(
                                        [
                                            dbc.Col(
                                                html.Img(
                                                    src="report/assets/report.svg",
                                                    height="40px",
                                                )
                                            ),
                                            dbc.Col(
                                                dbc.NavbarBrand(
                                                    f"{cfg['dash_app']['title']} Dashboard",
                                                    className="ms-2",
                                                )
                                            ),
                                        ],
                                        align="left",
                                        className="g-0 ms",
                                    )
                                ],
                                style={"margin-left": "1rem",},
                            ),
                            dbc.Row(
                                [
                                    dbc.Col(
                                        dbc.DropdownMenu(
                                            label="Menu",
                                            children=[
                                                dbc.DropdownMenuItem(
                                                    x, href=x, external_link=True,
                                                )
                                                for x in cfg["dash_app"]["views"]
                                            ],
                                            color="light",
                                            className="ms-2",
                                        ),
                                    ),
                                    dbc.Col(
                                        dbc.Button(
                                            id="export",
                                            n_clicks=0,
                                            className="ms-2 me-4",
                                            color="success",
                                            children="Export Figures",
                                        ),
                                    ),
                                    dbc.Spinner(
                                        html.Div(id="export_output", n_clicks=0),
                                        color="light",
                                    ),
                                ],
                                className="g-0 ms-auto flex-nowrap",
                                align="center",
                            ),
                        ],
                        dark=True,
                        className="w3-transparent",
                    ),
                ],
                className="app__header",
            ),
            html.Div(
                [
                    dcc.Tabs(
                        [
                            dcc.Tab(
                                label="API",
                                selected_className="custom__tab--selected",
                                children=[
                                    html.Div(
                                        [
                                            html.Div(id="api-error"),
                                            html.Div(id="polling-error"),
                                            api.control_inidicator_layout(
                                                event_endpoint
                                            ),
                                            api.metric_layout(),
                                        ],
                                        className="report__body",
                                    )
                                ],
                            ),
                            dcc.Tab(
                                label="CSV Upload",
                                selected_className="custom__tab--selected",
                                children=[csv_upload.layout(),],
                            ),
                        ],
                        className="custom__tab",
                    )
                ]
            ),
        ]
    )

    return report


def create_printable_report():
    """Return a printable report page."""
    report = html.Div(
        children=[
            html.Div(
                [dbc.Button("Export to PDF", color="primary", id="js", n_clicks=0),],
                className="d-md-flex justify-content-md-end page_header",
            ),
            # Page 1
            html.Div(
                [
                    html.Div(
                        [
                            html.Div(
                                [
                                    html.Img(
                                        src="/report/assets/report.svg",
                                        style={"margin-right": "1rem"},
                                    ),
                                    dbc.Col(
                                        dbc.NavbarBrand(f"{cfg['dash_app']['title']}")
                                    ),
                                ],
                                className="app__header",
                            ),
                            api.control_inidicator_layout(event_endpoint, print=True),
                            rm.create_figure(id="api_event_bar"),
                            rm.create_figure(id="api_event_timeline"),
                        ],
                        className="sub_page",
                    ),
                ],
                className="page",
            ),
            # Page 2
            # html.Div(
            #     [
            #         html.Div(
            #             [],
            #             className="sub_page",
            #         ),
            #     ],
            #     className="page",
            # ),
        ]
    )

    return report


def serve_report(report):
    """Return report layout with interval component:

    :param report: A string, the report layout component.
    """
    return html.Div(
        children=[
            dcc.Location(id="url", refresh=True),
            dcc.Interval(
                id="interval-component",
                interval=cfg["dash_app"]["request_interval_ms"],
                n_intervals=0,
            ),
            html.Div(id="page-content", children=report),
        ]
    )


def padding(value=cfg["dash_app"]["styling"]["default_padding"]):
    """Return a dict with padding in each direction."""
    return {f"padding-{x}": f"{value}px" for x in ["right", "left", "top", "bottom"]}


def margin(value=cfg["dash_app"]["styling"]["default_margin"]):
    """Return a dict with margin in each direction."""
    return {f"margin-{x}": f"{value}px" for x in ["right", "left", "top", "bottom"]}


def card(data, **kwa):
    """Returns a custom card layout:

    Usage::

        >>> newCard = card(
                html.Div([
                    ...
                ])
            )

    :param data: A string, the entire Div component"
    """
    return html.Div(dbc.Card(data, style=padding(), **kwa), style=padding())
