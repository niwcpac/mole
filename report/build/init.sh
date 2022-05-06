#!/usr/bin/env bash

exec gunicorn report_generator.app:server --bind :8400 --workers 5 --timeout 90