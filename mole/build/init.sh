#!/bin/bash

echo "Setting database configurations"

until PGPASSWORD=$PGPASSWORD psql -h "postgres" -d $PGDATABASE -U $PGUSER -c '\q'; do
  echo "Postgres is unavailable -- sleeping"
  sleep 1
done

echo "Postgres is up - executing command"


# Backup database on init
if [[ "$BACKUP_FLAG" == "pre" ]]; then
    echo "Backing up database prior to init"
	# Need quotes around url so '&' doesn't background the task.
	until curl -s -o /dev/null "http://db_backup:8000/backup_db/?sync=true&context=pre_init"; do
	  echo "db_backup service unavailable -- sleeping"
	  sleep 1
	done
fi

reset_database()
{
	echo "Resetting Database"
	python manage.py flush --noinput
	python manage.py makemigrations data_collection --noinput
	python manage.py makemigrations automation --noinput
	python manage.py migrate --noinput
}

if [[ -v MAKE_MIGRATIONS && "$MAKE_MIGRATIONS" != "false" ]]; then
	echo "Attempting to make migrations."
	python manage.py makemigrations
fi

if [[ -v POPULATE_DB && "$POPULATE_DB" != "false" ]]; then
	reset_database;
	echo "populating database with $POPULATE_DB"
	python manage.py $POPULATE_DB
fi

# Move static content for web server to use (if it does not already exist)
if [ ! -d mole/static ]; then
    echo "Collecting static files"
    python manage.py collectstatic --noinput
fi

if [[ $DEBUG_DJANGO == "true" ]]; then
  exec gunicorn mole.wsgi --bind :8000 --workers 1 --timeout 3600 --log-level="debug" --capture-output --log-config _logs/gunicorn_log.conf --access-logformat '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s"'
else
  exec gunicorn mole.wsgi --bind :8000 --workers 5 --timeout 3600 --capture-output --log-config _logs/gunicorn_log.conf --access-logformat '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s"'
fi
