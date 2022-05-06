FROM python:3.7

RUN apt update && apt install -y redis-server binutils libproj-dev gdal-bin postgresql-client sudo curl graphviz

# RUN mkdir tmp
ADD requirements.txt /tmp/

RUN pip install -r /tmp/requirements.txt

ARG NEWUSERID
ENV NEWUSERID=${NEWUSERID:-1000}
RUN useradd -u "${NEWUSERID}" -m django
USER django

COPY --chown=django . /home/django/mole/

# Retrieve build tag from build-time arg
ARG BUILD_TAG
# Persist the build tag in the image after the build
ENV BUILD_TAG=${BUILD_TAG:-latest}

# Retrieve long-form build tag from build-time arg
ARG LONG_BUILD_TAG
ENV LONG_BUILD_TAG=${LONG_BUILD_TAG:-latest}
