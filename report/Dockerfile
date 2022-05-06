FROM python:3.7

RUN apt-get update -y && apt-get install -y binutils libproj-dev gdal-bin curl

COPY ./requirements.txt /requirements.txt

RUN pip install -r /requirements.txt

ARG NEWUSERID
ENV NEWUSERID=${NEWUSERID:-1000}
RUN useradd -u "${NEWUSERID}" -m report
USER report

COPY --chown=report ./build .
COPY --chown=report . /app

WORKDIR /app

# Retrieve build tag from build-time arg
ARG BUILD_TAG
# Persist the build tag in the image after the build
ENV BUILD_TAG=${BUILD_TAG:-latest}

# Retrieve long-form build tag from build-time arg
ARG LONG_BUILD_TAG
ENV LONG_BUILD_TAG=${LONG_BUILD_TAG:-latest}
