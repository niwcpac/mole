import { Component, OnInit, Input } from '@angular/core';


export interface EventTypeInterface {
  url: string;
  name: string;
  event_level_key: number;
  event_level_name: string;
  icon_string: string;
  description: string;
  color: string;
  marker_color: string;
}

@Component({
  selector: 'mole-event-type-button',
  templateUrl: './event-type-button.component.html',
  styleUrls: ['./event-type-button.component.scss']
})
export class EventTypeButtonComponent implements OnInit {


  @Input() eventType: EventTypeInterface;

  constructor() { }

  ngOnInit(): void {
  }


  onEventTypeClick() {
    console.log("post "+this.eventType.name)
  }

  getColor() {
    return {'color' : this.eventType.color}
  }

  getMarkerColor() {
    return {'color' : this.eventType.marker_color}
  }
}
