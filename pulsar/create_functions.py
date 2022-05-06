#!/usr/bin/python3
import json
import time
import importlib
import argparse
import os
import os.path

import requests
from requests_toolbelt import MultipartEncoder

pulsar_ip = os.environ.get("PULSAR_IP", "pulsar")
pulsar_http_port = 8080
django_ip = os.environ.get("DJANGO_IP", "django")
django_port = 8000


def post_function(body):
    api_url = f"http://{pulsar_ip}:{pulsar_http_port}/admin/v3/functions/{body['fqfn']}"
    mp_encoder = MultipartEncoder(
        fields={
            "url": f"file://{body['py']}",
            "functionConfig": (None, json.dumps(body), "application/json"),
        }
    )
    headers = {"Content-Type": mp_encoder.content_type}

    while True:
        r = requests.get(api_url)
        if r.ok:
            # skip creating the pulsar function
            print(f"Pulsar function already exists, skipping creation: {api_url}")
            break

        print(f"posting function: {body['fqfn']}")
        r = requests.post(api_url, data=mp_encoder, headers=headers)
        if r.ok:
            break
        print(r.status_code, r.content)
        time.sleep(1)


def post_pulsar_functions(func_list):
    if "all" in func_list:
        functions_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "functions/"
        )
        choices = [
            x[:-3]
            for x in filter(
                lambda x: not x.startswith("_") and x.endswith(".py"),
                os.listdir(functions_path),
            )
        ]
        for mod in choices:
            module = importlib.import_module(f".{mod}", "functions")
            if module.body:
                post_function(module.body)
    else:
        for mod in func_list:
            module = importlib.import_module(f".{mod}", "functions")
            if module.body:
                post_function(module.body)


if __name__ == "__main__":
    while True:
        r = None
        try:
            r = requests.get(
                f"http://{pulsar_ip}:{pulsar_http_port}/admin/v2/worker/cluster/leader/ready"
            )
        except requests.RequestException as e:
            print(e)
            print("Pulsar not up, waiting...")
            time.sleep(1)
        if r and r.ok:
            break

    functions_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "functions/"
    )
    choices = [
        x[:-3]
        for x in filter(
            lambda x: not x.startswith("_") and x.endswith(".py"),
            os.listdir(functions_path),
        )
    ]
    choices.append("all")

    parser = argparse.ArgumentParser(description="Post Apache Pulsar functions.")
    parser.add_argument(
        "functions",
        nargs="*",
        choices=choices,
        default="all",
        help="list of functions to post, default will post all functions",
    )

    args = parser.parse_args()
    post_pulsar_functions(args.functions)
