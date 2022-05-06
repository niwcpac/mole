import {
  Component,
  EventEmitter,
  Input, OnChanges,
  OnDestroy,
  OnInit,
  Output,
  QueryList, SimpleChanges,
  ViewChild,
  ViewChildren
} from '@angular/core';
import {EventTypeCardComponent} from "./event-type-card/event-type-card.component";
import {EventType, TrialEventCount} from "../../../models";
import {EventTypeApiService, TrialApiService} from "../../../services";
import {Subscription} from "rxjs";

@Component({
  selector: 'mole-event-type-cards',
  templateUrl: './event-type-cards.component.html',
  styleUrls: ['./event-type-cards.component.scss']
})
export class EventTypeCardsComponent implements OnInit, OnChanges, OnDestroy {
  @Input() useCount = true;                        // will display event counts in each card if true
  @Input() useToggle = true;                       // true: will act as a toggle for each event type if clicked
  @Input() hideManual = false;                     // whether to hide cards based off the is_manual flag
                                                   // false: will act as individual buttons for each event type
  @Input() useTitle = false;                       // will display the event type names if true
  @Input() activeStates: EventType[] = [];

  @Output() countUpdate = new EventEmitter<number>();
  @Output() activeCardsNotify = new EventEmitter<EventType[]>();
  @Output() cardActionNotify = new EventEmitter<EventType>();
  @ViewChildren('cards') eventTypeCards:QueryList<EventTypeCardComponent>

  private subscriptions = new Subscription();
  public eventTypes: EventType[];
  private eventCounts: TrialEventCount;

  constructor(private eventTypeService: EventTypeApiService, private trialService: TrialApiService) { }

  ngOnInit(): void {
    this.eventTypes = this.eventTypeService.getCurrentTypes();
    this.subscriptions.add(
      this.eventTypeService.getEventTypes().subscribe(
        (data: EventType[]) => {
          if(data) {
            this.eventTypes = data;
            if(this.hideManual) {
              this.eventTypes = this.eventTypes.filter(type => type.isManual == true);
            }
          }
        }
      )
    );
    if(this.useCount) {

      this.eventCounts = this.trialService.getCurrentEventCounts();
      this.updateCardCounts();
      this.subscriptions.add(
        this.trialService.getEventCount().subscribe(
          (eventsCount: TrialEventCount) => {
            this.eventCounts = eventsCount;
            this.updateCardCounts();
          }
        )
      );
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if(this.eventTypeCards) {
      this.eventTypeCards.forEach(card => {
        const foundType = this.activeStates.find(type => type.name === card.eventType.name);
        if(foundType) {
          card.isActive = true;
        } else {
          card.isActive = false;
        }
      })
    }
  }

  cardAction({eventType, active}) {
    // this is toggle card
    if(this.useToggle) {
      if(active) {
        // add to current active list if not already included
        const foundType = this.activeStates.find(type => type.name === eventType.name);
        if(!foundType) {
          this.activeStates.push(eventType);
        }
      }
      else {
        // remove from active list if currently included
        this.activeStates = this.activeStates.filter(type => type.name !== eventType.name);
      }
      this.activeCardsNotify.emit(this.activeStates);
    }

    else {
      this.cardActionNotify.emit(eventType);
    }

  }

  updateCardCounts() {
    // prevent from trying to update prior to card initialization
    if(this.eventTypeCards) {
      this.eventTypeCards.forEach(card => {
        const countFound = this.eventCounts.events.find(eventCount => eventCount.name === card.eventType.name);
        if(countFound) {
          card.count = countFound.count.toString();
        }
      });
    }
    if(this.eventCounts) {
      this.countUpdate.emit(this.eventCounts.total);
    }

  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
