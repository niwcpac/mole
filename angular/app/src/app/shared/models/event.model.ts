import { Pose } from './map.model';
import { Tester } from './tester.model';

export interface Event{
  url: string;
  id: number;
  submittedDatetime: Date;
  startDatetime: Date;
  endDatetime: Date;
  modifiedDatetime: Date;
  startPose?: Pose;
  weather?: {
    url: string,
    id: number,
    name: string,
    description: string,
    current: boolean
  };
  eventType: EventType;
  trigger: any;
  pointStyle: any;
  notes: EventNote[];
  images: EventImage[];
  metadata: any;
}

export interface EventPayload {
  modified_datetime?: Date;
  submitted_datetime?: Date;
  start_datetime?: Date;
  end_datetime?: Date;
  event_type?: string;
  trigger?: string;
  notes?: any;
  images?: any;
  metadata?: any;
  start_pose?: string;
  weather?: string;
  trial?: string;
}

export interface EventType {
  url: string;
  id: number;
  name: string;
  description: string;
  eventLevel: any;
  priorityMetadata: Array<string>;
  metadataStyleFields: any;
  pointStyle: any;
  hasDuration: boolean;
  exclusiveWith: Array<any>;
  resetsWith: Array<any>;
  endsSegment: boolean;
  isManual: boolean;
  metadatakey_set: Array<string>;
}

export interface EventImage {
  url: string;
  id: number;
  image: string;
  imageUrl: string;
  thumbUrl: string;
  imageType?: {
      url: string;
      id: number;
      name: string;
      description: string;
      topic: string;
  }
  eventUrl: string;
  timestamp: Date;
}

export interface EventNote {
  url: string;
  id: number;
  tester: Tester;
  note: string;
  eventUrl: string;
}

export interface LocalEventNote {
  id: number;
  tester: {
    name: string;
  };
  note: string;
}

export interface EventPageResult{
  next: string;
  previous: string;
  results: Event[];
}

export interface EventFilter {
  level: number,
  types: Array<EventType>,
  metadata: Array<string>,
  hasPose: boolean
}

export interface EventFilterChip {
  type: string,
  value: any,
}
