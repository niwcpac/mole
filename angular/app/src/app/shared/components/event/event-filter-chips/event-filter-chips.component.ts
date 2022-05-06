import { Component, OnDestroy, OnInit,  SimpleChanges } from '@angular/core';
import {EventType, EventFilter, EventFilterChip} from "../../../models";
import {EventApiService} from "../../../services";
import {Subscription} from "rxjs";

@Component({
  selector: 'mole-event-filter-chips',
  templateUrl: './event-filter-chips.component.html',
  styleUrls: ['./event-filter-chips.component.scss']
})
export class EventFilterChipsComponent implements OnInit, OnDestroy {
  public static readonly CHIP_TYPE = {
    EVENT: 'event_type',
    META: 'meta',
    LEVEL: 'level',
    POSE: 'pose'
  }

  private subscriptions = new Subscription();
  public filterChips: EventFilterChip[] = [];
  private filterTypes: EventType[] = [];
  private filterMeta: string[] = [];
  private filterLevel: number = null;
  private filterPose: boolean = null;


  constructor(private eventService: EventApiService) { }

  ngOnInit(): void {
    this.subscriptions.add(
      this.eventService.filterChangedNotification().subscribe(
        (data:EventFilter) => {
          if(data) {
            this.filterTypes = data.types.slice();
            this.filterMeta = data.metadata.slice();
            this.filterLevel = data.level;
            this.filterPose = data.hasPose;
            this.createChips();
          }
        }
      )
    )
  }

  createChips() {
    this.filterChips = [];
    this.filterTypes.forEach((eType) => {
      this.filterChips.push({type: EventFilterChipsComponent.CHIP_TYPE.EVENT, value: eType })
    });
    this.filterMeta.forEach((meta) => {
      this.filterChips.push({type: EventFilterChipsComponent.CHIP_TYPE.META, value: meta })
    });
    if(this.filterLevel) {
      this.filterChips.push({type: EventFilterChipsComponent.CHIP_TYPE.LEVEL, value: this.filterLevel })
    }
    if(this.filterPose) {
      this.filterChips.push({type: EventFilterChipsComponent.CHIP_TYPE.POSE, value: this.filterPose })
    }
  }

  removeFilter({type, value}) {
    switch (type) {
      case EventFilterChipsComponent.CHIP_TYPE.EVENT:
        this.filterTypes = this.filterTypes.filter((eType) => eType.name !== value.name);
        break;
      case EventFilterChipsComponent.CHIP_TYPE.META:
        this.filterMeta = this.filterMeta.filter((meta) => meta !== value);
        break;
      case EventFilterChipsComponent.CHIP_TYPE.LEVEL:
        this.filterLevel = 0;
        break;
      case EventFilterChipsComponent.CHIP_TYPE.POSE:
        this.filterPose = false;
        break;
    }
    this.filterUpdate();
  }

  removeAll() {
    this.eventService.updateFilter([], [], 0, false)
  }

  filterUpdate() {
    this.eventService.updateFilter(this.filterTypes, this.filterMeta, this.filterLevel, this.filterPose);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
