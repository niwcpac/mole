import { Component, OnInit, AfterViewInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { CdkVirtualScrollViewport, ScrollDispatcher } from '@angular/cdk/scrolling';
import { filter } from 'rxjs/operators'

import { EventApiService } from '../../services';
import { Event } from '../../models'
import {interval, Subscription, timer} from 'rxjs';

import { CookieService } from 'ngx-cookie-service';
import { TimelineCardService } from './timeline-card/service/timeline-card.service';

@Component({
  selector: 'mole-timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class TimelineComponent implements AfterViewInit {
  eventsObservable = this._eventApiService.getPagedEvents();
  timelineCardHeightObservable = this._timelineCardService.getEventCardHeight();
  selectedEventIndexObservable = this._eventApiService.getSelectedPagedEventIndex();
  selectedEventObservable = this._eventApiService.getSelectedEvent();
  liveEventTrackingObservable = this._eventApiService.getIsTrackingLiveEvent();
  isTrackingLiveEvent: boolean = false;
  localEventData: Event[] = [];
  timelineCardSize: number = 50;
  atTimelineTop: boolean = true;
  eventsToLoad: boolean = false;
  disableEventFocus: boolean = false;
  renderedRange: any;
  renderedEvents: number[] = [];
  selectedEvent: number = -1;
  selectedEventIndex: number = -1;
  refreshEventsSubscription: Subscription;
  private INTERVAL_TIME: number = 10000; // every 10 seconds refresh rendered events

  @ViewChild(CdkVirtualScrollViewport)
  viewport: CdkVirtualScrollViewport;

  constructor(
    private _eventApiService: EventApiService,
    private _timelineCardService: TimelineCardService,
    private scrollDispatcher: ScrollDispatcher,
    private cookie: CookieService
  ) {
    if (this.cookie.check("timeline-card-height")) {
      this.timelineCardSize = +this.cookie.get("timeline-card-height");
    }
  }


  ngAfterViewInit(): void {

    this.eventsObservable.subscribe((eventData: Event[]) => {
      // reverse the list for vertical timeline view
      if (!eventData) {
        this.localEventData = [];
        this.eventsToLoad = false;
        return;
      }

      this.localEventData = eventData.reverse();
      
      // check if the first page of events fills the timeline, if not load the next page
      if (this.viewport.measureRenderedContentSize() < this.viewport.getViewportSize()) {
        this.eventsToLoad = this._eventApiService.getNextPage();
      }
    });

    this.selectedEventObservable.subscribe((eventId: number) => {
      this.selectedEvent = eventId;
    })

    this.selectedEventIndexObservable.subscribe((eventIndex: number) => {
      this.selectedEventIndex = eventIndex;
      this.scrollToEventIndex();
    })

    this.liveEventTrackingObservable.subscribe(isLive => {
      this.isTrackingLiveEvent = isLive;
    });

    this.timelineCardHeightObservable.subscribe(_ => {
      this.scrollToEventIndex('auto');
    })

    // watch the scroll event, and load more data when close bottom of timeline
    this.scrollDispatcher.scrolled().pipe(
      filter(event => this.viewport.measureScrollOffset('bottom') < 500)
      // filter(event => this.viewport.getRenderedRange().end === this.viewport.getDataLength())
    ).subscribe(event => {
      console.log("time to load more data!");
      this.eventsToLoad = this._eventApiService.getNextPage();
      this.atTimelineTop = false;
    });

    // when the rendered content gets within 500px of the bottom of the timeline, 
    // request another page of data
    this.scrollDispatcher.scrolled().pipe(
      filter(event => this.viewport.measureScrollOffset('top') < 500)
    ).subscribe(event => {
      this.atTimelineTop = true;
    });

    // every 10 seconds refresh rendered events
    this.refreshEventsSubscription = interval(this.INTERVAL_TIME).subscribe(x => {
      if (!this.atTimelineTop) {
        this.renderedRange = this.viewport.getRenderedRange();
        this.renderedEvents = [];
        this.localEventData.slice(this.renderedRange.start, this.renderedRange.end).forEach(event => {
          this.renderedEvents.push(event.id);
        });
        this._eventApiService.getEventsWithIds(this.renderedEvents);
      }
    });

  }

  // auto scroll to the index of the selected event
  scrollToEventIndex(style='smooth') {
    let scrollBehavior: ScrollBehavior = 'smooth';
    if (style == 'auto') {
      scrollBehavior = 'auto';
    }
    if (this.selectedEventIndex >= 0 && !this.isTrackingLiveEvent) {
      this.viewport.scrollToIndex(this.selectedEventIndex, scrollBehavior);
    }
  }

  trackByIdx(i) {
    return i;
  }

}
