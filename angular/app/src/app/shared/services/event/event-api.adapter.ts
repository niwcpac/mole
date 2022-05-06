import {Event, EventPageResult, EventFilter, EventImage, EventNote } from "../../models";
import { EventTypeApiAdapters } from '../event-type/event-type-api.adapter';
import { PoseAdapters } from "../map/pose.adapter";
import { TesterApiAdapters } from '../tester/tester-api.adapter';

export class EventApiAdapters {

  private eventTypeApiAdapters = new EventTypeApiAdapters();
  private testerApiAdapters = new TesterApiAdapters();

  eventAdapter(json: any): Event {
    let event: Event = {
      url: "",
      id: -1,
      submittedDatetime: new Date(json.submitted_datetime),
      startDatetime: new Date(json.start_datetime),
      endDatetime: json.end_datetime,
      modifiedDatetime: new Date(json.modified_datetime),
      eventType: this.eventTypeApiAdapters.eventTypeAdapter(json.event_type),
      trigger: json.trigger,
      pointStyle: json.point_style,
      notes: json.notes.map(note => this.eventNoteAdapter(note)),
      images: json.images.map(img => this.eventImageAdapter(img)),
      metadata: json.metadata
    };

    if (json.url) {
      event.url = json.url.replace("http://django:8000", "");
    }

    if (json.id) {
      event.id = json.id;
    }

    if (event.endDatetime) {
      event.endDatetime = new Date(event.endDatetime);
    }

    if (json.start_pose && json.start_pose.point) {
      event.startPose = PoseAdapters.poseAdapter(json.start_pose);
    }

    if (json.weather) {
      event.weather = {
        url: json.weather.url,
        id: json.weather.id,
        name: json.weather.name,
        description: json.weather.description,
        current: json.weather.current
      }
    }

    return event;
  }

  eventImageAdapter(json: any): EventImage {
    let image: EventImage = {
      url: json.url.replace("http://django:8000", ""),
      id: json.id,
      image: json.image,
      imageUrl: json.image_url.replace("http://django:8000", ""),
      thumbUrl: json.thumb_url.replace("http://django:8000", ""),
      imageType: json.image_type,
      eventUrl: json.event,
      timestamp: json.timestamp
    };

    return image;
  }


  eventNoteAdapter(json: any): EventNote {
    let note: EventNote = {
      url: json.url.replace("http://django:8000", ""),
      id: json.id,
      tester: this.testerApiAdapters.testerAdapter(json.tester),
      note: json.note,
      eventUrl: json.event
    };

    return note;
  }

  pageResultAdapter(json: any): EventPageResult {

    var pageResult = {
      next: json.next,
      previous: json.previous,
      results: json.results.map(item => this.eventAdapter(item))
    };

    if (pageResult.next) {
      pageResult.next = pageResult.next.replace("http://django:8000", "");
    }

    if (pageResult.previous) {
      pageResult.previous = pageResult.previous.replace("http://django:8000", "");
    }

    return pageResult;
  }

  eventFilterAdapter(json: any): EventFilter {
    return {
      level: json.level,
      types: json.types.map(type => type.replace(/ /g, "+")),
      metadata: json.metadata.map(md => md.replace(/ /g, "+")),
      hasPose: json.hasPose
    }
  }

}
