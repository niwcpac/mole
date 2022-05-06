import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EventFilterComponent } from './event-filter.component';
import {Event, EventFilter, EventType} from "../../../models";
import {BehaviorSubject} from "rxjs";
import {EventApiService} from "../../../services";

import {By} from "@angular/platform-browser";

class MockEventApiService {

  private mock_events = [
    <Event>{url: 'event/url/1', metadata: {meta1: 'metadata1', meta2:'metadata2', meta3:'metadata3'},
      eventType: {name: 'event type 1', pointStyle: {icon: 'icon for event type 1', marker_color: 'blue'} }
    },
    <Event>{url: 'event/url/2', metadata: {meta4: 'metadata4', meta5:'metadata5', meta6:'metadata6'},
      eventType: {name: 'event type 2', pointStyle: {icon: 'icon for event type 2', marker_color: 'blue'} }
    }
  ];
  private eventsFilterSubject: BehaviorSubject<EventFilter>;
  private eventFilter: EventFilter;

  constructor(){
    this.eventFilter = {
      level: null,
      types: [],
      metadata: [],
      hasPose: false
    }
    this.eventsFilterSubject = new BehaviorSubject<EventFilter>(this.eventFilter);
  }

  filterChangedNotification(){
    return this.eventsFilterSubject.asObservable();
  }

  updateFilter(types: Array<EventType>, meta: Array<string>, level: number, hasPose: boolean) {
   return null;
  }
}

class MockEventFilter extends EventFilterComponent{
  ngOnInit() {
    super.ngOnInit();
  }
}

describe('EventFilterComponent', () => {
  let component: EventFilterComponent;
  let fixture: ComponentFixture<EventFilterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MockEventFilter]
    }).overrideComponent(MockEventFilter, {
      set: {
        providers: [
          {provide: EventApiService, useFactory: () => new MockEventApiService()},
        ],

      }
    }).compileComponents();

  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MockEventFilter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });


  it('cardsUpdate(event_types: EventType[]) >> ', () => {
    let event_types = <EventType[]>[<EventType>{name: 'event type 1'}];
    let update_filter_spy = spyOn(component['eventService'], 'updateFilter').and.callThrough();
    component.cardsUpdate(event_types);
    expect(update_filter_spy).toHaveBeenCalledWith(event_types, null, null, null);
    expect(component.currentFilterTypes).toEqual(event_types);
  });


  it(' notifyCount(count) >> ', () => {
    let emit_spy = spyOn(component.countNotification, 'emit').and.returnValue(null);
    let count = 1;
    component.notifyCount(count);
    expect(emit_spy).toHaveBeenCalledWith(count)
  });


  it('expect mole-event-type-cards element to NOT BE NULL when useCards is true', () => {
    let mole_event_type_cards = fixture.debugElement.query(By.css('mole-event-type-cards'));
    expect(mole_event_type_cards).not.toBeNull();
  });


  it('expect mole-event-type-cards element to BE NULL when useCards is true', () => {
    component.useCards = false;
    fixture.detectChanges();
    let mole_event_type_cards = fixture.debugElement.query(By.css('mole-event-type-cards'));
    expect(mole_event_type_cards).toBeNull();
  });


  it('notifyCount is called when a countUpdate event occurs', () => {
    let mole_event_type_cards = fixture.debugElement.query(By.css('mole-event-type-cards'));
    let notify_count_spy = spyOn(component, 'notifyCount').and.returnValue(null);
    let event_obj = 5;
    mole_event_type_cards.triggerEventHandler('countUpdate', event_obj);
    expect(notify_count_spy).toHaveBeenCalledWith(event_obj);
  });


  it('cardsUpdate is called when a activeCardsNotify event occurs', () => {
    let mole_event_type_cards = fixture.debugElement.query(By.css('mole-event-type-cards'));
    let cards_update_spy = spyOn(component, 'cardsUpdate').and.returnValue(null);
    let event_obj = <EventType[]>[<EventType>{name: 'event type 1'}];
    mole_event_type_cards.triggerEventHandler('activeCardsNotify', event_obj);
    expect(cards_update_spy).toHaveBeenCalledWith(event_obj);
  });

});
