# **Getting Started**

## **Requirements**
1) Docker

Add docker apt repository, install Docker, create `docker` group and add the user to it, then start the service. See [https://docs.docker.com/engine/install/ubuntu/](https://docs.docker.com/engine/install/ubuntu/)

    $ sudo apt-get update
    $ sudo sudo apt-get install apt-transport-https ca-certificates curl gnupg lsb-release
    $ curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    $ echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    $ sudo apt-get update
    $ sudo apt-get install docker-ce docker-ce-cli containerd.io

    $ sudo groupadd docker
    $ sudo usermod -aG docker $USER
    $ sudo service docker start
Reboot, then confirm docker is running.
    
    $ docker run hello-world

!!! tip "Note"
    If building the Docker containers hangs in the Mole initialization step below, see [Configuring Docker to Use a Different DNS Server](#configuring-docker-to-use-a-different-dns-server).  This may be due to Docker's default DNS server (Google's 8.8.8.8) being blocked on your network.

2) docker-compose

Install Docker-Compose locally, set permissions, and modify the path. See [https://docs.docker.com/compose/install/](https://docs.docker.com/compose/install/)

    $ sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    $ sudo chmod +x /usr/local/bin/docker-compose
    $ sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

Confirm that docker-compose is installed

    $ docker-compose --version

!!! tip "Note"
    In order for Mole to automatically generate keys/certificates for https, the `openssl` command must be installed on the host. This is generally the case by default.

3) Poetry

Requires Python 3.7+ (Windows, MacOS, Linux). See Poetry [System/Install Requirememets](https://python-poetry.org/docs/#system-requirements) for further instructions.

    $ curl -sSL https://install.python-poetry.org | python3 - --version 1.2.0

Confirm Poetry is installed

    $ poetry --version

Setup poetry virtual enviroment. Ensure the command is ran in the same directory as `pyproject.toml` and `poetry.lock`.

    $ poetry install
## **Services**
Mole is composed of a number of different services including the following:
    
* **proxy**     : A Traefik-based reverse proxy to expose services at paths and via https.
                  Accessible on host port 8080 (<http://localhost:8080>)
* **postgres**  : A PostgreSQL database server.
                  Accessible on host port 5432.
* **pulsar**    : An Apache Pulsar server. Pulsar is the native messaging platform for Mole.
                  Accessible on host ports 6650.<br>
                  The Admin API is available at <http://localhost:8090><br>
* **django**    : A Django-based REST API server.  It also serves static frontend content.
                  Accessible on host port 8000 (e.g., <http://localhost:8000>) or domain root (e.g., <http://localhost>)<br>
                    - **Note:** A browseable API is also available at /api/. (e.g., <http://localhost/api/>)
* **angular**    : An Angular development server. As changes are made in the code, the server live-updates the UI.
                  Accessible on host port 4200 (e.g., <http://localhost:4200>) or at the path <http://localhost/angular/><br>
                    - **Note:** Only accessible after running `./ml ang` or `-a` flag on `run` script
* **redis**     : A Redis server.<br>
                    - **Note:** By default the redis service is not exposed outside of the Docker network. To expose Redis externally, use the `--unlock-redis` command line option to `./ml init` or `./ml run` or set the `UNLOCK_REDIS` environment variable on the host machine. When exposed, Redis will be accessible on host port 6379.
* **docs**      : A Mkdocs-based documentation server.
                  Accessible on host port 8001 (e.g., <http://localhost:8001>) or at the path <http://localhost/docs/>
* **maptiles**  : A TileServerGL-based map tile server.
                  Accessible on host port 8081 (e.g., <http://localhost:8081>) or at the path <http://localhost/maps/>
* **report**    : A Plotly Dash-based data visualization and report server.
                  Accessible on host port 8400 (e.g., <http://localhost:8400>) or at the path <http://localhost/report/>
* **portainer** : A Portainer Docker management and monitoring server.
                  Accessible on host port 9000 (e.g., <http://localhost:9000>) or at the path <http://localhost/portainer/> with:<br> 
                    - **user:** `admin`<br>
                    - **password:** `password`


## **Https (optional)**
All http endpoints can be made available via https. Certificates/keys are automatically generated the first time `./ml init` is run. See below to generate new keys.

### **Adding the Mole Certificate Authority certificate to Chrome**

!!! failure "Warning"
    Please ensure you understand the security implications before importing the Mole Certificate Authority into your browser.

In order to "trust" the Mole certificate, perform the following:

* Open Chrome `Settings`
* Select `Security`
* Select `Manage Certificates`
* Select `Authorities`
* Click `Import`
* Browse to the location of the Mole repository under `mole/traefik/certificates`
* Select `moleCA.pem`
* Click `Trust this certificate for identifying websites`

If you are trying to "trust" the Mole certificate on a machine other than the Mole server, first copy the `mole/traefik/certificates/moleCA.pem` file from the Mole server to an accssible location, then browse to this location when selecting the certificate to import.

!!! tip "Note"
    Once the Mole Certificate Authority certificate has been imported it should be at the top of the list as `org-_Mole`. If the CA certificate is updated in the server, it must be replaced in the browser as well.
    
### **Generating keys**
Although `./ml init` automatically generates keys/certificates the first time it is run, it may be useful to replace or update them for various reasons. The `./ml` script includes a helper to generate new keys: `./ml keys`. 

This helper has options for selectively generating only the certificate authority (`./ml keys --ca`) or the server (`./ml keys --server`) keys. This is useful, for example, to re-generate the server keys while keeping the same certificate authority.

In order for the certificate to be valid for hosts or IPs other than `localhost` or `127.0.0.1`, the desired hosts/IPs must be added to `traefik/configuration/cert.ext` under the `alt_names` section.

Once the `cert.ext` file has been updated with new hosts/IPs, a new server certificate must be generated using `./ml key --server`. This will generate a new "server" certificate using the existing Certificate Authority. I.e., no new Certificate Authority key/cert is generated when the `--server` flag is used.

!!! tip "Note"
    Once the server certificate has been updated with new hosts/IPs, Chrome should automatically trust the new one for those IPs. I.e., there is no need to re-import the Mole Certificate Authority in Chrome unless it was re-generated as well.





## **Running**
The `ml` script at the root of the Mole repo can be used to build containers, start services, populate dbs, stop services, 
or build and serve documentation.  It is structured with a number of subcommands.  Additional help on each command 
can be found by passing the `--help` flag.  E.g., `./ml run --help`.

If this is the first time you are running Mole, use the following command to configure Mole and initialize the database with defaults:

    $./ml init

!!! failure "Warning"
    Mole is currently intended to be run within a trusted network. It has not yet been vetted for open-internet deployment. 

Subsequent runs can use:

    $./ml run

See below for additional information on the `./ml` command and examples of its use.

!!! tip "Note"
    If accessing the Mole dashboard produces an HTTP 500 error, the front end (Angular) files may not have been built. These can be built with the following command: `$ ./ml ang -b`


## **Commands**
* `init`  : Create the Docker containers and initialize a database
              based on the available configuration scripts. If no
              CONFIGURE_SCRIPT is specified, "configure_mole" is
              used. <br>
            - use `-a` flag to spin up angular development server<br>
            - use `-s` to skip the static front-end build process<br>
            - use `--deep-clean` to clear containers and volumes before init process<br>
* `keys`  : Generate CA or server keys/certificates for https.
* `run`   : Runs a pre-configured container.<br>
            - use `-q` flag to run as a daemon.<br>
            - use `--lite` flag to omit running superflous containters (e.g., portainer, docs, etc.)<br>
            - use `-a` flag to spin up angular development server<br>
* `stop`  : Stops all containers.
* `test`  : Runs the Django unit tests. Note: Mole does not run
              with this command.  
* `shell` : Brings up all containers and starts interactive shell.
              Note: Mole does not run in this mode.  
* `docs`  : Build documentation (including OpenAPI schema and graphing database models). Documentation is served at <http://localhost:8001> or <http://docs.localhost>.
* `maps`  : Serve map tiles at <http://localhost:8081> or <http://maps.localhost>.  Note: Mole does not 
              run with this command.  See Docs for more information.
* `db`   : Saves and loads database + media backup archives.<br>
            - use `-b` flag to create a backup archive
            - use `-l` flag to load a backup archive
* `management` : Load/Save docker images to or from an archive file. 
                This archive file can be used to export docker images for use
                on external machines. Also builds containers from images 
                in the local repo. 
* `django` : Provides set of tools to interact with Django container. Currently supports 
              the `makemigrations` command with `-mm` flag.
* `ang`   : Spins up Angular development server.<br>
            - use `-b` flag to build the angular files to be served statically from Django


## **Examples**
The following command will build containers and populate the database with initial data using the default "configure_mole" script:

    $./ml init

!!! tip "Note"
    See below if building the containers hangs.  This may be due to Docker's default DNS server (Google's 8.8.8.8) being blocked on your network.

The following command will build containers and populate the database with initial data using a custom "configure_mole" script (configure_mole_test):

    $./ml init configure_mole_test


The following command will run previously built containers as a daemon:

    $./ml run -q

Mole is available at [http://localhost](http://localhost).  The browseable API is available at [http://localhost/api](http://localhost/api)

!!! tip
    Documentation is also accessible at [http://localhost/docs](http://localhost/docs) when Mole is running.


The following command will run previously built containers, but not run the map tile server:

    $./ml run --nomaps

The following command will stop running containers:

    $./ml stop

The following command will spin up the Angular development server:

    $./ml ang

The following command will build the Angular files to be served statically from Django:

    $./ml ang -b

The following command will build and serve the Mole documentation:

    $./ml docs

The following command will run the Mole map tile server alone:

    $./ml maps
    
!!! tip "Note"
    See [maps](maps.md) section of documentation for information on creating tiles and configuring the map server.

The following command will run the automated tests:

    $./ml test
    
The following command will build Django migration files if schema changes have been made:

    $./ml django -mm

## **Database Backups**

By default, Mole produces database backups before an init and before a database is 
loaded, however it has the capability to perform the automatic backups listed below 
if the `-db` flag is used on the `init` or `run` commands.
  
* On startup (`./ml run -db`)
* On shutdown (`^c` or `./ml stop`)
* Periodically (at the top of every hour)

Regardless of the `-db` flag being used, backups can be created at anytime using the 
command below.

* On demand (`./ml db -b`)

!!! tip
    If you would like to not perform a database backup prior to an init, you can use the 
    `-nb` flag on the init command: `./ml init -nb`

!!! tip
    On-demand backups (`./ml db -b`) can be created with Mole running or stopped; services will be returned to their pre-backup state. 

In all cases, backups are ultimately launched via a web service. A `GET` request to <http://localhost:8003/backup_db/> or <http://backup.localhost/backup_db/> will launch a database backup job. This service is throttled to approximately one request per minute.

!!! tip
    The database backup web service includes an interactive API documentation served at <http://localhost:8003/docs/> or <http://localhost/db_backup/docs/>

There are two optional querystring parameters for the backup service:

* `context` represents a string that will be appended to the end of the backup filename to indicate the context for the creation of the backup. (e.g., "startup", "shutdown", "on-demand", etc.). For example a `GET` request to <http://localhost/db_backup/backup_db/?context=docs> (via browser, curl, or otherwise) would initiate a database backup with `_docs` appended to the end of the filename.
* `sync` indicates that the request shouldn't return a response until the backup has been completed. This is useful if a subsequent action (e.g., clearing the database) needs to ensure the backup has been completed prior to preceeding. Normally the backup call returns immediately and launches the database backup job in the background. Example: <http://localhost/db_backup/backup_db/?sync=true>.

!!! tip "Note"
    To include both `context` and `sync` querystrings, separate them with an ampersand (`&`) symbol, e.g., <http://localhost/db_backup/backup_db/?context=docs&sync=true>. If this is done from a terminal `curl` command, ensure to wrap the url in quotation marks so the `&` isn't interpreted as a request to background the job. Example: `curl "http://localhost/db_backup/backup_db/?context=docs&sync=true"`

### Database Backup Location
Saved database archives are stored in the `db_backup/backups/` directory.  The naming convention is `mole_backup_<year>-<month>-<day>_<hour>_<minute>-<second>_<stage>.sql` where `<stage>` is a string that indicates the reason the database file was created (e.g., "start_up", "shutdown", "pre-init", "pre-load", "on_demand", "periodic")

### Restoring from a Database Backup Archive
Database files can be restored using the following command: `./ml db -l <archive-name>` where the location of `<archive-name>` is assumed to be in `db_backup/backups/`. Mole supports loading standalone sql backups, as well as the default 
archive format. Mole is also able to import backups from outside of the `db_backups/backups` 
directory if the absolute filepath is provided.

## **Exporting Docker Images to an External Host**

To run the Docker containers you must have Docker images in a local repo. Normally, these containers are built
and configured when we execute the `init` command. However, when a host is unable to access outside networks, it will
be unable to build images on initialization. You can load archived images with the `ml manage` command, and run
preconfigured images. 

!!! tip "Note"
    This feature is currently unable to export on machines with differing architectures. 

Process:
1) Save project images that have already been populated and constructed. To save all project Docker images into a single 
    archive use the following command

    ./ml manage -s

   this will save the project Docker images to archive `mole_project.tar.gz`

2) You may now export the archive to another host. Simply save to external media or transfer if you have that option.

3) Load the images on the new machine:
    
    ./ml manage -l mole_project.tar.gz

4) Build the containers:
    
    ./ml manage -b
   
   or

    ./ml run


## **Configuring Docker to Use a Different DNS Server**

To configure Docker on Ubuntu to use the DNS server listed, edit `/lib/systemd/system/docker.service` and replace the line 

    ExecStart=/usr/bin/dockerd -H fd:// 
    
with 

    ExecStart=/usr/bin/dockerd --dns <desired_DNS> -H fd://

You can find out what your current DNS server is with the following command:

    nmcli dev show | grep 'IP4.DNS'

!!! info "Note"
    This is only necessary if building the container images hangs due to the default DNS server being blocked on your network. 