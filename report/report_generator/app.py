import yaml
import pathlib

from werkzeug.middleware.dispatcher import DispatcherMiddleware

import dash
from dash import html
from dash import dcc

import report_generator.layout as layout
import dash_bootstrap_components as dbc

from report_generator.dash.base import baseApp
from report_generator.dash import components
from report_generator.data import graph_functions


PATH = pathlib.Path(__file__).parent
with open(f"{PATH}/config.yml", "r") as config:
    cfg = yaml.safe_load(config)

app = dash.Dash(
    __name__,
    meta_tags=[{"name": "viewport", "content": "width=device-width"}],
    external_stylesheets=["/assets/bootstrap.min.css"],
    suppress_callback_exceptions=True,
    requests_pathname_prefix="/report/",
)

server = DispatcherMiddleware(app.server, {"/report": app.server})


class ReportGeneratorApp(baseApp):
    def __init__(self, app, server):
        baseApp.__init__(self, app=app, server=server, title=cfg["dash_app"]["title"])
        self.layout()
        self.set_callbacks()

    def layout(self):
        """Define the UI layout."""
        self.initialize_components()
        dashboard = layout.create_printable_report()
        app.layout = layout.serve_report(dashboard)

        return app.layout

    def initialize_components(self):
        """Define custom UI components."""
        components.register_component_callbacks(self.app)

    def set_callbacks(self):
        """Set dynamic callbacks for the app, data: [(Output,[Input],[State],callback_func), ...]."""
        plots = dir(graph_functions)

        # dynamic callbacks for figures using mole api endpoint
        self.api_list = list(filter(lambda k: "api_" in k, plots))
        for output in self.api_list:
            api_callbacks = [
                self.define_callback(
                    (output, "figure"),
                    [
                        ("interval-component", "n_intervals"),
                        ("url", "pathname"),
                        ("endpoint-session", "data"),
                        ("trial-selector", "value"),
                    ],
                    func=self.api_report_callback,
                ),
            ]
            self.register_callbacks(api_callbacks)

        # dynamic callbacks for figures using csv data
        self.csv_list = list(filter(lambda k: "csv_" in k, plots))
        for output in self.csv_list:
            csv_callbacks = [
                self.define_callback(
                    (output, "figure"),
                    [
                        ("url", "pathname"),
                        ("csv-session", "data"),
                        ("csv-filename-session", "data"),
                    ],
                    func=self.csv_report_callback,
                ),
            ]
            self.register_callbacks(csv_callbacks)


report = ReportGeneratorApp(app=app, server=server)
