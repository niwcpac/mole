# Generated by Django 3.2.13 on 2023-04-18 22:22

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('data_collection', '0009_update_jsonfield_import'),
    ]

    operations = [
        migrations.CreateModel(
            name='MetadataKey',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True)),
                ('description', models.TextField(blank=True, default='')),
                ('event_type_list', models.ManyToManyField(blank=True, to='data_collection.EventType')),
            ],
        ),
        migrations.CreateModel(
            name='MetadataValue',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True)),
                ('description', models.TextField(blank=True, default='')),
                ('metadata_keys', models.ManyToManyField(blank=True, to='data_collection.MetadataKey')),
            ],
        ),
        migrations.AlterField(
            model_name='entityeventrole',
            name='metadata_key',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='data_collection.metadatakey'),
        ),
    ]