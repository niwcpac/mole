import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import {DebugElement} from "@angular/core";
import {EventSummaryComponent} from "./event-summary.component";
import {By} from "@angular/platform-browser";
import {EventApiService, EventTypeApiService, TrialApiService} from "../../../../shared/services";
import {EventType, EventFilter, TrialEventCount} from "../../../../shared/models";
import {BehaviorSubject} from "rxjs";

class MockEventTypeApiService{

  event_types: EventType[] = [<EventType>{name: 'event type 1'}, <EventType>{name: 'event type 2'}];
  event_types_sub: BehaviorSubject<EventType[]> = new BehaviorSubject<EventType[]>(this.event_types);

  getEventTypes(){
    return this.event_types_sub.asObservable();
  }
}

class MockEventApiService{

  event_filter: EventFilter = <EventFilter>{level: 2, types: [ {name: 'event type 1'}, {name: 'event type 2'} ] };
  event_filter_sub: BehaviorSubject<EventFilter> = new BehaviorSubject<EventFilter>(this.event_filter);

  filterChangedNotification(){
    return this.event_filter_sub.asObservable();
  }

  setPagedFilter(filter: EventFilter){
    return null;
  }
}

class MockTrialApiService{
  event_count: TrialEventCount = <TrialEventCount>{
    total: 6,
    events: [{name: 'event 1', count: 2}, {name: 'event 2', count: 4}]
  };

  event_count_sub: BehaviorSubject<TrialEventCount> = new BehaviorSubject<TrialEventCount>(this.event_count);

  getEventCount(){
    return this.event_count_sub.asObservable();
  }
}

class MockEventSummary extends EventSummaryComponent{
  ngOnInit() {
    super.ngOnInit();
  }
}

describe('EventSummaryComponent', () => {
  let component: EventSummaryComponent;
  let component_dom: DebugElement;
  let fixture: ComponentFixture<EventSummaryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MockEventSummary],
    }).overrideComponent(MockEventSummary, {
      set: {
        providers: [
          {provide: EventTypeApiService, useFactory: () => new MockEventTypeApiService()},
          {provide: EventApiService, useFactory: () => new MockEventApiService()},
          {provide: TrialApiService, useFactory: () => new MockTrialApiService()}
        ]
      }
    }).compileComponents();

    fixture = TestBed.createComponent(MockEventSummary);
    component = fixture.debugElement.componentInstance;
    component_dom = fixture.debugElement;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });


  it('ngOnInit() >> sets up trialService, eventTypeService, eventService subscriptions and sets currentEventCounts, eventTypes, and currentFilter to respective service observables', () => {
    expect(component.currentEventCounts).toEqual(component['trialService']['event_count']);
    expect(component.eventTypes).toEqual(component['eventTypeService']['event_types']);
    expect(component.currentFilter).toEqual(component['eventService']['event_filter']);
  });


  it('getTypeCount(eventType: string) >> uses passed string to match to a TrialEventCount and returns the current count for the matched event. If none found returns 0', () => {
    let result_found = 4;
    let count = component.getTypeCount('event 2');
    expect(count).toEqual(result_found);

    count = component.getTypeCount('');
    expect(count).toEqual(0);
  });


  it('clearFilters() >> empties currentFilter types and updates event service filters', () => {
    let set_paged_filter_spy = spyOn(component['eventService'], 'setPagedFilter').and.returnValue(null);
    let reset_filter = <EventFilter>{level: 2, types: []};
    expect(component.currentFilter.types).not.toEqual([]);
    component.clearFilters();
    expect(component.currentFilter.types).toEqual([]);
    expect(set_paged_filter_spy).toHaveBeenCalledWith(reset_filter);
  });


  it("div div-mat-spinner should NOT BE NULL when currentEventCounts is null, else NULL", () => {
    component.currentEventCounts = null;
    fixture.detectChanges();
    let spinner = fixture.debugElement.query(By.css('#div-mat-spinner'));
    expect(spinner).not.toBeNull();

    component.currentEventCounts = component['trialService']['event_count'];
    fixture.detectChanges();
    spinner = fixture.debugElement.query(By.css('#div-mat-spinner'));
    expect(spinner).toBeNull();
  });


  it("elements of ng-template should NOT BE NULL when currentEventCounts is NOT null, else NULL", () => {
    component.currentEventCounts = null;
    fixture.detectChanges();
    let card = fixture.debugElement.query(By.css('#outer-mat-card'));
    expect(card).toBeNull();

    component.currentEventCounts = component['trialService']['event_count'];
    console.log(component.currentEventCounts);
    fixture.detectChanges();
    card = fixture.debugElement.query(By.css('#outer-mat-card'));
    expect(card).not.toBeNull();
  });


  it("mat-chip mat-chip-counts should NOT BE NULL when currentEventCounts is NOT NULL, else NULL." +
    "When NOT null, mat-chip's innerText is set to currentEventCounts total", () => {

    component.currentEventCounts = component['trialService']['event_count'];
    fixture.detectChanges();

    let chip = fixture.debugElement.query(By.css('#mat-chip-counts'));
    expect(chip).not.toBeNull();
    expect(chip.properties.innerText.trim()).toEqual(String(component.currentEventCounts.total));

    component.currentEventCounts = null;
    fixture.detectChanges();

    chip = fixture.debugElement.query(By.css('#mat-chip-counts'));
    expect(chip).toBeNull();
  });


  it("clearFilters should run when button button-clear-filters is clicked", () => {
    let clear_filters_spy = spyOn(component, 'clearFilters').and.returnValue(null);
    let button = fixture.debugElement.query(By.css('#button-clear-filters'));
    button.triggerEventHandler('click', {});
    fixture.detectChanges();

    expect(clear_filters_spy).toHaveBeenCalled();
  });


  it("button button-clear-filters should be disabled when currentFilter types length is 0", () => {
    component.currentFilter.types = [<EventType>{}];
    fixture.detectChanges();

    let button = fixture.nativeElement.querySelector('#button-clear-filters');
    expect(button.disabled).toBeFalse();

    component.currentFilter.types = [];
    fixture.detectChanges();

    console.log(component.currentFilter);
    button = fixture.nativeElement.querySelector('#button-clear-filters');
    expect(button.disabled).toBeTrue();
  });

});
