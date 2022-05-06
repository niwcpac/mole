import os
import time

import requests

PULSAR_IP = os.environ.get("PULSAR_IP", "pulsar")
PULSAR_PORT = os.environ.get("PULSAR_PORT", 8080)

def pytest_configure(config):
    print("Waiting for pulsar event generator to set up")
    while True:
        r = None
        try:
            r = requests.get(
                f"http://{PULSAR_IP}:{PULSAR_PORT}/admin/v3/functions/public/default/_simple_event_gen",
            )
        except requests.RequestException as e:
            print(e)
            print("waiting...")
        if r and r.ok:
            print("Pulsar finished setting up event generator")
            break

        time.sleep(3)