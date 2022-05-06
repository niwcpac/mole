import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { EventTypeCardsComponent } from './event-type-cards.component';
import {EventTypeApiService, TrialApiService} from "../../../services";
import {EventType, TrialEventCount} from "../../../models";
import {BehaviorSubject, Observable} from "rxjs";
import Spy = jasmine.Spy;
import {Component, QueryList, ViewChild} from "@angular/core";
import {By} from "@angular/platform-browser";

class MockEventTypeApiService{
  event_type_subject: BehaviorSubject<EventType[]>;
  event_types = [<EventType>{name: 'eventtype 1', isManual: true}, <EventType>{name: 'eventtype 2', isManual: true}];

  constructor() {
    this.event_type_subject = new BehaviorSubject<EventType[]>(this.event_types);
  }
  getCurrentTypes(): EventType[] {
    return this.event_types;
  }

  getEventTypes(): Observable<EventType[]> {
    return this.event_type_subject.asObservable();
  }
}

class MockTrialApiService{
  event_counts = {
    total: 2,
    events: [{name: 'trial event 1', count: 7}, {name: 'trial event 2', count: 3}]
  }
  event_count_subject: BehaviorSubject<TrialEventCount>;

  constructor() {
    this.event_count_subject = new BehaviorSubject<TrialEventCount>(this.event_counts);
  }

  getCurrentEventCounts(): TrialEventCount {
    return this.event_counts;
  }

  public getEventCount(): Observable<TrialEventCount> {
    return this.event_count_subject.asObservable();
  }
}

/*
* Create MockEventTypeCards as a component since the only way ngOnChanges is triggered other than by manual means, is
* if the changes are passed to the component by view and not just manually updated through accessing variables from class.
* So MockEventTypeCards creates a template that wraps event-type-cards in a div and has a viewChild to update (through
* the view) event triggers.
* */
@Component({
  template: '<div><mole-event-type-cards [useTitle]="mockTitle" [eventType]="mockEventType" [useToggle]="mockToggle"></mole-event-type-cards> </div>'
})
class MockEventTypeCards extends EventTypeCardsComponent{
  update_card_counts_spy: Spy;
  on_changes_spy: Spy;

  @ViewChild(EventTypeCardsComponent) mock_query_list: QueryList<EventTypeCardsComponent>
  mockEventType: EventType;
  mockTitle: boolean;
  mockToggle: boolean;

  ngOnInit() {
    this.update_card_counts_spy = spyOn<any>(EventTypeCardsComponent.prototype, 'updateCardCounts').and.returnValue(null);

    //Spy is placed on ngOnChanges to prevent calls to happen when MockEventTypeCards is initially created.
    this.on_changes_spy = spyOn<any>(EventTypeCardsComponent.prototype, 'ngOnChanges').and.returnValue(null);

    super.ngOnInit();
  }
}

describe('EventTypeCardsComponent', () => {
  let component: EventTypeCardsComponent;
  let fixture: ComponentFixture<EventTypeCardsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MockEventTypeCards, EventTypeCardsComponent]
    }).overrideComponent(MockEventTypeCards,{
      set:{
        providers: [
          {provide: EventTypeApiService, useFactory: () => new MockEventTypeApiService()},
          {provide: TrialApiService, useFactory: () => new MockTrialApiService()},
        ]
      }
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MockEventTypeCards);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });


  it("ngOnChanges(changes: SimpleChanges) >> sets each event-type-card's isActive state to true if the card exists in the activeStates array", () => {
    let active_states = [
      <EventType>{name: 'eventtype 1'},
      <EventType>{name: 'eventtype 3'},
      <EventType>{name: 'eventtype 4'},
      <EventType>{name: 'eventtype 2'}
    ];

    component['mockEventType'] = active_states;
    component['on_changes_spy'].and.callThrough();
    component.eventTypeCards.forEach(card => {
      expect(card.isActive).toEqual(false);
    })
    fixture.detectChanges();
    expect(component['on_changes_spy']).toHaveBeenCalled();
    component.eventTypeCards.forEach(card => {
      expect(card.isActive).toEqual(true);
    })
  });


  it('cardAction({eventType, active}) >> while toggle is true, adds eventType to activeStates if eventType is active and does not yet exist in activeStates ' +
    'or if eventType is not active remove from activeStates if present within. If toggle is false emits eventType on event "cardActionNotify"', () => {
    let active_card_emit_spy = spyOn(component.activeCardsNotify, 'emit').and.returnValue(null);
    let card_action_notify_spy = spyOn(component.cardActionNotify, 'emit').and.returnValue(null);

    let event_type = <EventType>{name:'active event type'};
    component.cardAction({eventType: event_type, active: true});
    expect(active_card_emit_spy).toHaveBeenCalledWith([event_type]);

    component.cardAction({eventType: event_type, active: false});
    expect(active_card_emit_spy).toHaveBeenCalledWith([]);

    component.useToggle = false;
    component.cardAction({eventType: event_type, active: true});
    expect(card_action_notify_spy).toHaveBeenCalledWith(event_type);
  });


  it('updateCardCounts() >> updates an eventType cards count if present in eventCounts then if any counts are in eventCounts emit the updated count total', () => {
    let count_update_spy = spyOn(component.countUpdate, 'emit').and.returnValue(null);
    component['eventCounts'] = {
      total: 10,
      events: [{name: 'eventtype 1', count: 7}, {name: 'eventtype 2', count: 3}]
    }

    component['update_card_counts_spy'].and.callThrough();
    component.updateCardCounts();

    expect(count_update_spy).toHaveBeenCalledWith(10);
    let index = 0;
    component.eventTypeCards.forEach(card => {
      expect(card.count).toEqual(component['eventCounts'].events[index].count.toString());
      index++;
    })
  });


  it("a mole-event-type-card should be created for each event type present in eventTypes", ()=> {
    let card_count = component.eventTypes.length;
    let card_elms = fixture.debugElement.queryAll(By.css('mole-event-type-card'));

    expect(card_elms.length).toEqual(card_count);
  });

});
