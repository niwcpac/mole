from datetime import timedelta, datetime

from django.utils import timezone

from data_collection.factories import factories


def test_trial_end_datetime():
    time_delta = timedelta(minutes=43)
    timed_scenario = factories.ScenarioFactory(time_limit=time_delta)
    not_timed_scenario = factories.ScenarioFactory()

    not_timed_trial = factories.TrialFactory(scenario=not_timed_scenario)
    # assert that end_datetime is not populated
    assert not not_timed_trial.end_datetime

    timed_trial = factories.TrialFactory(
        scenario=timed_scenario, start_datetime="2018-10-21T05:00:00-0800"
    )
    test_time = (
        datetime.strptime(timed_trial.start_datetime, "%Y-%m-%dT%H:%M:%S%z")
        + time_delta
    )
    assert timed_trial.end_datetime == test_time

    set_end = timezone.now()
    end_time_set_trial = factories.TrialFactory(
        scenario=timed_scenario, end_datetime=set_end
    )
    # assert that the end datetime wasn't changed
    assert end_time_set_trial.end_datetime == set_end
