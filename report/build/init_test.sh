#!/usr/bin/env bash

echo "Checking if Django running"

until $(curl --output /dev/null --silent --fail "http://django:8000/api"); do
  echo "Django is unavailable -- sleeping"
  sleep 1
done

echo "Django is up - executing command"

exec gunicorn report_generator.app:server --bind :8400 --workers 5 --timeout 90