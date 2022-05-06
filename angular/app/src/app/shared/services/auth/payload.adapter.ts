import { EventImage } from '../../models/event.model';
import {Event, Trial, EventPayload} from "../../models";


export class EventPayloadApiAdapters {
  eventPayloadAdapter(event: Event, trialUrl?: string): EventPayload {
    let eventPayload = {
        // modified_datetime: event.modifiedDatetime,
        // submitted_datetime: event.submittedDatetime,
        start_datetime: event.startDatetime,
        end_datetime: event.endDatetime,
        event_type: event.eventType.url,
        trial: trialUrl,
        // trigger: event.trigger.url,
        notes: event.notes,
        images: event.images.map((img: EventImage) => img.url),
        metadata: event.metadata
    };

    if (event.startPose) {
      eventPayload["start_pose"] = event.startPose.url;
    }
    if (event.weather) {
      eventPayload["weather"] = event.weather.url;
    }

    return eventPayload;
  }

  trialPayloadAdapter(trial: Trial) {
    let trialPayload = {
      url: trial.url,
      id: trial.id,
      name: trial.name,
      id_major: trial.idMajor,
      id_minor: trial.idMinor,
      id_micro: trial.idMicro,
      campaign: trial.campaign,
      scenario: trial.scenario,
      testers: trial.testers,
      test_condition: trial.testCondition,
      entities: trial.entities,
      bagfile: trial.bagfile,
      system_configuration: trial.systemConfiguration,
      start_datetime: trial.startDatetime,
      end_datetime: trial.endDatetime,
      note: trial.note,
      current: trial.current,
      reported: trial.reported,
    }

    return trialPayload;
  }

  reverseTrialPayloadAdapter(trial: any) {
    let trialPayload = {
      url: trial.url,
      id: trial.id,
      name: trial.name,
      idMajor: trial.id_major,
      idMinor: trial.id_minor,
      idMicro: trial.id_micro,
      campaign: trial.campaign,
      scenario: trial.scenario,
      testers: trial.testers,
      testCondition: trial.test_condition,
      entities: trial.entities,
      bagfile: trial.bagfile,
      systemConfiguration: trial.system_configuration,
      startDatetime: trial.start_datetime,
      endDatetime: trial.end_datetime,
      note: trial.note,
      current: trial.current,
      reported: trial.reported,
    }

    return trialPayload;
  }
}
