#!/bin/sh

until PGPASSWORD=$PGPASSWORD psql -h "postgres" -d $PGDATABASE -U $PGUSER -c '\q'; do
  echo "Waiting for database connection..."
  sleep 1
done

PGPASSWORD=$PGPASSWORD pg_dump --create -h postgres -U $PGUSER $PGDATABASE > /home/jobberuser/$1.sql
echo "Database dumped"

tar zcf backups/$1.tar.gz -C /home/jobberuser $1.sql mole_media/
rm /home/jobberuser/$1.sql
echo "Archive created"
