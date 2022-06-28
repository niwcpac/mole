#!/usr/bin/env python

# in Django 1.8 this changes to argparse
import os
import json

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from data_collection import models as dcm


class Command(BaseCommand):
    def handle(self, *args, **options):
        i = 0
        all_poses = dcm.Pose.objects.all()
        for pose in all_poses:
            i = i + 1
            if i % 10 == 0:
                print(i)
            # default ordering for events is desc start_datetime
            events = pose.events.all()
            if not events:
                continue
            pose.trial = events[0].trial
            pose.save()
