import { Component, OnInit, OnDestroy } from '@angular/core';
import {EventType, Event} from "../../shared/models";
import { EventApiService } from 'src/app/shared/services';

@Component({
  selector: 'app-operator',
  templateUrl: './operator.component.html',
  styleUrls: ['./operator.component.scss']
})
export class OperatorComponent implements OnInit {
  pageTitle: string;
  badgeCount: number;
  selectedEventObservable = this._eventApiService.getSelectedEventObject();
  trackLiveEventObservable = this._eventApiService.getIsTrackingLiveEvent();

  selectedEvent: Event;
  openEventAccordion: boolean = false;
  selectedTabIndex: number = 0;

  trackLive: boolean = false;
  liveStyle = {'color': 'red', 'font-size': '0.7em'}

  constructor(
    private _eventApiService: EventApiService
  ) {
    this.pageTitle = "Operator";
  }

  ngOnInit(): void {
    this.selectedEventObservable.subscribe(event => {
      if (event) {
        this.selectedEvent = event;

        if (!this.trackLive) {
          this.selectedTabIndex = 2;
        }
        this.openEventAccordion = true;
        
      }
      else {
        this.selectedEvent = null;
        this.openEventAccordion = false;
      }
    });

    this._eventApiService.setLiveEventTracking(this.trackLive);
    this.trackLiveEventObservable.subscribe(isLive => {
      this.toggleTrackLive(isLive, false);
    });
  }

  onAccordionClose() {
    this.openEventAccordion = false;
    this.selectedTabIndex = 0;
    this._eventApiService.setLiveEventTracking(false);
  }

  badgeUpdate(count) {
    this.badgeCount = count;
  }

  onTabChange(event) {
  }

  toggleTrackLive(val, sendUpdate=true) {
    
    this.trackLive = val;
    this.liveStyle = this.trackLive ? {
      'color': 'red', 'font-size': '0.7em'
    } : {
      'color': 'grey', 'font-size': '0.7em'
    };

    if (sendUpdate) {
      this._eventApiService.setLiveEventTracking(this.trackLive);
    }
    
  }

  testAction(eventType: EventType) {
    console.log("Create Event: " + eventType.name);
  }
}
