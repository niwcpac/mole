/usr/bin/python -m pytest -s tests/

# Django tests can take a long time to run unless the pulsar container is left up.
echo "Pulsar tests complete. Leaving container running for remaining tests"
tail -f /dev/null
