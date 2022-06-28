from dash import html
from dash import dcc

import dash_bootstrap_components as dbc

import report_generator.data.query_functions as qf


def create_figure(id, className="chart_div"):
    """Return a plotly figure wrapped in a custom div:

    :param id: A string, the callback id.
    :param className: A string, can be 'chart_div' (default) or any other style class key.
    """
    return html.Div(
        children=dcc.Graph(id=id),
        style={
            "background-color": "#FAFAFA",
            "height": "auto",
            "width": "100%",
            "margin-top": "1rem",
        },
        className=className,
    )


def indicator(text, id):
    """Return a content container for text:

    :param text: A string, the indicator's title/name.
    :param id: A string, the callback id.
    """
    return html.Div(
        [
            html.P(id=id, className="indicator_value"),
            html.P(text, className="twelve columns indicator_text"),
        ],
        className="two columns indicator pretty_container",
    )


def dropdown(id, selection, endpoint):
    """Return a dropdown:

    :param id: A string, the callback id.
    :param selection: A string, used to dynamically configure Dropdown properties.
    """

    if selection == "trial":
        options = qf.get_trials(endpoint)

    try:
        return html.Div(
            children=[
                html.Div(
                    dcc.Dropdown(
                        id=id,
                        options=options,
                        value=options[-1]["value"],
                        style={"marginTop": "0.5rem"},
                    ),
                )
            ]
        )
    except IndexError:
        options = [{"label": "N/A", "value": 1}]
        return html.Div(
            children=[
                html.Div(
                    dcc.Dropdown(
                        id=id,
                        options=options,
                        value=options[-1]["value"],
                        style={"marginTop": "0.5rem"},
                    ),
                )
            ]
        )


def button(name, id, style, className):
    """Return a buttons:

    :param name: A string, the
    :param id: A string, the callback id.
    :param style: A string, the style property.
    :param className: A string, the style class key.
    """
    return dbc.Button(name, id=id, n_clicks=0, style=style, className=className,)


def input(id, debounce, placeholder, style, className):
    """Return a input box:"""
    return dcc.Input(
        id=id,
        type="text",
        debounce=debounce,
        placeholder=placeholder,
        style=style,
        className=className,
    )
