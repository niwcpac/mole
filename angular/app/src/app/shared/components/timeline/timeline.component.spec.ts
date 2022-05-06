import {async, ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';
import { TimelineCardService } from './timeline-card/service/timeline-card.service';
import { TimelineComponent } from './timeline.component';
import {EventApiService, EventTypeApiService} from "../../services";
import {ScrollDispatcher, ViewportRuler} from "@angular/cdk/overlay";
import {BehaviorSubject, Observable, Subject} from "rxjs";
import {Event} from "../../models";
import {MatDialog} from "@angular/material/dialog";
import Spy = jasmine.Spy;
import {AfterViewInit, OnInit} from "@angular/core";
import * as rxjs from 'rxjs';
import {CdkVirtualScrollViewport, VirtualScrollStrategy} from "@angular/cdk/scrolling";
import {ListRange} from "@angular/cdk/collections";
import {Directionality} from "@angular/cdk/bidi";
import {CdkScrollable} from "@angular/cdk/scrolling/scrollable";
import {By} from "@angular/platform-browser";

class MockEventApiService{
  get_next_page: boolean;
  current_page_url: string;
  selected_event_subject: BehaviorSubject<number>;
  selected_paged_index_subject: Subject<number>;
  events_paged_subject: Subject<Event[]>;
  is_tracking_live_events_subject: BehaviorSubject<boolean>;
  mock_events = [<Event>{id:1}, <Event>{id:2}, <Event>{id:3}];

  constructor() {
    this.get_next_page = false;
    this.current_page_url = '/api/events';
    this.selected_paged_index_subject = new Subject<number>();
    this.selected_event_subject = new BehaviorSubject<number>(1);
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

  setSelectedEvent(event_id: number){
    this.selected_event_subject.next(event_id);
    this.selected_paged_index_subject.next(event_id);
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
}

class MockTimelineComponent extends TimelineComponent{
  /*
    * Angular 9 has a bug with TestBed spying on lifecycle hook methods. To get around this we mock the component being tested and have
    * the mock component's lifecycle hook be called by Angular, and the child will call the parent component lifecycle hook. By doing this,
    * we are then able to spy on the parents lifecycle hook.
    * */
  private ng_after_view_init_spy = spyOn<any>(TimelineComponent.prototype, 'ngAfterViewInit').and.returnValue(null);

  ngAfterViewInit() {
    super.ngAfterViewInit();
  }
}

class MockTimelineCardService {
  private cardHeightSubject: BehaviorSubject<number>;
  private currentHeight: number = 50;
  private prevHeight: number = 50;

  private cardHeighCookieName: string = "timeline-card-height";

  constructor() {
    this.cardHeightSubject = new BehaviorSubject<number>(50);
  }

  getEventCardHeight(): Observable<number> {
    return this.cardHeightSubject.asObservable();
  }

  setEventCardHeight(eventId: number, height: number) {
    if (!height || typeof(height) == 'undefined') {
      return;
    }

    // 50px is the minimum height to display event type name and time submitted
    if (height < 50) {
      height = 50;
    }

    // retain previous height if user chooses to revert their resize action
    this.prevHeight = this.currentHeight;
    this.currentHeight = height;

    this.cardHeightSubject.next(this.currentHeight); // publish new height to cards
    this.updateCookie();
  }

  revertEventCardHeight() {
    this.currentHeight = this.prevHeight;
    this.cardHeightSubject.next(this.currentHeight);
    this.updateCookie();
  }

  private updateCookie() {
    console.log(this.cardHeighCookieName, 'set to', this.currentHeight);
  }
}

class MockViewport{
  scrollOffsetBottom: number = 100;
  scrollOffsetTop:number = 700;
  renderedRangeValue = {start: 0, end: 2};
  itemSize = 50;

  measureScrollOffset(val: string){
    if(val == "bottom"){
      return this.scrollOffsetBottom;
    }
    else if(val == "top"){
      return this.scrollOffsetTop
    }
    else{
     return 1000;
    }
  }

  measureRenderedContentSize() {
    return 1000;
  }

  getViewportSize() {
    return 800;
  }


  getRenderedRange()
  {
    return this.renderedRangeValue;
  }
}

describe('TimelineComponent', () => {
  let component: TimelineComponent;
  let fixture: ComponentFixture<TimelineComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MockTimelineComponent]
    }).overrideComponent(MockTimelineComponent, {
      set: {
        providers: [
          {provide: EventApiService, useFactory: () => new MockEventApiService()},
          {provide: TimelineCardService, useFactory: () => new MockTimelineCardService()},
          // {provide: CdkVirtualScrollViewport, useFactory: () => new MockViewport()},
          {provide: ScrollDispatcher}
        ]
      }
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MockTimelineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });


  it('ngAfterViewInit() >> load more data when close to bottom of timeline', fakeAsync(() => {
    /*
    * create new component so that when we call detectChanges() the ngAfterViewInit lifecycle will execute but
    * this time call will be the actual ngAfterViewInit implementation since we alter the spy before lifecycle hooks are called
    * */
    component['ng_after_view_init_spy'].and.callThrough();
    component['_eventApiService']['get_next_page'] = true;
    component.viewport = <CdkVirtualScrollViewport><unknown>new MockViewport();
    component.ngAfterViewInit();

    component['scrollDispatcher']['_scrolled'].next();
    tick(10000);
    component.refreshEventsSubscription.unsubscribe();

    expect(component.atTimelineTop).toBeFalse();
    expect(component.eventsToLoad).toBeTrue();
  }));


  it('ngAfterViewInit() >> dont load more data when close to top of timeline', fakeAsync(() => {
    /*
    * create new component so that when we call detectChanges() the ngAfterViewInit lifecycle will execute but
    * this time call will be the actual ngAfterViewInit implementation since we alter the spy before lifecycle hooks are called
    * */
    component['ng_after_view_init_spy'].and.callThrough();
    component.viewport = <CdkVirtualScrollViewport><unknown>new MockViewport();
    component.viewport['scrollOffsetBottom'] = 700;
    component.viewport['scrollOffsetTop'] = 100;
    component.ngAfterViewInit();

    component['scrollDispatcher']['_scrolled'].next();
    tick(10000);
    component.refreshEventsSubscription.unsubscribe();

    expect(component.atTimelineTop).toBeTrue();
  }));


  it('ngAfterViewInit() >> refreshes rendered events to indexes of first two current events in localEventData', fakeAsync(() => {
    component['ng_after_view_init_spy'].and.callThrough();
    component.viewport = <CdkVirtualScrollViewport><unknown>new MockViewport();
    component.atTimelineTop = false;
    component.ngAfterViewInit();

    tick(10000);
    component.refreshEventsSubscription.unsubscribe();

    expect(component.renderedEvents.length).toEqual(2);
    expect(component.renderedEvents).toEqual([3,2]);
  }));


  // it('scrollToEventIndex(eventIndex: number) >> !!!!!!!!!!!!!!!!!!!! scrollToEventIndex(eventIndex: number) is NOT IMPLEMENTED !!!!!!!!!!!!!!!!!!!!', () => {
  // });


  // it('setSelectedEvent(event: Event) >> sets selectedEvent to passed event id', () => {
  //   let mock_event = <Event>{id: 67};
  //   let set_selected_spy = spyOn(component['_eventApiService'], 'setSelectedEvent').and.callThrough();

  //   component.setSelectedEvent(mock_event);
  //   expect(set_selected_spy).toHaveBeenCalledWith(mock_event.id);
  //   expect(component.selectedEvent).toEqual(67);
  // });


  // it('trackByIdx(i) >> !!!!!!!!!!!!!!!!!!!! trackByIdx(i) is NOT IMPLEMENTED !!!!!!!!!!!!!!!!!!!!', () => {
  // });


  it("mole-timeline-card should be NOT NULL when there are NO events to load", () => {
    // component.viewport = <CdkVirtualScrollViewport><unknown>new MockViewport();
    let mole_timeline_card = fixture.debugElement.query(By.css('#mole-timeline-card2'));
    expect(mole_timeline_card).not.toBeNull();
  });


  it("mole-timeline-card should be NULL when there ARE events to load", () => {
    // component.viewport = <CdkVirtualScrollViewport><unknown>new MockViewport();
    component.eventsToLoad = true;
    fixture.detectChanges();
    let mole_timeline_card = fixture.debugElement.query(By.css('#mole-timeline-card2'));
    expect(mole_timeline_card).toBeNull();
  });


  it("mat-spinner should NOT BE NULL when there ARE events to load", () => {
    // component.viewport = <CdkVirtualScrollViewport><unknown>new MockViewport();
    component.eventsToLoad = true;
    fixture.detectChanges();
    let mat_spinner = fixture.debugElement.query(By.css('mat-spinner'));
    expect(mat_spinner).not.toBeNull();
  });


  it("mat-spinner should BE NULL when there ARE NOT events to load", () => {
    // component.viewport = <CdkVirtualScrollViewport><unknown>new MockViewport();
    let mat_spinner = fixture.debugElement.query(By.css('mat-spinner'));
    expect(mat_spinner).toBeNull();
  });

});
