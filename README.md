# **Mole**

![License (CC0)](https://img.shields.io/badge/license-CC0--1.0-brightgreen)

Mole is a tool to assist with testing and experimentation involving robots and autonomous systems. It can facilitate the following:

* **test and experiment execution**: tracking who, what, where, when, why, and how of the experiment
* **data collection**: acquiring targeted data based on *events* representing "conditions of interest"
* **orchestration**: controlling experiment infrastructure to enable dyamic yet repeatable scenarios
* **monitoring**: confirming system, infrastructure, and personnel status over time
* **analysis and reporting**: generating pre-defined performance metrics and figures to rapidly produce stakeholder reports

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

2) Docker Compose

Install Docker Compose plugin. See [https://docs.docker.com/compose/install/linux/#install-using-the-repository](https://docs.docker.com/compose/install/linux/#install-using-the-repository)

  $ sudo apt-get update
  $ sudo apt-get install docker-compose-plugin

Confirm that docker compose is installed

    $ docker compose --version

3) Poetry

Requires Python 3.7+ (Windows, MacOS, Linux). See Poetry [System/Install Requirememets](https://python-poetry.org/docs/#system-requirements) for further instructions.

    $ curl -sSL https://install.python-poetry.org | python3 - --version 1.2.0

Confirm Poetry is installed

    $ poetry --version

Setup poetry virtual enviroment. Ensure the command is ran in the same directory as `pyproject.toml` and `poetry.lock`.

    $ poetry install

4) openssl


In order for Mole to automatically generate keys/certificates for https, the `openssl` command must be installed on the host. This is normally the case by default.


## **Documentation**

Documentation is available at https://niwcpac.github.io/mole/

Documentation can also be built and served locally using the `ml` script at the root of the Mole repo. The `ml` script can be used to build containers, start services, populate dbs, stop services, or build and serve documentation.  It is structured with a number of commands.  Additional help on each command 
can be found by passing the `--help` flag.  E.g., `./ml run --help`.

The following command will serve Mole documentation locally at [http://localhost/docs/](http://localhost/docs/):

    $ ./ml docs

## Contributors

Mole is built by many contributors and volunteers. Please see the full list in <a href="CONTRIBUTORS.md">CONTRIBUTORS.md</a>.

## Contributing

If you would like to contribute to Mole, please see <a href="CONTRIBUTING.md">CONTRIBUTING.md</a>.