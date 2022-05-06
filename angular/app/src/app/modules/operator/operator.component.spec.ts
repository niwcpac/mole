import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import {DebugElement} from "@angular/core";
import {OperatorComponent} from "./operator.component";
import {By} from "@angular/platform-browser";
import {Mock} from "protractor/built/driverProviders";
import {BehaviorSubject, Observable, Subject} from "rxjs";
import {Event} from "../../shared/models";
import {EventApiService} from '../../shared/services';


class MockEventApiService{
  get_next_page: boolean;
  current_page_url: string;
  selected_event_subject: BehaviorSubject<number>;
  selected_event_object_subject: BehaviorSubject<Event>;
  selected_paged_index_subject: Subject<number>;
  events_paged_subject: Subject<Event[]>;
  is_tracking_live_events_subject: BehaviorSubject<boolean>;
  mock_events = [<Event>{id:1}, <Event>{id:2}, <Event>{id:3}];

  constructor() {
    this.get_next_page = false;
    this.current_page_url = '/api/events';
    this.selected_paged_index_subject = new Subject<number>();
    this.selected_event_subject = new BehaviorSubject<number>(1);
    this.selected_event_object_subject = new BehaviorSubject<Event>(this.mock_events[0]);
    this.events_paged_subject = new BehaviorSubject<Event[]>(this.mock_events);
    this.is_tracking_live_events_subject = new BehaviorSubject<boolean>(false);
  }

  getNextPage(){
    return this.get_next_page;
  }

  getEventsWithIds(eventIds: number[]){
    this.current_page_url = '/api/events?trial=1&event_id=1&event_id=2&';
  }

  getSelectedEvent(): Observable<number>{
    return this.selected_event_subject.asObservable();
  }

  getSelectedEventObject(): Observable<Event>{
    return this.selected_event_object_subject.asObservable();
  }

  setSelectedEvent(event_id: number){
    this.selected_event_subject.next(event_id);
    this.selected_paged_index_subject.next(event_id);
    let event_obj = <Event>{
      id: event_id
    }
    this.selected_event_object_subject.next(event_obj);
  }

  getSelectedPagedEventIndex(): Observable<number> {
    return this.selected_paged_index_subject.asObservable();
  }

  getPagedEvents(): Observable<Event[]>{
    return this.events_paged_subject.asObservable();
  }

  getIsTrackingLiveEvent(): Observable<boolean>{
    return this.is_tracking_live_events_subject.asObservable();
  }

  setLiveEventTracking(isTracking: boolean) {
    this.is_tracking_live_events_subject.next(isTracking);
  }
  
}

class MockOperator extends OperatorComponent{
  ngOnInit() {
    super.ngOnInit();
  }
}

describe('OperatorComponent', () => {
  let component: OperatorComponent;
  let component_dom: DebugElement;
  let fixture: ComponentFixture<OperatorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MockOperator],
    }).overrideComponent(MockOperator, {
      set: {
        providers: [
          {provide: EventApiService, useFactory: () => new MockEventApiService()},
        ]
      }
    }).compileComponents();

    fixture = TestBed.createComponent(MockOperator);
    component = fixture.debugElement.componentInstance;
    component_dom = fixture.debugElement;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });


  it('when created sets pageTitle to Operator', () => {
    expect(component.pageTitle).toEqual('Operator');
  });


  it('badgeUpdate(count) >> sets badgeCount to passed in count', () => {
    let result = 5;
    component.badgeUpdate(5);
    expect(component.badgeCount).toEqual(5);
  })


  it('testAction(eventType: EventType) >> !!!!!!!!!!!!!!!!!!!! NOT IMPLEMENTED JUST LOGS !!!!!!!!!!!!!!!!!!!!', () => {

  });


  it("span span-badgecount should NOT BE NULL when badgeCount is NOT null, else NULL." +
    "If badgeCount is not null mat-chip's innerText should be set to value of badgeCount", () => {

    component.badgeCount = 8;
    fixture.detectChanges();
    let span = fixture.debugElement.query(By.css('#span-badgecount'));
    expect(span).not.toBeNull();
    expect(span.children[0].properties.innerText.trim()).toEqual(String(component.badgeCount));

    component.badgeCount = null;
    fixture.detectChanges();
    span = fixture.debugElement.query(By.css('#span-badgecount'));
    expect(span).toBeNull();
  });


  it("when countNotification event is triggered badgeUpdate gets called and is passed event object", () => {
    let badge_update_spy = spyOn(component, 'badgeUpdate').and.returnValue(null);
    let event_obj = 6;
    let filter = fixture.debugElement.query(By.css('#mole-event-filter-1'));
    filter.triggerEventHandler('countNotification', event_obj);
    fixture.detectChanges();

    expect(badge_update_spy).toHaveBeenCalledWith(event_obj);
  });

});
