import { Component, OnInit } from '@angular/core';

import { EventTypeApiService } from '../../../services/event-type/event-type-api.service';

import { EventTypeInterface } from '../event-type-button/event-type-button.component';
import {MatDialog} from "@angular/material/dialog";
import {EventDialogComponent} from "../../event/event-dialog/event-dialog.component";
import {EventApiService} from "../../../services";



@Component({
  selector: 'mole-event-creator',
  templateUrl: './event-creator.component.html',
  styleUrls: ['./event-creator.component.scss'],
  providers: [ EventTypeApiService ]
})
export class EventCreatorComponent implements OnInit {

  eventTypes:Array<EventTypeInterface> = [];
  eventTypesByLevel:Map<number, Array<EventTypeInterface>> = new Map()
  eventLevelToName:Map<number, string> = new Map();

  constructor(private eventService: EventApiService, public dialog: MatDialog) {}

  ngOnInit(): void {
  }

  public showevents(): void {
    console.log(this.eventTypesByLevel);
  }
  createNewDialog(eventType) {
    const dialogRef = this.dialog.open(EventDialogComponent, {
      width: '66vw',
      data: this.eventService.getEventObject(eventType)
    });
  }
}
