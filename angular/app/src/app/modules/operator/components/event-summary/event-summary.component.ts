import {AfterViewInit, Component, OnDestroy, OnInit, QueryList, ViewChildren} from '@angular/core';
import {Subscription} from 'rxjs';

import {EventApiService, EventTypeApiService, TrialApiService} from '../../../../shared/services';
import {EventType, TrialEventCount} from '../../../../shared/models';
import {SummaryCardComponent} from "./summary-card/summary-card.component";
import {EventFilter} from "../../../../shared/models/event.model";

@Component({
  selector: 'mole-event-summary',
  templateUrl: './event-summary.component.html',
  styleUrls: ['./event-summary.component.scss']
})
export class EventSummaryComponent implements OnInit, OnDestroy{
  private subscriptions = new Subscription();
  public currentFilter: EventFilter;
  public currentEventCounts: TrialEventCount;
  public eventTypes: EventType[];
  allActive = false;
  @ViewChildren('eventTypeCard') eventTypeCards:QueryList<SummaryCardComponent>

  constructor(
    private trialService: TrialApiService,
    private eventTypeService: EventTypeApiService,
    private eventService: EventApiService) {  }

  ngOnInit(): void {
    this.subscriptions.add(
      this.trialService.getEventCount().subscribe(
        (data: TrialEventCount) => {
          if(data) {
            this.currentEventCounts = data;
          }
        }
      )
    );

    this.subscriptions.add(
      this.eventTypeService.getEventTypes().subscribe(
        (data: EventType[]) => {
          if(data) {
            this.eventTypes = data;
          }
        }
      )
    );

    // this.currentFilter = this.eventService.getCurrentFilter();
    this.subscriptions.add(
      this.eventService.filterChangedNotification().subscribe(
        (data:EventFilter) => {
          if(data) {
            this.currentFilter = data;
          }
        }
      )
    )


  }

  getTypeCount(eventType: string): number {
    let count = 0;
    if (this.currentEventCounts) {
      const typeCount = this.currentEventCounts.events.find(type => type.name === eventType);
      if (typeCount) {
        count = typeCount.count;
      }
    }
    return count;
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  clearFilters() {
    this.currentFilter.types = []
    this.eventService.setPagedFilter(this.currentFilter);
  }
}
