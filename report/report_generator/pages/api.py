import pathlib
import yaml

from dash import dcc
from dash import html

import dash_bootstrap_components as dbc

import report_generator.dash.report_modules as rm


def control_inidicator_layout(endpoint_url, print=False):
    """Return indicators, trial selector, and button to generate random events in Mole."""
    if print:
        return html.Div(
            [
                dcc.Store(id="endpoint-session", storage_type="session"),
                html.Div(
                    [
                        rm.dropdown(
                            id="trial-selector",
                            selection="trial",
                            endpoint=endpoint_url,
                        ),
                    ],
                    style={"margin-top": "1rem"},
                    className="eleven offset-custom columns",
                ),
            ],
            className="row",
        )
    else:
        return html.Div(
            [
                dcc.Store(id="endpoint-session", storage_type="session"),
                dbc.Modal(
                    [
                        dbc.ModalHeader(
                            [
                                dbc.ModalTitle("Event Generator "),
                            ],
                        ),
                        dbc.ModalBody(id="event-gen-modal"),
                        dbc.ModalBody(
                            [
                                rm.input(
                                    id="username",
                                    debounce=False,
                                    placeholder="mole-username",
                                    style={"margin-left": "0px", "width": "175px"},
                                    className="pretty_container",
                                ),
                                rm.input(
                                    id="password",
                                    debounce=False,
                                    placeholder="mole-password",
                                    style={"margin-left": "0px", "width": "175px"},
                                    className="pretty_container",
                                ),
                            ]
                        ),
                        dbc.ModalFooter(
                            [
                                dbc.Spinner(
                                    id="generator-output",
                                    color="primary",
                                ),
                                rm.button(
                                    name="Generate Events",
                                    id="generate-events",
                                    style={"float": "left", "margin-rigth": "0px"},
                                    className="button pretty_container",
                                ),
                                dbc.Button(
                                    "Close", id="close-centered", className="ms-2"
                                ),
                            ]
                        ),
                    ],
                    id="modal-centered",
                    centered=True,
                ),
                rm.indicator(
                    "Data Endpoint Polling Interval (s)",
                    "request-interval-indicator",
                ),
                rm.indicator(
                    "Entity Data Endpoint Retrieval Time (s)", "entity-retrieval-time"
                ),
                rm.indicator(
                    "Event Data Endpoint Retrieval Time (s)", "event-retrieval-time"
                ),
                html.Div(
                    [
                        rm.dropdown(
                            id="trial-selector",
                            selection="trial",
                            endpoint=endpoint_url,
                        ),
                        rm.input(
                            id="endpoint-url",
                            debounce=True,
                            placeholder=f"{endpoint_url}",
                            style={"margin-left": "0px", "width": "200px"},
                            className="pretty_container",
                        ),
                        rm.input(
                            id="request-interval",
                            debounce=True,
                            placeholder="interval (s)",
                            style={"margin-left": "0px", "width": "130px"},
                            className="pretty_container",
                        ),
                        rm.button(
                            name="Generate Events",
                            id="generator-button",
                            style={"float": "right", "margin-rigth": "0px"},
                            className="button pretty_container",
                        ),
                    ],
                    className="right columns",
                ),
            ],
            className="row",
        )


def metric_layout():
    """Return graph figures that uses api data endpoints."""
    return html.Div(
        [
            rm.create_figure(id="api_event_bar"),
            rm.create_figure(id="api_event_timeline"),
        ],
        className="row ",
        style={"marginTop": "5px"},
    )
