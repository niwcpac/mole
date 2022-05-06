FROM python:3.7

RUN pip install requests==2.23.0 requests_toolbelt==0.9.1 redis==3.5.3 pulsar-client==2.7.0 asteval==0.9.21

WORKDIR /home/event_generator

COPY . .

# Retrieve build tag from build-time arg
ARG BUILD_TAG
# Persist the build tag in the image after the build
ENV BUILD_TAG=${BUILD_TAG:-latest}

# Retrieve long-form build tag from build-time arg
ARG LONG_BUILD_TAG
ENV LONG_BUILD_TAG=${LONG_BUILD_TAG:-latest}

CMD ["python", "message_cacher.py"]