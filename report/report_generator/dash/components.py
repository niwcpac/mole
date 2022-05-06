import time
import yaml
import pathlib
import json
import re
import requests
import subprocess

from dash import dcc
from dash import html
from dash.dependencies import Input, Output, State
from dash.exceptions import PreventUpdate

import dash_bootstrap_components as dbc


import report_generator.layout as layout
from report_generator.data import query_functions
from report_generator.data import graph_functions
from report_generator.data import utils

PATH = pathlib.Path(__file__).parents
with open(f"{PATH[1]}/config.yml", "r") as config:
    cfg = yaml.safe_load(config)


def register_component_callbacks(app):
    """Callbacks for interactive user interfaces."""
    # URL Routing Component
    @app.callback(
        Output("page-content", "children"),
        [
            Input("url", "pathname"),
        ],
    )
    def display_page(pathname):
        """Return the selected view:

        :param pathname: A string, the current page view.
        """

        if "print" in pathname.lower():
            page = layout.create_printable_report()
        else:
            page = layout.create_report()

        return page

    # Trial Selector Component
    @app.callback(
        [
            Output("trial-selector", "options"),
            Output("trial-selector", "value"),
        ],
        [
            Input("interval-component", "n_intervals"),
            Input("trial-selector", "value"),
        ],
        State("endpoint-session", "data"),
    )
    def trial_request(n, dropdown_value, endpoint):
        options = query_functions.get_trials(endpoint)

        if dropdown_value == 0:
            dropdown_value = options[-1]["value"]

        return options, dropdown_value

    # Upload Component
    @app.callback(
        [
            Output("csv-message", "children"),
            Output("csv-session", "data"),
            Output("csv-filename-session", "data"),
        ],
        [Input("upload-data", "contents")],
        [State("csv-session", "data"), State("upload-data", "filename")],
    )
    def csv_upload(contents, data, filename):
        upload_data = utils.get_csv_data(contents)
        data = upload_data[0].to_json()
        csv_msg = upload_data[1]

        return csv_msg, data, filename

    # Indicator Components
    @app.callback(
        [
            Output("entity-retrieval-time", "children"),
            Output("event-retrieval-time", "children"),
            Output("event-retrieval-time", "value"),
        ],
        [
            Input("interval-component", "n_intervals"),
            Input("trial-selector", "value"),
        ],
        State("endpoint-session", "data"),
    )
    def endpoint_request(n, trial, endpoint_session):
        """Return current endpoint request polling rate and data retrieval time for trial-event and entity."""
        event_filter = f"?trial={trial}"
        if endpoint_session:
            entity_url = f"{endpoint_session}{cfg['mole']['endpoints']['entity']}"
            event_url = (
                f"{endpoint_session}{cfg['mole']['endpoints']['event']}{event_filter}"
            )
        else:
            entity_url = f"{cfg['mole']['api']}{cfg['mole']['endpoints']['entity']}"
            event_url = (
                f"{cfg['mole']['api']}{cfg['mole']['endpoints']['event']}{event_filter}"
            )

        entity_retrieval_time = utils.data_retrieval_time(entity_url)
        event_retrieval_time = utils.data_retrieval_time(event_url)

        return (
            f"{entity_retrieval_time}",
            f"{event_retrieval_time}",
            event_retrieval_time,
        )

    # Event Generator Component
    @app.callback(
        [
            Output("modal-centered", "is_open"),
            Output("event-gen-modal", "children"),
            Output("close-centered", "n_clicks"),
            Output("generate-events", "n_clicks"),
            Output("generator-output", "children"),
            Output("api-error", "children"),
        ],
        [
            Input("generator-button", "n_clicks"),
            Input("generate-events", "n_clicks"),
            Input("close-centered", "n_clicks"),
            Input("modal-centered", "is_open"),
        ],
        State("endpoint-session", "data"),
    )
    def event_generator(open_modal, gen_events, close_modal, is_open, endpoint):
        """Opens a dialog to executes event generator script."""
        if open_modal == 0:
            raise PreventUpdate
        else:
            is_open = True

        error_message = None
        utilities = "/utilities/mock_events.py"
        config = "/utilities/config/modified_example_config.json"

        trial_endpoint = f"{endpoint}{cfg['mole']['endpoints']['trial']}"
        get_current_trial = query_functions.api_request(trial_endpoint)
        curr_trial = get_current_trial[get_current_trial["current"] == True][
            "name"
        ].iloc[0]

        if close_modal:  # or gen_events:
            is_open = False
            close_modal = None

        elif gen_events:
            cmd = ["python3", utilities, "-seq", config]
            p = subprocess.Popen(
                cmd, shell=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE
            )

            dataline = p.stderr.readline().decode("UTF-8").replace("\n", "")

            time.sleep(1)  # For spinner to display for at least a second
            dataline = dataline.replace(" ", "")
            data = dataline.split(",")

            if "Requesttogeteventtypesfailed" in data:
                error_message = dbc.Alert(
                    html.Div(
                        [
                            dcc.Markdown(
                                f"""REQUEST ERROR :: Check config and try again. Mole **credentials** may be missing or incorrect."""
                            )
                        ]
                    ),
                    color="danger",
                    dismissable=True,
                )
            elif "Requestsuccessful" in data:
                error_message = dbc.Alert(
                    html.Div(
                        [
                            dcc.Markdown(
                                f"""REQUEST INFO -- Events are posted to **{curr_trial}**."""
                            )
                        ]
                    ),
                    color="success",
                    dismissable=True,
                )

            is_open = False
            gen_events = None

        modal_body = html.Div(
            [
                dcc.Markdown(
                    f"""Event generator will post events to **{curr_trial}**."""
                ),
            ],
        )

        return (
            is_open,
            modal_body,
            close_modal,
            gen_events,
            dbc.Spinner(color="light"),
            error_message,
        )

    # Mole Input Configuration Component
    @app.callback(
        [
            Output("generate-events", "style"),
            Output("endpoint-url", "style"),
            Output("endpoint-url", "placeholder"),
            Output("endpoint-session", "data"),
        ],
        [
            Input("endpoint-url", "value"),
            Input("username", "value"),
            Input("password", "value"),
        ],
        State("endpoint-session", "data"),
    )
    def input_configuration(endpoint, username, password, endpoint_session):
        """Configure endpoing request polling interval and event generator."""

        if username and password:
            button_style = {
                "float": "right",
                "margin-rigth": "0px",
                "background-color": "#28a745",
            }
        else:
            button_style = {"float": "right", "margin-rigth": "0px"}

        if endpoint:
            endpoint_session = endpoint

            try:
                r = requests.get(endpoint)

                if r.status_code == 200:
                    endpoint_style = {
                        "border-color": "#28a745",
                        "margin-left": "0px",
                        "width": "200px",
                    }
                else:
                    endpoint = None

            except (
                requests.exceptions.MissingSchema,
                requests.exceptions.ConnectionError,
            ):
                endpoint_style = {
                    "border-color": "red",
                    "margin-left": "0px",
                    "width": "200px",
                }
                endpoint = None
                endpoint_session = cfg["mole"]["api"]

        else:
            if endpoint_session is None:
                endpoint_session = cfg["mole"]["api"]

            endpoint_style = {"margin-left": "0px", "width": "200px"}

        config = "/utilities/config/example_config.json"
        with open(config, "r") as jsonFile:
            data = json.load(jsonFile)

        new_endpoint = re.search("http://(.*):8000/api", str(endpoint_session))
        data["mole"] = new_endpoint.group(1)
        data["username"] = username
        data["password"] = password

        new_config = "/utilities/config/modified_example_config.json"

        with open(new_config, "w+") as jsonFile:
            json.dump(data, jsonFile)

        return button_style, endpoint_style, endpoint_session, endpoint_session

    @app.callback(
        [
            Output("interval-component", "interval"),
            Output("request-interval-indicator", "children"),
            Output("request-interval", "style"),
            Output("polling-error", "children"),
        ],
        [
            Input("event-retrieval-time", "value"),
            Input("request-interval", "value"),
            Input("request-interval", "n_submit"),
            Input("request-interval", "n_blur"),
        ],
    )
    def input_configuration(event_ret_time, input_interval, n_submit, n_blur):
        """Configure endpoing request polling interval and event generator."""
        error_message = None
        default_interval = cfg["dash_app"]["request_interval_s"]

        try:
            current_interval = float(event_ret_time) + default_interval
        except ValueError:
            current_interval = default_interval

        if input_interval is None:
            # Automatically increase default polling rate if the time to acquire endpoint data increases
            input_interval = int(current_interval) * 1000

        else:
            try:
                input_interval = int(input_interval)
                if input_interval < current_interval:
                    error_message = dbc.Alert(
                        f"Input interval ({input_interval}s) must be greater than the current polling interval and event data endpoint retrieval time ({current_interval}s).",
                        color="danger",
                        dismissable=True,
                    )
                    input_interval = int(round(current_interval)) * 1000
                else:
                    input_interval = input_interval * 1000

            except (TypeError, ValueError):
                error_message = dbc.Alert(
                    f"Input interval ({input_interval}) must be a valid integer.",
                    color="danger",
                    dismissable=True,
                )
                input_interval = int(round(current_interval)) * 1000

        if n_submit is None and n_blur is None:
            interval_style = {"margin-left": "0px", "width": "110px"}
        elif n_submit or n_blur:
            interval_style = {
                "margin-left": "0px",
                "border-color": "#28a745",
                "width": "110px",
            }

        return (
            input_interval,
            f"{int(input_interval/1000)}",
            interval_style,
            error_message,
        )

    # Export Componenet
    @app.callback(
        [
            Output("export_output", "color"),
            Output("export", "n_clicks"),
        ],
        [
            Input("export", "n_clicks"),
            Input("interval-component", "n_intervals"),
            Input("trial-selector", "options"),
            Input("csv-session", "data"),
            Input("csv-filename-session", "data"),
            Input("url", "pathname"),
        ],
        State("endpoint-session", "data"),
    )
    def export_figures(nclicks, n, trials, data, filename, pathname, endpoint):
        """Export all figures in /data/graph_functions with export decorator:

        :param nclicks: An integer, represents number of times a button has been clicked.
        :param pathname: A string, the current page view.
        :param contents: A base64 encoded string, the uploaded csv data.
        """

        if nclicks == 0:
            raise PreventUpdate

        if pathname == cfg["dash_app"]["pathname"]["report"]:
            plot_color = "white"
        else:
            plot_color = "#F0F3F8"

        if not endpoint:
            endpoint = cfg["mole"]["api"]

        graph_functions.export_figures(
            source="api",
            endpoint=endpoint,
            trial=trials,
            csv=None,
            filename=None,
            font_color=None,
            plot_color=plot_color,
            height=700,
            width=1250,
        )

        graph_functions.export_figures(
            source="csv",
            endpoint=None,
            trial=None,
            csv=data,
            filename=filename,
            font_color=None,
            plot_color=plot_color,
            height=700,
            width=1250,
        )

        return "light", 0

    # Print Export Component
    app.clientside_callback(
        """
        function(n, n_clicks) {
            if(n_clicks > 0) {
                curr_trial = document.getElementById("trial-selector").textContent;
                performer = curr_trial.split(" ")[1];
                report_name = "{0}_{1}_run_report.pdf".format(curr_trial.split(" ")[0], performer.replace(/[()]/g, ''));
                
                var opt = {
                    margin: [-0.5, 0, 0, 0.15],
                    filename: report_name,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 3},
                    jsPDF: { unit: 'in', format: 'a3', orientation: 'p' },
                    pagebreak: { mode: ['avoid-all'] }
                };
                export_pdf = html2pdf().from(document.getElementById("page-content")).set(opt).save();
            }
        }

        // Python3 str.format() equivalent in JS
        String.prototype.format = function() {
            var formatted = this;
            for( var arg in arguments ) {
                formatted = formatted.replace("{" + arg + "}", arguments[arg]);
            }
            return formatted;
        };
            
        """,
        Output("js", "n_clicks"),
        Input("interval-component", "interval"),
        Input("js", "n_clicks"),
    )
