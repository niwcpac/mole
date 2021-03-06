# Generated by Django 2.2.2 on 2021-01-28 17:55

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('data_collection', '0003_region'),
    ]

    operations = [
        migrations.CreateModel(
            name='ClockPhase',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('message', models.CharField(max_length=100)),
                ('message_only', models.BooleanField(default=False)),
                ('countdown', models.BooleanField(default=True)),
                ('duration_seconds', models.PositiveIntegerField(blank=True, default=0, null=True)),
                ('starts_with_datetime', models.DateTimeField(blank=True, null=True)),
                ('starts_with_trial_start', models.BooleanField(default=False)),
                ('starts_with_trial_end', models.BooleanField(default=False)),
                ('ends_with_datetime', models.DateTimeField(blank=True, null=True)),
                ('ends_with_trial_start', models.BooleanField(default=False)),
                ('ends_with_trial_end', models.BooleanField(default=False)),
                ('ends_with_event_type', models.ForeignKey(blank=True, default=None, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='event_type_end', to='data_collection.EventType')),
                ('starts_with_event_type', models.ForeignKey(blank=True, default=None, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='event_type_start', to='data_collection.EventType')),
            ],
            options={
                'ordering': ['-starts_with_datetime', 'ends_with_datetime'],
            },
        ),
        migrations.CreateModel(
            name='ClockConfig',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True)),
                ('timezone', models.CharField(default='America/Los_Angeles', max_length=50)),
                ('phases', models.ManyToManyField(related_name='clock_configs', to='data_collection.ClockPhase')),
            ],
        ),
        migrations.AddField(
            model_name='trial',
            name='clock_config',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='trials', to='data_collection.ClockConfig'),
        ),
    ]
