import { EventType } from './event.model';

// TODO: STUB interface (type any and missing responses move to models file) use camelCase
export interface Pose {
  coordinates: number[];
  elevation: number;
  heading?: number
  entity?: any;// url/object
  pose_source?: any; // url/object
  timestamp?: any;
  url?: string;
  id?: number;
}

export interface PosePageResult {
  next: string;
  previous: string;
  results: Pose[];
}

export interface Marker {
  pose?: Pose;
  layer?:string; // marker, camera, artifact
  metadata?:Metadata; // vehicle name, popup text
  pointStyle:PointStyle; // marker styling
  eventId?: number;
  eventType?: EventType;
  level?: string;
  startTime?: Date;
}

export interface PointStyle {
  url: string;
  name: string;
  description:string;
  icon: string;
  render_as_symbol:boolean;
  color: string;
  use_marker_pin:boolean;
  marker_color: string;
  scale_factor: any;
  animation:any;
  entity_types_styled:string[];
  event_types_styled:string[];
}

export interface Metadata {
  popup?;
  description?;
}



export interface MapFocus{
  center: number[];
  zoom: number;
  pitch: number;
  bearing: number;
  mapFocus: string;
  mapStyle?: string;
}
