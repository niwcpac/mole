import {TestBed, fakeAsync, tick} from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { EventApiService } from './event-api.service';
import { AuthService } from '../auth/auth.service';
import { TrialApiService } from '../trial/trial-api.service';
import { RouterTestingModule } from '@angular/router/testing';
import {Router} from "@angular/router";

import {Event, EventType, EventImage, EventNote, EventFilter, EventPageResult, EventPayload} from "../../models";
import {BehaviorSubject, Observable, of, Subject} from "rxjs";
import Spy = jasmine.Spy;

describe('EventApiService', () => {
  let event_service: EventApiService;
  let auth_service: AuthService;
  let trial_api_service: TrialApiService;
  let http_testing_client: HttpTestingController;
  let auth_router: Router;
  let event_api_refresh_pose_spy: Spy;
  let event_api_refresh_page_spy: Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [EventApiService, AuthService, TrialApiService]});

    /*
    * Must use spy on TrialApiService since its constructor uses a method that uses a get request.
    * If not mocked for initialization then all tests with http requests will fail since the HttpTestingController
    * will think there are unresolved http requests.
    * */
    spyOn<any>(TrialApiService.prototype, 'initCurrentTrial').and.returnValue(null);
    spyOn(TrialApiService.prototype, 'getSelectedTrial').and.callFake(() => {
      return new Observable(subscriber => {
        subscriber.next(null);
      });
    });
    spyOn(EventApiService.prototype, 'setSelectedEventObject').and.callFake(() => {
      return 0;
    });

    event_api_refresh_pose_spy = spyOn(EventApiService.prototype, 'refreshPoseEvents').and.returnValue(null);
    event_api_refresh_page_spy = spyOn<any>(EventApiService.prototype, 'refreshPagedEvents').and.returnValue(null);

    event_service = TestBed.inject(EventApiService);
    auth_service = TestBed.inject<any>(AuthService);
    trial_api_service = TestBed.inject<any>(TrialApiService);
    http_testing_client = TestBed.inject<any>(HttpTestingController);
    auth_router = TestBed.inject<any>(Router);

    auth_router.initialNavigation();

  });

  /*
    run after every single test to make sure that our httpMock expectations are met
   */
  afterEach(() => {
    http_testing_client.verify();
  }); //end of afterEach()


  it('should be created', fakeAsync(() => {
    expect(event_service).toBeTruthy();
  }));


  it('getInitialPoseEvents(trialId), Events are retrieved and sorted', fakeAsync(() => {
    let trial_id: number = 1;
    let mock_adapted = []

    let mock_http_response_obj = { results: [
        {id: '1', modified_datetime: new Date("October 24, 2014 11:13:00"), start_datetime: new Date("October 24, 2014 11:13:00")},
        {id: '2', modified_datetime: new Date("October 29, 2014 11:13:00"), start_datetime: new Date("October 29, 2014 11:13:00")},
        {id: '3', modified_datetime: new Date("October 22, 2014 11:13:00"), start_datetime: new Date("October 22, 2014 11:13:00")},
        {id: '4', modified_datetime: new Date("October 17, 2014 11:13:00"), start_datetime: new Date("October 17, 2014 11:13:00")}
      ]};

    let mock_compare_date_array = [
      {id: '4', modified_datetime: new Date("October 17, 2014 11:13:00"), start_datetime: new Date("October 17, 2014 11:13:00")},
      {id: '3', modifiedDatetime: new Date("October 22, 2014 11:13:00"), startDatetime: new Date("October 22, 2014 11:13:00")},
      {id: '1', modifiedDatetime: new Date("October 24, 2014 11:13:00"), startDatetime: new Date("October 24, 2014 11:13:00")},
      {id: '2', modifiedDatetime: new Date("October 29, 2014 11:13:00"), startDatetime: new Date("October 29, 2014 11:13:00")}
    ]

    spyOn<any>(event_service['eventApiAdapters'], 'eventAdapter').and.callFake(function (item) {
      let new_item = {};
      new_item['id'] = item.id;
      new_item['modifiedDatetime'] = new Date(item.modified_datetime);
      new_item['startDatetime'] = new Date(item.start_datetime);

      mock_adapted.push(new_item);
      return new_item;
    });

    spyOn<any>(event_service['sharedHelpers'], 'compareDate').and.callFake(() => {
      return mock_compare_date_array;
    });

    //METHOD CALL
    event_service['getInitialPoseEvents'](trial_id);

    event_service['eventsPoseSubject'].subscribe(data => {
      expect(data).toEqual(mock_adapted);
      expect(event_service['currentPoseEvents']).toEqual(mock_adapted);
    })

    const req = http_testing_client.expectOne('/api/events?ordering=-modified_datetime&page_size=50&has_no_pose=false&trial=' + trial_id);
    expect(req.request.method).toEqual('GET');

    req.flush(mock_http_response_obj);

  }));



  it('refreshPagedEvents() >> where the trial is new', fakeAsync(() => {
    let trial_id: number = 1;

    let events: Event[] = [
      <Event><unknown>{startDateTime: new Date(2300)},
      <Event> {startDatetime: new Date(5000)},
      <Event> {startDatetime: new Date(8000)}
    ];

    let mock_http_obs: EventPageResult = {
      next: 'next/page/url',
      previous: 'previous/page/url',
      results: events
    };

    //Place spy on Subject.next method to know its various value states throughout the running of this method.
    let events_paged_subject_next_spy: any = spyOn<any>(event_service['eventsPagedSubject'], 'next').calls.all();

    //Place spies on specified methods and replace these method calls with spy method calls that always return same values.
    let page_result_adapter_spy = spyOn<any>(event_service['eventApiAdapters'], 'pageResultAdapter').and.returnValue(mock_http_obs);
    let add_filters_spy = spyOn<any>(event_service, 'addFilters').and.returnValue('built/url/to/be/passed/for/next/request');
    let reset_current_page_url_spy = spyOn<any>(event_service, 'resetCurrentPageUrl').and.returnValue('/api/events?trial=1');

    event_service['currentPageUrl'] = '/api/events?ordering=modified_datetime&page_size=50&has_no_pose=false&trial=' + trial_id;
    event_service['filterChanged'] = true;

    //METHOD CALL
    event_api_refresh_page_spy.and.callThrough();
    event_service['refreshPagedEvents']();

    event_service['eventsPagedSubject'].subscribe(data => {

      expect(event_service['currentPagedEvents']).toEqual(mock_http_obs.results);
      expect(data).toEqual(mock_http_obs.results);
      expect(mock_http_obs.next).toEqual(event_service['nextPageUrl']);
      expect(mock_http_obs.previous).toEqual(event_service['previousPageUrl']);
    });

    expect(events_paged_subject_next_spy[0].args[0]).toEqual([]);

    const req = http_testing_client.expectOne(event_service['currentPageUrl']);
    expect(req.request.method).toEqual('GET');

    req.flush(mock_http_obs);

    expect(add_filters_spy).toHaveBeenCalled(); //Must be called after flush since thats what actually kicks off the test
    expect(reset_current_page_url_spy).toHaveBeenCalled(); //Must be called after flush since thats what actually kicks off the test
    expect(page_result_adapter_spy).toHaveBeenCalledWith(mock_http_obs); //Must be called after flush since thats what actually kicks off the test
  }));


  it('resetCurrentPageUrl() >> Resets Current Page Url',() => {
    event_service['selectedTrialId'] = 23;
    event_service['resetCurrentPageUrl']();
    let new_url: string = '/api/events?trial=23';
    expect(event_service['currentPageUrl']).toBe(new_url);
  });


  it('getPagedEvents() >> Get reference to eventsPagedSubject Subject as observable object',() => {
    expect(event_service.getPagedEvents()).toBeInstanceOf(Observable);
  });


  it('getPoseEvents() >> Get reference to eventsPoseSubject Subject as observable object',() => {
    expect(event_service.getPoseEvents()).toBeInstanceOf(Observable);
  });


  it('getCurrentFilter() >> returns the current filter for component initialization',() => {
    let ev_filter: EventFilter = {level: null, types: [], metadata: [], hasPose: false};
    let ev_filter2: EventFilter = {level: 4, types:[], metadata: ["metadata1", "metadata2"], hasPose: true};

    expect(event_service.getCurrentFilter()).toEqual(ev_filter);

    ev_filter.level = 5;
    ev_filter.hasPose = true;

    event_service['eventFilter'] = ev_filter2;
    expect(event_service.getCurrentFilter()).toEqual(ev_filter2);
  });


  it('filterChangedNotification() >> Get reference to eventsFilterSubject Subject as observable object',() => {
    let ev_filter: EventFilter = {level: null, types: [], metadata: [], hasPose: false};

    expect(event_service.filterChangedNotification()).toBeInstanceOf(Observable);
    expect(event_service.filterChangedNotification()['source']['value']).toEqual(ev_filter);
  });


  it('getNextPage() >> Sets up state of current url and loading page dependent upon the events service current state.',() => {
    expect(event_service.getNextPage()).toBe(true);

    let next_page_url: string = 'next/page/url';

    event_service['nextPageUrl'] = next_page_url;
    event_service['loadingNewPage'] = false;

    event_service.getNextPage();
    expect(event_service['currentPageUrl']).toEqual(next_page_url);
    expect(event_service['nextPageUrl']).toEqual(null);
    expect(event_service['loadingNewPage']).toBe(true);

    expect(event_api_refresh_page_spy).toHaveBeenCalled();

  });


  it('getPreviousPage() >> Sets up state for previous page dependent upon the events service current state.',() => {
    expect(event_service.getPreviousPage()).toBe(undefined);

    let previous_page_url: string = 'previous/page/url';
    event_service['previousPageUrl'] = previous_page_url;

    event_service.getPreviousPage();
    expect(event_service['currentPageUrl']).toEqual(previous_page_url);
    expect(event_service['previousPageUrl']).toEqual(null);

    expect(event_api_refresh_page_spy).toHaveBeenCalled();

  });


  it('getSelectedEvent() >> Get reference to selectedEventSubject Subject as observable object',() => {
    expect(event_service.getSelectedEvent()).toBeInstanceOf(Observable);
  });


  it('getSelectedPagedEventIndex() >> Get reference to selectedEventSubject Subject as observable object',() => {
    expect(event_service.getSelectedPagedEventIndex()).toBeInstanceOf(Observable);
  });


  it('setSelectedEvent(eventId: number) >> emits eventId and pageIndex values to selectedEventSubject and selectedPagedIndexSubject respectively', fakeAsync(() => {
    let mock_event_array: Event[] = [
      <Event><unknown>{id: '4', modified_datetime: new Date("October 17, 2014 11:13:00"), start_datetime: new Date("October 17, 2014 11:13:00")},
      <Event><unknown>{id: '3', modifiedDatetime: new Date("October 22, 2014 11:13:00"), startDatetime: new Date("October 22, 2014 11:13:00")},
      <Event><unknown>{id: '1', modifiedDatetime: new Date("October 24, 2014 11:13:00"), startDatetime: new Date("October 24, 2014 11:13:00")},
      <Event><unknown>{id: '2', modifiedDatetime: new Date("October 29, 2014 11:13:00"), startDatetime: new Date("October 29, 2014 11:13:00")}
    ]

    event_service['currentPagedEvents'] = mock_event_array;

    //Regular Subject
    event_service['selectedPagedIndexSubject'].subscribe(value => {
      expect(value).toEqual(2);
    });

    event_service.setSelectedEvent(1);

    //BehaviorSubject
    event_service['selectedEventSubject'].subscribe(value => {
      expect(value).toEqual(1);
    });

  }));


  it('getSingleEvent() >> Get reference to singleEventSubject Subject as observable object',() => {
    expect(event_service.getSingleEvent()).toBeInstanceOf(Observable);
  });


  it('getSingleEventUpdate(event: Event) >> retrieves an event by id then emits the event object over singleEventSubject',fakeAsync(() => {
    let event_mock_obj = <Event><unknown>{
      url: 'event/url',
      id: 1,
      submitted_datetime: new Date(400000)
    };

    let oracle_event_mock = <Event>{
      url: 'event/url',
      id: 1,
      submittedDatetime: new Date(400000)
    };

    let event_adapter_spy = spyOn<any>(event_service['eventApiAdapters'], 'eventAdapter').and.callFake(event_data => {
      return {
        url: event_data.url,
        id: event_data.id,
        submittedDatetime: event_data.submitted_datetime,
      };
    });

    event_service.getSingleEventUpdate(event_mock_obj);

    event_service['singleEventSubject'].subscribe(data => {
      expect(data).toEqual(oracle_event_mock);
    })

    const req = http_testing_client.expectOne('event/url');
    expect(req.request.method).toEqual('GET');

    req.flush(event_mock_obj);

    expect(event_adapter_spy).toHaveBeenCalledWith(event_mock_obj); //Must be called after flush since thats what actually kicks off the test

  }));


  it('getEventsWithIds(eventIds: number[]) >> creates event url that has filters for current trial and all event id query params present',() => {

    let mock_url: string = '/api/events?trial=1&event_id=1&event_id=2&event_id=3';
    let event_ids: number[] = [1,2,3];

    expect(event_service.getEventsWithIds(event_ids)).toEqual(undefined);

    event_service['loadingNewPage'] = false;
    event_service['selectedTrialId'] = 1;
    event_service.getEventsWithIds(event_ids);

    expect(event_service['currentPageUrl']).toEqual(mock_url);
  });


  it('setPagedFilter(filter: EventFilter) >> sets up current event filter / update helpers and emits the new filter',fakeAsync(() => {
    let mock_event_filter: EventFilter = {
      level: null,
      types: [],
      metadata: [],
      hasPose: false,
    };

    event_service['eventsFilterSubject'].subscribe(data => {
      expect(data).toEqual(mock_event_filter);
    });

    event_service.setPagedFilter(mock_event_filter);

    expect(event_service['filterChanged']).toBe(true);
    expect(event_service['loadingNewPage']).toBe(true);

    expect(event_api_refresh_page_spy).toHaveBeenCalled(); //Must be called after flush since thats what actually kicks off the test
  }));


  it('addFilters() >> builds url that will house all filter params to be passed in next http request',() => {
    let mock_url_filter: string = '/current/url&event_level_gte=1&event_type=rugged+event&event_type=not+so+rugged+event' +
      '&event_type=other+event&metadata_contains=metadata1&has_no_pose=false';
    let mock_url_filter2: string = '/current/url&event_level_gte=1&event_type=rugged+event&event_type=not+so+rugged+event' +
      '&event_type=other+event';

    let mock_event_types = [
      <EventType>{ name: 'rugged event'},
      <EventType>{ name: 'not so rugged event'},
      <EventType>{ name: 'other event'}
    ];

    let mock_event_filter1: EventFilter = {
      level: 1,
      types: mock_event_types,
      metadata: ["metadata1"],
      hasPose: true
    };

    let mock_event_filter2: EventFilter = {
      level: 1,
      types: mock_event_types,
      metadata: [],
      hasPose: false
    };

    event_service['eventFilter'] = mock_event_filter1;
    event_service['currentPageUrl'] = '/current/url';
    event_service['addFilters']();

    expect(event_service['currentPageUrl']).toEqual(mock_url_filter);

    event_service['eventFilter'] = mock_event_filter2;
    event_service['currentPageUrl'] = '/current/url';
    event_service['addFilters']();

    expect(event_service['currentPageUrl']).toEqual(mock_url_filter2);
  });


  it('refreshPoseEvents() >> should do nothing if there are no events', fakeAsync(() => {
    expect(event_service['refreshPoseEvents']()).toBeNull();
  }));


  it('refreshPoseEvents() >> subscribes to or refreshes events. Any refresh will alert all subscribers of new event', fakeAsync(() => {
    let mock_event_array: Event[] = [
      <Event><unknown>{id: '4', modifiedDatetime: new Date("October 17, 2014 11:13:00"), startDatetime: new Date("October 17, 2014 11:13:00")},
      <Event><unknown>{id: '3', modifiedDatetime: new Date("October 22, 2014 11:13:00"), startDatetime: new Date("October 22, 2014 11:13:00")},
    ]

    let mock_result_values = { next: 'next/page/url', previous: 'previous/page/url', results: [] };
    let mock_result: Observable<EventPageResult>;

    let mock_event_adapters_spy = spyOn<any>(event_service['eventApiAdapters'], 'pageResultAdapter').and.callFake((item) => {
      mock_result_values.results.push(item);
    });

    let pose_subscribe_spy = spyOn(event_service, 'poseSubscribe').and.callFake(val => {
      mock_result = val;
      val.subscribe(data => {});
    });

    event_api_refresh_pose_spy.and.callThrough();

    event_service['currentPoseEvents'] = mock_event_array;
    event_service['latestEventTime'] = mock_event_array[1].modifiedDatetime;
    event_service['selectedTrialId'] = 1;


    event_service['refreshPoseEvents']();
    let req_url = '/api/events?ordering=-modified_datetime&has_no_pose=false&page_size=50&trial=1&modified_since='+mock_event_array[mock_event_array.length-1].modifiedDatetime.toISOString();
    const req = http_testing_client.expectOne(req_url);
    expect(req.request.method).toEqual('GET');

    req.flush(mock_event_array);

    expect(pose_subscribe_spy).toHaveBeenCalledWith(mock_result);
  }));


  it("poseSubscribe(eventsRequest: Observable<EventPageResult>) >> updates latestEventTime then updates currentPoseEvents which is emitted over eventsPoseSubject", () => {
    let mock_page_results: Event[] = [
      <Event><unknown>{id: '3', modifiedDatetime: new Date("October 22, 2014 11:13:00"), startDatetime: new Date("October 22, 2014 11:13:00")},
      <Event><unknown>{id: '4', modifiedDatetime: new Date("October 17, 2014 11:13:00"), startDatetime: new Date("October 17, 2014 11:13:00")}
    ]

    let mock_event_array: Event[] = [<Event><unknown>{id: '5', modifiedDatetime: new Date("October 15, 2014 11:13:00"), startDatetime: new Date("October 15, 2014 11:13:00")}];
    let mock_array_unique_spy = spyOn(event_service['sharedHelpers'], 'arrayUnique').and.returnValue(mock_event_array);
    let mock_get_pose_next_page_spy = spyOn(event_service, 'getPoseNextPage').and.returnValue(null);

    event_service['currentPoseEvents'] = mock_event_array;
    event_service['latestEventTime'] = mock_event_array[0].modifiedDatetime;
    let mock_page_result_value = { next: 'next/page/url', previous: 'previous/page/url', results: [mock_page_results[0], mock_page_results[1]] };

    let mock_request = new BehaviorSubject<EventPageResult>(mock_page_result_value);

    let latest_time = mock_page_results[0].modifiedDatetime;
    let current_pose = mock_page_results.concat(mock_event_array);
    event_service.poseSubscribe(mock_request);

    expect(event_service['latestEventTime']).toEqual(latest_time);
    let sub = event_service['eventsPoseSubject'].subscribe(data => {
      expect(data).toEqual(current_pose);
    });
    expect(mock_get_pose_next_page_spy).toHaveBeenCalledWith(mock_page_result_value.next);

    sub.unsubscribe();

    //When latest event time == pageResults latest event time
    event_service['latestEventTime'] = mock_page_results[0].modifiedDatetime;
    mock_page_results[0].modifiedDatetime.setMilliseconds(mock_page_results[0].modifiedDatetime.getMilliseconds() + 1);
    event_service.poseSubscribe(mock_request);
    expect(event_service['latestEventTime']).toEqual(mock_page_results[0].modifiedDatetime);

    //When latest event time is not set
    event_service['latestEventTime'] = null;
    latest_time = mock_page_results[0].modifiedDatetime;
    event_service.poseSubscribe(mock_request);
    expect(event_service['latestEventTime']).toEqual(latest_time);
  });


  it('getEventObject(eventType: EventType, startPose?: any) >> Creates an empty event except for event_type param',() => {
    let mock_event_type_obj: EventType = {
      url: 'eventtype/url',
      id: 1,
      name: "event type 1",
      description: "event type description",
      eventLevel: 1,
      metadataStyleFields: null,
      priorityMetadata: null,
      pointStyle: '',
      hasDuration: true,
      exclusiveWith: [],
      resetsWith: [],
      endsSegment: true,
      isManual: true
    };

    let mock_start_pose_obj = {
      url: 'start/pose/url',
      id: 1,
      point: {coordinates: [100,200]},
      coordinates: [1,2],
      elevation: 1000
    };

    let event_obj: Event = event_service.getEventObject(mock_event_type_obj, mock_start_pose_obj);
    expect(event_obj.url).toEqual(null);
    expect(event_obj.id).toEqual(null);
    expect(event_obj.submittedDatetime).toEqual(null);
    expect(event_obj.startDatetime).toEqual(null);
    expect(event_obj.endDatetime).toEqual(null);
    expect(event_obj.modifiedDatetime).toEqual(null);
    expect(event_obj.startPose).toEqual(mock_start_pose_obj);
    expect(event_obj.weather).toEqual(null);
    expect(event_obj.eventType).toEqual(mock_event_type_obj);
    expect(event_obj.trigger).toEqual(null);
    expect(event_obj.pointStyle).toEqual(null);
    expect(event_obj.notes).toEqual([]);
    expect(event_obj.images).toEqual([]);
    expect(event_obj.metadata).toEqual({});

    let event_obj2: Event = event_service.getEventObject(mock_event_type_obj);
    expect(event_obj2.startPose).toEqual(null);

  });

  it('createEventFromPayload(payload: EventPayload) >> ', () => {

    event_service.createEventFromPayload({}).subscribe();

    const req = http_testing_client.expectOne('/api/events/');
    expect(req.request.method).toEqual('POST');

    req.flush({});
  });



  it('updateEvent(event: Event) >> update param Event with updated values and get back new updated Event',fakeAsync(() => {

    let mock_event_payload_obj = <EventPayload>{
      notes: ["notes"]
    };

    let mock_event_obj = <Event>{
      url: 'event/url'
    };

    let event_payload_adapter_spy = spyOn<any>(event_service['eventPayloadApiAdapters'], 'eventPayloadAdapter').and.returnValue(mock_event_payload_obj);
    let get_single_event_updates_spy = spyOn(event_service, 'getSingleEventUpdate').and.returnValue(null)

    event_service.updateEvent(mock_event_obj);

    const req = http_testing_client.expectOne(mock_event_obj.url);
    expect(req.request.method).toEqual('PATCH');

    req.flush(mock_event_obj);

    expect(event_api_refresh_page_spy).toHaveBeenCalled(); //Must be called after flush since thats what actually kicks off the test
    expect(event_payload_adapter_spy).toHaveBeenCalledWith(mock_event_obj); //Must be called after flush since thats what actually kicks off the test
    expect(get_single_event_updates_spy).toHaveBeenCalledWith(mock_event_obj);

  }));


  it('addEventNote(note: string, event: Event) >> adds Note to specified POST param event object and then returns updated event object', fakeAsync(() => {
    let mock_note: string = 'note string';
    let mock_event_obj = <Event>{
      url: 'event/url'
    };

    let get_single_event_update_spy = spyOn<any>(event_service, 'getSingleEventUpdate').withArgs(mock_event_obj).and.returnValue(mock_event_obj);

    event_service.addEventNote(mock_event_obj, mock_note, true).subscribe();

    const req = http_testing_client.expectOne('/api/notes/')
    expect(req.request.method).toEqual('POST');

    req.flush(mock_event_obj);
    tick(15000);

    
    expect(get_single_event_update_spy).toHaveBeenCalledWith(mock_event_obj); //Must be called after flush since thats what actually kicks off the test
    expect(event_api_refresh_page_spy).toHaveBeenCalled(); //Must be called after flush since thats what actually kicks off the test
    // discardPeriodicTasks();
    // flush();
  }));


  it('updateEventNote(event: Event, note: EventNote, newValue: string) >> updates note of Event param with new note value PATCH request', fakeAsync(() => {
    let mock_event_obj = <Event>{
      url: 'event/url',
      endDatetime: new Date(50000),
      eventType: <EventType>{url: 'event/type/url'},
      notes: [<EventNote>{note: "i am note"}],
      images: [<EventImage>{url: 'event/image/url'}],
      metadata: "metadata"
    };

    let mock_event_note_obj = <EventNote>{
      url: 'event/note/url'
    };

    let mock_new_note_val: string = 'new note value';

    let get_single_event_update_spy = spyOn<any>(event_service, 'getSingleEventUpdate').and.returnValue(mock_event_obj);

    event_service.updateEventNote(mock_event_obj, mock_event_note_obj, mock_new_note_val);

    const req = http_testing_client.expectOne(mock_event_note_obj.url);
    expect(req.request.method).toEqual('PATCH');

    req.flush(mock_event_obj);
    expect(get_single_event_update_spy).toHaveBeenCalledWith(mock_event_obj); //Must be called after flush since thats what actually kicks off the test
  }));


  it('deleteEventNote(event: Event, note: EventNote) >> makes a delete request and gets back updated event', fakeAsync(() => {
    let mock_event_obj = <Event>{
      url: 'event/url'
    };
    let mock_event_note_obj = <EventNote>{
      url: 'event/note/url'
    };
    let get_single_event_update_spy = spyOn(event_service, 'getSingleEventUpdate').withArgs(mock_event_obj).and.returnValue(null);

    event_service.deleteEventNote(mock_event_obj, mock_event_note_obj);

    const req = http_testing_client.expectOne(mock_event_note_obj.url);
    expect(req.request.method).toEqual('DELETE');

    req.flush(mock_event_obj);

    expect(get_single_event_update_spy).toHaveBeenCalledWith(mock_event_obj); //Must be called after flush since thats what actually kicks off the test
  }));


  it('uploadEventImage(event: Event, image: File) >> returns progress status of image update', fakeAsync(() => {
    let mock_event_obj = <Event>{
      url: 'event/url'
    };
    let mock_image_file =  new File(['blobby bits1'], 'file1');

    let get_single_event_update_spy = spyOn(event_service, 'getSingleEventUpdate').withArgs(mock_event_obj).and.returnValue(null);

    event_service.uploadEventImage(mock_event_obj, mock_image_file).subscribe(data => {});

    const req = http_testing_client.expectOne(request => {
      return request.url === '/api/images/'
    });
    expect(req.request.method).toEqual('POST');
    req.flush(req);

    expect(get_single_event_update_spy).toHaveBeenCalledWith(mock_event_obj);
  }));


}); // end of test suite
