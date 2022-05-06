FROM apachepulsar/pulsar:2.9.1

# hack to get python binary to use python3 and not python2
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3 10
RUN pip install requests==2.23.0 requests_toolbelt==0.9.1 pytest==6.0.1 redis==3.5.3 influxdb-client[ciso]==1.17.0 asteval==0.9.21

COPY . .

# Retrieve build tag from build-time arg
ARG BUILD_TAG
# Persist the build tag in the image after the build
ENV BUILD_TAG=${BUILD_TAG:-latest}

# Retrieve long-form build tag from build-time arg
ARG LONG_BUILD_TAG
ENV LONG_BUILD_TAG=${LONG_BUILD_TAG:-latest}
