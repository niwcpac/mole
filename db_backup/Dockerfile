FROM jobber:1.4.0-alpine3.10

USER root

RUN apk --no-cache add postgresql-client tzdata bash make py3-pip python3-dev g++ curl shadow

ADD requirements.txt /tmp/
RUN pip3 install -r /tmp/requirements.txt

# Set jobberuser uid to that of current host user (set by ml script).
ARG NEWUSERID
RUN usermod -u "${NEWUSERID}" jobberuser
RUN groupmod -g "${NEWUSERID}" jobberuser
RUN usermod -g "${NEWUSERID}" jobberuser
RUN mkdir -p "/var/jobber/${NEWUSERID}"
RUN chown -R jobberuser:jobberuser "/var/jobber/${NEWUSERID}"

COPY db_backup_entrypoint.sh /db_backup_entrypoint.sh
RUN chmod 755 /db_backup_entrypoint.sh

COPY perform_backup.sh /perform_backup.sh
RUN chmod 755 /perform_backup.sh

COPY backup_api/ /backup_api/

COPY --chown=jobberuser .jobber /.jobber
RUN chmod 0600 /.jobber

USER jobberuser
WORKDIR /home/jobberuser

ENV JOBBER_ARGS="-u /var/jobber/${NEWUSERID}/cmd.sock /.jobber"
# ENV JOBBER_ARGS="-u /var/jobber/1000/cmd.sock /.jobber"

# Retrieve build tag from build-time arg
ARG BUILD_TAG
# Persist the build tag in the image after the build
ENV BUILD_TAG=${BUILD_TAG:-latest}

# Retrieve long-form build tag from build-time arg
ARG LONG_BUILD_TAG
ENV LONG_BUILD_TAG=${LONG_BUILD_TAG:-latest}

CMD /usr/libexec/jobberrunner ${JOBBER_ARGS}

ENTRYPOINT ["/db_backup_entrypoint.sh"]