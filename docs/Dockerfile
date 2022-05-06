FROM python:3.7

# RUN mkdir tmp
ADD requirements.txt /tmp/

RUN pip install -r /tmp/requirements.txt

COPY . /docs

WORKDIR /docs

# Retrieve build tag from build-time arg
ARG BUILD_TAG
# Persist the build tag in the image after the build
ENV BUILD_TAG=${BUILD_TAG:-latest}

# Retrieve long-form build tag from build-time arg
ARG LONG_BUILD_TAG
ENV LONG_BUILD_TAG=${LONG_BUILD_TAG:-latest}

ENTRYPOINT [ "mkdocs", "serve" ]