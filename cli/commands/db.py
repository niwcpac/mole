import os
import time
import json
import subprocess
from contextlib import closing
from urllib.request import urlopen

import typer
from typing import List, Optional
from utils import service_is_running

app = typer.Typer(add_completion=False)  # Create an typer appplication


DB_CONNECTION_ATTEMPTS = 3

################################################################################
###                           Helper Function                                ###
################################################################################


def backup_db(name_string=""):
    """
    Backup the postgres db.
    """
    url = "http://localhost:8003/backup_db/"
    if name_string:
        url += "?context={}".format(name_string)
    # retry 3 times in case db_backup service isn't ready yet
    for i in range(DB_CONNECTION_ATTEMPTS):
        try:
            # Use closing since Python 2 urlopen doesn't have context handler necessary for with...as statement
            with closing(urlopen(url)) as response:
                status = response.getcode()
                body = response.read()
                return {"status": status, "body": body}
        except IOError:
            print("Backup service unavailable. Retrying...")
            time.sleep(1.0)

    return {
        "status": None,
        "body": "Failed to connect to backup service. No backup created.",
    }


def standalone_backup(name_string="on_demand&sync=true"):
    """
    docker compose up -d postgres
    """
    postgres_running = service_is_running("postgres")
    db_backup_running = service_is_running("db_backup")

    if not (postgres_running and db_backup_running):
        # BACKUP_FLAG == "demand" so db_backup container skips backup on startup if not running.
        env = {
            "BACKUP_FLAG": "demand",
            "POPULATE_DB": "false",
            "NEWUSERID": str(os.getuid()),
            "PATH": str(os.getenv("PATH")),
        }
        print("Starting necessary services...")
        cmd = ["docker", "compose", "up", "-d", "postgres", "db_backup"]
        subprocess.call(cmd, env=env)
    else:
        print("Necessary services already running.")

    response = backup_db(name_string=name_string)

    if response["status"] == 200:
        filename = json.loads(response["body"])["backup_filename"]
        print("Backup file created: {}".format(filename))
    elif response["status"] == 429:
        print("Backup request throttled. Try again later.")
    else:
        print("Error creating backup.")

    print("Stopping previously stopped services...")

    # Stop postgres if it wasn't running already
    if not postgres_running:
        cmd = ["docker", "compose", "stop", "postgres"]
        subprocess.call(cmd, env=env)

    # Stop db_backup if it wasn't running already
    if not db_backup_running:
        cmd = ["docker", "compose", "stop", "db_backup"]
        subprocess.call(cmd, env=env)


################################################################################
###                   Typer Application Default Callback                     ###
################################################################################


@app.callback(invoke_without_command=True, help="Manage database")
def db(
    backup: bool = typer.Option(
        False,
        "-b",
        "--backup",
        help="backup the database hosted in the postgres container",
    ),
    load: Optional[List[str]] = typer.Option(
        None, "-l", "--load", metavar="LOAD", help="Load a database into postgres"
    ),
):

    if backup:
        standalone_backup()
    if load:
        postgres_running, pg_container_id = service_is_running("postgres", id=True)
        db_backup_running = service_is_running("db_backup")

        if not postgres_running:
            cmd = ["docker", "compose", "up", "-d", "postgres"]
            subprocess.call(cmd)

            # NOTE: 07/07/2022 - What are we checking here?
            _, pg_container_id = service_is_running("postgres", id=True)

        # BACKUP_FLAG="pre" so db_backup service doesn't backup on start. Backup called below.
        env = {
            "BACKUP_FLAG": "pre",
            "PATH": str(os.getenv("PATH")),
        }
        if not db_backup_running:
            cmd = ["docker", "compose", "up", "-d", "db_backup"]
            subprocess.call(cmd, env=env)

        backup_db(name_string="pre_load&sync=true")

        perform_backup = True
        is_archive = False

        file_path = load[0]

        # parse file name
        file_path_split = file_path.split("/")

        if file_path.endswith(".tar.gz"):
            file_name = file_path_split[-1][:-7]
            is_archive = True
        elif file_path.endswith(".sql"):
            file_name = file_path_split[-1][:-4]
        else:
            file_name = file_path_split[-1]

        # check if valid backup file & update file paths
        if file_path[0] == "/":  # check if the file path is explicit

            # if not a valid file path, don't try to load it
            if not os.path.isfile(file_path):
                print("Not a valid file path.")
                perform_backup = False

            else:  # file path is verified
                # if not an archive, only need to copy sql to postgres
                # (archives are extracted by default later, no need to copy here)
                # TODO: Line never executed due to line 154 "file_path = load[0]"
                # Line always retrieve "\" assuming it exists and isfile check fails
                # because its a path
                if not is_archive:
                    # copy sql to backups directory
                    cmd = ["cp", file_path, "db_backup/backups/%s.sql" % (file_name)]
                    subprocess.call(cmd, env=env)

        else:  # only database name was provided, construct file path and validate
            file_path = "db_backup/backups/%s.tar.gz" % (file_name)
            is_archive = True
            if not os.path.isfile(file_path):  # test if it's an archive
                file_path = "db_backup/backups/%s.sql" % (file_name)
                is_archive = False

                if not os.path.isfile(file_path):  # test if it's sql
                    print("Not a valid file path.")
                    perform_backup = False

        # Drop old DB & perform backup
        if perform_backup:
            if is_archive:

                # make directory to extract zip archive into
                backup_dir_path = "db_backup/backups/%s" % (file_name)
                cmd = ["mkdir", "-p", backup_dir_path]
                subprocess.call(cmd, env=env)

                # unzip the archive
                cmd = ["tar", "-zxvf", "%s" % file_path, "-C", backup_dir_path]
                subprocess.call(cmd, env=env)

                # Copy images over
                cmd = [
                    "rsync",
                    "-a",
                    "--delete",
                    "%s/mole_media/images/" % (backup_dir_path),
                    "mole/media/images",
                ]
                subprocess.call(cmd, env=env)

                # it's assumed the sql has the same name as the archive name
                postgres_sql_path = "/backups/%s/%s.sql" % (file_name, file_name)

                # handle case where the sql in archive doesn't match the name of the archive
                if not os.path.isfile(
                    "db_backup/backups/%s/%s.sql" % (file_name, file_name)
                ):
                    sql_glob = glob.glob("db_backup/backups/%s/*.sql" % (file_name))

                    if len(sql_glob) >= 1:
                        sql_path = sql_glob[0]  # take first sql file found
                        sql_path_split = sql_path.split("/")
                        sql_name = sql_path_split[len(sql_path_split) - 1][:-4]
                        postgres_sql_path = "/backups/%s/%s.sql" % (file_name, sql_name)

                    else:  # uh oh..
                        print("No sql backup found in archive!")
                        postgres_sql_path = None

            else:  # no archive, sql should be directly under backups
                postgres_sql_path = "/backups/%s.sql" % (file_name)

            if postgres_sql_path:
                # Force disconnect of active connections
                cmd = [
                    "docker",
                    "compose",
                    "exec",
                    "postgres",
                    "psql",
                    "-U",
                    "mole_user",
                    "-d",
                    "postgres",
                    "-c",
                    "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'mole';",
                ]
                subprocess.call(cmd, env=env)

                print("Dropping db: mole")
                cmd = (
                    'docker exec -it %s psql -U mole_user -d postgres -c "DROP DATABASE mole;"'
                    % (pg_container_id)
                )
                subprocess.call(cmd, shell=True)

                print("Loading backup from %s" % (postgres_sql_path))
                cmd = [
                    "docker",
                    "compose",
                    "exec",
                    "postgres",
                    "psql",
                    "--quiet",
                    "-U",
                    "mole_user",
                    "-d",
                    "postgres",
                    "-f",
                    postgres_sql_path,
                ]
                subprocess.call(cmd, env=env)

        # Stop services that were not previousy running.
        if not postgres_running:
            cmd = ["docker", "compose", "stop", "postgres"]
            subprocess.call(cmd, env=env)

        if not db_backup_running:
            cmd = ["docker", "compose", "stop", "db_backup"]
            subprocess.call(cmd, env=env)


################################################################################
###                          Typer Application Command                       ###
################################################################################

# @app.command()
# def command1(arg1 : bool= typer.Option(False,"-x", "--argx", help="Required Argument"),
#              arg2 : bool= typer.Option(False,"-y", "--argy", help="Optional Argument")):
#     """
#     Add Help information here
#     """
#     typer.echo("This is a command")
