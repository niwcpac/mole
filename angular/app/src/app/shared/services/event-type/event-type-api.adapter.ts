import { EventType } from '../../models';

export class EventTypeApiAdapters {
  eventTypeAdapter(json: any): EventType {
    let eventType: EventType = {
      url: "",
      id: -1,
      name: json.name,
      description: json.description,
      eventLevel: json.event_level,
      priorityMetadata: json.priority_metadata,
      metadataStyleFields: json.metadata_style_fields,
      pointStyle: json.point_style,
      hasDuration: json.has_duration,
      exclusiveWith: json.exclusive_with,
      resetsWith: json.resets_with,
      endsSegment: json.ends_segment,
      isManual: json.is_manual,
      metadatakey_set: [],
    };

    if (json.url) {
      eventType.url = json.url.replace("http://django:8000", "");
    }

    if (json.id) {
      eventType.id = json.id;
    }

    if (json.metadatakey_set) {
      let myList = [];
      json.metadatakey_set.forEach(function (singleItem: string) {
        let url = new URL(singleItem);
        myList.push(url.pathname);
      });
      eventType.metadatakey_set = myList;
    }

    return eventType;
  }

}
