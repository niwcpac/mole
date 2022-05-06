import {EventFilter, EventType} from "../../../../../shared/models";
import {BehaviorSubject} from "rxjs";
import {DebugElement} from "@angular/core";
import {async, ComponentFixture, TestBed} from "@angular/core/testing";
import {EventApiService} from "../../../../../shared/services";
import {SummaryCardComponent} from "./summary-card.component";
import Spy = jasmine.Spy;
import {By} from "@angular/platform-browser";

class MockEventApiService{

  event_filter: EventFilter = <EventFilter>{level: 2, types: [ {name: 'event type 1'}, {name: 'event type 2'} ] };
  event_filter_sub: BehaviorSubject<EventFilter> = new BehaviorSubject<EventFilter>(this.event_filter);

  filterChangedNotification(){
    return this.event_filter_sub.asObservable();
  }
}

class MockSummaryCard extends SummaryCardComponent{

  update_active_state_spy: Spy;

  ngOnInit() {
    this.update_active_state_spy = spyOn(SummaryCardComponent.prototype, 'updateActiveState').and.returnValue(null);
    super.ngOnInit();
  }
}

describe('SummaryCardComponent', () => {
  let component: SummaryCardComponent;
  let component_dom: DebugElement;
  let fixture: ComponentFixture<SummaryCardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MockSummaryCard],
    }).overrideComponent(MockSummaryCard, {
      set: {
        providers: [
          {provide: EventApiService, useFactory: () => new MockEventApiService()},
        ]
      }
    }).compileComponents();

    fixture = TestBed.createComponent(MockSummaryCard);
    component = fixture.debugElement.componentInstance;
    component_dom = fixture.debugElement;

    component.eventType = <EventType>{name: 'event type 1', pointStyle: {icon: 'circle', marker_color: 'green'}};
    component.count = 5;

    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });


  it('ngOnInit() >> adds filterChangedNotification subscription to subscriptions and updates isActive when filterChangedNotification emits a value', () => {
    expect(component['update_active_state_spy']).toHaveBeenCalledWith(component['eventService']['event_filter']);
  });


  it("updateActiveState(filter: EventFilter >> if passed event filter's name matches current event types name set isActive to true, else false", () => {
    component['update_active_state_spy'].and.callThrough();

    component.eventType = <EventType>{name: 'event type 1'};
    component.isActive = false;

    let event_filter_match = <EventFilter>{types: [
      <EventType>{name: 'event type 1'},
      <EventType>{name: 'event type 3'}
        ]};
    let event_filter_no_match = <EventFilter>{types: [ <EventType>{name: 'event type 4'} ] };

    component.updateActiveState(event_filter_match);
    expect(component.isActive).toBeTrue();

    component.isActive = true;
    component.updateActiveState(event_filter_no_match);
    expect(component.isActive).toBeFalse();
  });


  it('toggleFilter() >> !!!!!!!!!!!!!!!!!!!! NOT IMPLEMENTED !!!!!!!!!!!!!!!!!!!!!', () => {

  });


  it("toggleFilter should be called when mat-card is clicked", () => {
    let toggle_spy = spyOn(component, "toggleFilter").and.returnValue(null);
    let card = fixture.debugElement.query(By.css('mat-card'));
    card.triggerEventHandler('click', {});

    fixture.detectChanges();
    expect(toggle_spy).toHaveBeenCalled();
  });


  it("mat-card-content's span's innerText should be the count", () => {
    component.count = 7;
    fixture.detectChanges();

    let span = fixture.debugElement.query(By.css('span'));
    expect(span.properties.innerText.trim()).toEqual(String(component.count));
  });

});
