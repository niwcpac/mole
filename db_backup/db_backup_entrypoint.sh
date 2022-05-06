#!/bin/sh

cd /
uvicorn --host 0.0.0.0 backup_api.main:app --root-path /db_backup &

# Backup DB on startup
if [[ "$BACKUP_FLAG" == "true" ]]; then
  echo "Backing up database on start up."
  until $(curl --output /dev/null --silent --fail "http://db_backup:8000/backup_db/?sync=true&context=start_up"); do
    echo "db_backup service unavailable -- sleeping"
	sleep 1   
  done     
fi

# Hand off to the CMD
exec "$@"
