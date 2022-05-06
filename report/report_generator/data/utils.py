import base64
import io
import time
import pathlib
import pandas as pd

from dash import html

import dash_bootstrap_components as dbc

from report_generator.data.query_functions import api_request

import report_generator.layout as lay

PATH = pathlib.Path(__file__).parent
DEFAULT_DATA = pd.read_csv(PATH.joinpath("csv/mole_endpoint_examples.csv"))


def get_csv_data(contents):
    upload_message = None

    # Try reading uploaded file
    if contents:
        content_type, content_string = contents.split(",")

        try:
            decoded = base64.b64decode(content_string)
            data = pd.read_csv(io.StringIO(decoded.decode("utf-8")))
            upload = True

            upload_message = dbc.Alert(
                "File Successfully Uploaded",
                color="success",
                dismissable=True,
                style=lay.margin(),
            )

        except:
            # Invalid uploaded
            data = DEFAULT_DATA
            upload_message = dbc.Alert(
                "There was an error processing this file.",
                color="danger",
                dismissable=True,
                style=lay.margin(),
            )

    else:
        # Use default csv data found in /data
        data = DEFAULT_DATA
        upload = False

    return data, upload_message


def data_retrieval_time(url):
    try:
        start_time = time.time()
        endpoint = api_request(url)

        if endpoint.empty:
            retrieval_time = "N/A"
        else:
            retrieval_time = "{}".format(round((time.time() - start_time), 3))

    except:
        retrieval_time = "N/A"

    return retrieval_time
