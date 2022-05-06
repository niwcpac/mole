# **Migrations**

There are two primary purposes for migrations in Mole:

1. To track changes made to models.py
2. To bring legacy databases into compliance

## **Track Model Changes**

As Mole evolves, our database model will be modified and adapted to better serve the 
purposes of Mole. Django uses migration files to migrate databases into new schemas. 

Whenever a model is changed and committed, **it's important to also commit the 
correlating migration file.** To generate the migration file, run `./ml django -mm` 
while Mole is running. The new migration file will be found in the 
`mole > data_collection > migrations` directory.

## **Migrate Legacy Databases**

You may find yourself in a position where you would like to view data in mole from an 
old experiment that used a different database schema. In this case you will need to 
write a custom migration file and run it against your database. 

!!! tip "Note"
    Some custom migrations have already been developed. 
    If you have an existing custom migration file, you can skip to step 3.

1. **Identify the schema differences.** If you have the models.py file from the time the 
    database was created, you can look at the models.py diff. If not, you will 
    need to view the database in an application like [TablePlus](https://tableplus.com/) 
    and take note of schema differences there.

2. **Write custom migrations.** From the differences identified in the schema, follow 
    the [Django migrations documentation](https://docs.djangoproject.com/en/3.1/topics/migrations/) 
    to write the migration instructions.

3. **Apply the migration.** Verify the custom migration is in the 
    `mole > data_collection > migrations` directory and then shell into the Django 
    container. From the Django container, run 
    `./manage.py migrate data_collection [your_custom_migration]`

4. **Verify all required migrations were made.** As a quick check to see if you caught 
    all schema differences in your migration, run `./ml django -mm` from the. If all 
    differences were caught, Django will return "No changes detected". If not, Django 
    will make a new migration file with the updates that you need to make to your custom 
    migration file. 

5. **Save a copy of your migrated database.** Run `./ml db -b` to create a backup of the 
    database in the `db_backups > backups` directory. The original DB, custom migration, 
    and migrated DB should be saved together.

