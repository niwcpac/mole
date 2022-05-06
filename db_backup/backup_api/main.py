from fastapi import FastAPI, Query, BackgroundTasks, Request, Response, status
import subprocess
import datetime
import os

import pytz

app = FastAPI()

try:
    timezone = pytz.timezone(os.environ.get("TIMEZONE", "America/Los_Angeles"))
except pytz.exceptions.UnknownTimeZoneError:
    timezone = pytz.timezone("America/Los_Angeles")


@app.get("/")
def read_root(request: Request):
    return {
        "Info": "Backup call available at {}/backup_db/\nDocs available at {}/docs/".format(
            request.scope.get("root_path"), request.scope.get("root_path")
        )
    }


class Throttle:
    def __init__(self, max_calls_per_minute):
        self.min_period = datetime.timedelta(minutes=1 / max_calls_per_minute)
        self.last_call_timestamp = datetime.datetime.min.replace(tzinfo=timezone)

    def throttled(self, timestamp: datetime.datetime):
        if timestamp - self.last_call_timestamp > self.min_period:
            self.last_call_timestamp = timestamp
            return False
        else:
            return True


t = Throttle(1.0)


def call_backup_script(filename):
    cmd = ["/perform_backup.sh", filename]
    subprocess.call(cmd)


@app.get("/backup_db/", status_code=status.HTTP_200_OK)
def backup_db(
    *,
    context: str = Query(
        None,
        title="Context for this backup. Will be appended to backup filename.",
        max_length=15,
        regex="^[\w-]+$",
    ),
    sync: bool = Query(
        False,
        title="Perform synchronous call. If true, http service call will wait to return until backup has completed.",
    ),
    response: Response,
    background_tasks: BackgroundTasks,
):

    now = datetime.datetime.now(tz=timezone)

    if t.throttled(now):
        response.status_code = status.HTTP_429_TOO_MANY_REQUESTS
        return {"Info": "Throttled. Please try again later."}

    now_str = now.strftime("%Y-%m-%d_%H_%M_%S_%Z")

    filename = f"mole_backup_{now_str}"
    if context:
        filename += f"_{context}"

    # TODO: Handle failed backups (permission issues, etc.)
    if sync:
        call_backup_script(filename)
        print("Backup created: {}".format(filename))
    else:
        background_tasks.add_task(call_backup_script, filename)
        print("Backup submitted: {}".format(filename))

    return {"backup_filename": filename}
