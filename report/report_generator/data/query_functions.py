import yaml
import pathlib
import requests
import io
import numpy as np
import pandas as pd

from ast import literal_eval

PATH = pathlib.Path(__file__).parents[1]
with open(f"{PATH}/config.yml", "r") as config:
    cfg = yaml.safe_load(config)


def api_request(source):
    """Make an API GET-request and return endpoint data as a dataframe."""

    try:
        r = requests.get(source)

        if r.status_code == 200:
            data = r.content
            endpoint_data = pd.read_csv(io.StringIO(data.decode("utf-8")))
        else:
            endpoint_data = pd.DataFrame()

    except:
        endpoint_data = pd.DataFrame()

    return endpoint_data


def get_trials(endpoint):
    options = []
    trial = 0

    if endpoint:
        data = f"{endpoint}{cfg['mole']['endpoints']['trial']}"
    else:
        data = f"{cfg['mole']['api']}{cfg['mole']['endpoints']['trial']}"

    try:
        trials = api_request(data)
        trial_list = list(trials["id"])
        trial_name = list(trials["name"])

        for trial, name in zip(trial_list, trial_name):
            options.append({"label": str(name), "value": trial})
    except:
        options.append({"label": "N/A", "value": 0})

    return options
