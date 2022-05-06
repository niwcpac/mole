import {Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {EventApiService} from "../../../services";
import {Subscription} from "rxjs";
import {EventFilter, EventFilterChip, EventType} from "../../../models";

@Component({
  selector: 'mole-event-filter',
  templateUrl: './event-filter.component.html',
  styleUrls: ['./event-filter.component.scss']
})
export class EventFilterComponent implements OnInit, OnDestroy {
  @Input() useCards: boolean = true;
  @Input() useForm: boolean = true;
  @Output() countNotification = new EventEmitter<number>();
  private subscriptions = new Subscription();
  public currentFilterTypes: EventType[];
  public currentFilterMeta: string[];

  constructor(private eventService: EventApiService) { }

  ngOnInit(): void {
    this.currentFilterTypes = [];

    this.subscriptions.add(
      this.eventService.filterChangedNotification().subscribe(
        (data:EventFilter) => {
          if(data) {
            this.currentFilterTypes = data.types.slice();
            this.currentFilterMeta = data.metadata.slice();
          }
        }
      )
    )
  }

  cardsUpdate(event_types: EventType[]) {
    this.currentFilterTypes = event_types;
    this.eventService.updateFilter(this.currentFilterTypes, null, null, null);
  }

  notifyCount(count) {
    this.countNotification.emit(count);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
