
#!/usr/bin/env python3
import math
import json
from datetime import datetime, timezone
import os

from pulsar import Function
import requests
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

body = {
    "fqfn": "public/default/influx",
    "py": "/pulsar/functions/influx.py",
    "className": "influx.Breadcrumb",    
    "topicsPattern": "persistent://public/default/node_.*",
    "logTopic": "persistent://public/default/influx_log",
}


class Breadcrumb(Function):
    def __init__(self):
        pass

    def process(self, input, context):
        logger = context.get_logger()
        node = context.get_current_message_topic_name().split("/")[-1]
        logger.info(f"Received msg from {node}")

        influx_ip = os.environ.get("INFLUXDB_IP", "influxdb")
        influx_port = os.environ.get("INFLUXDB_PORT", 8086)
        org = os.environ.get("INFLUX_ORG", "influx_org")
        token = os.environ.get("INFLUX_TOKEN", "CZ97TbfV4jn9HjpKGrJEDbib7xlzPGE4PtNPyYNn9zp3VJZr3-BwhBGj10Wr7DufX41xjwizHwGOr9F0v0EVKw==")
        bucket = os.environ.get("INFLUX_BUCKET", "influx_bucket")

        with InfluxDBClient(url=f"http://{influx_ip}:{influx_port}", token=token, org=org) as influx_client:
            with influx_client.write_api(write_options=SYNCHRONOUS) as write_api:
                logger.info("Connected to Influxdb...")
                input_dict = json.loads(input)

                if not isinstance(input_dict,list):
                    list_of_dict = [input_dict]
                else:
                    list_of_dict = input_dict

                for single_dict in list_of_dict:
                    point = Point(node)
                    # point = point.tag()
                    for k,v in single_dict.items():
                        point.field(k,v)
                    try:
                        write_api.write(bucket=bucket, record=point)
                        logger.info(f"Wrote {point}")
                    except Exception as e:
                        logger.warn(f"Failed to write to {node} - {e}")
