#!/usr/bin/env bash
until PGPASSWORD=$PGPASSWORD psql -h "postgres" -d $PGDATABASE -U $PGUSER -c '\q'; do
  echo "Postgres is unavailable - sleeping"
  sleep 1
done

python manage.py test --noinput