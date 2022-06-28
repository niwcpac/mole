from dash import dcc
from dash import html

import dash_bootstrap_components as dbc

import report_generator.dash.report_modules as rm
import report_generator.layout as lay


def csv_upload_card():
    """Return a customized card for CSV uploader."""
    csv_upload_card = lay.card(
        dcc.Upload(
            id="upload-data",
            className="upload",
            children=html.Div(
                children=[
                    html.P("Drag and Drop or "),
                    html.A("Select "),
                    html.P("CSV File"),
                ],
            ),
            accept=".csv",
        )
    )

    return csv_upload_card


def csv_upload_instruction(id):
    """Return upload instructions in Markdown and data table preview of the uploaded data."""
    csvInstruction = lay.card(
        html.Div(
            [
                html.Div(children=dcc.Graph(id=id,),),
                dcc.Markdown(
                    """Sample datas are found in `/report/report_generator/data/csv/.`"""
                ),
            ],
            className="instruction",
        )
    )

    return csvInstruction


def layout():
    return html.Div(
        [
            dcc.Store(id="csv-session", storage_type="session"),
            dcc.Store(id="csv-filename-session", storage_type="session"),
            csv_upload_card(),
            html.Div(id="csv-message"),
            csv_upload_instruction(id="csv_table"),
        ],
        className="report__body",
    )
