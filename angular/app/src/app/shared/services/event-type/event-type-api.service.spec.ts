import {TestBed, fakeAsync} from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { EventTypeApiService } from './event-type-api.service';
import { AuthService } from '../auth/auth.service';
import { RouterTestingModule } from '@angular/router/testing';
import {Router} from "@angular/router";

import {Event, EventType, EventImage, EventNote, EventFilter, EventPageResult, EventPayload, Trial} from "../../models";
import {BehaviorSubject, Observable, Subject} from "rxjs";
import Spy = jasmine.Spy;
import {EventApiService} from "..";

describe('EventTypeApiService', () => {
  let event_type_service: EventTypeApiService;
  let http_testing_client: HttpTestingController;
  let auth_router: Router;
  let init_event_type_spy: Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [EventTypeApiService, AuthService]
    });

    init_event_type_spy = spyOn<any>(EventTypeApiService.prototype, 'initEventTypes').and.returnValue(null);

    event_type_service = TestBed.inject(EventTypeApiService);
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
    expect(event_type_service).toBeTruthy();
  }));


  it('initEventTypes() >> expect adapted event types returned by get request to update eventTypes property and emit the received eventTypes', fakeAsync(() => {
    init_event_type_spy.and.callThrough();

    let mock_event_type_obj_list = <EventType[]>[
      <EventType>{
        url: 'event/type/url/1'
      },
      <EventType>{
        url: 'event/type/url/2'
      }
    ];

    let event_type_adapter_spy = spyOn<any>(event_type_service['eventTypeApiAdapters'], 'eventTypeAdapter').and.callFake(data => {
      return data;
    });

    event_type_service['initEventTypes']();

    const req = http_testing_client.expectOne('/api/event_types/');
    expect(req.request.method).toEqual('GET');

    req.flush(mock_event_type_obj_list);

    // Have this after flush since it is a behavior
    event_type_service['eventTypesSubject'].subscribe(data => {
      expect(data).toEqual(mock_event_type_obj_list);
    });

    expect(event_type_adapter_spy).toHaveBeenCalledWith(mock_event_type_obj_list[0]);
    expect(event_type_adapter_spy).toHaveBeenCalledWith(mock_event_type_obj_list[1]);
    expect(event_type_service['eventTypes']).toEqual(mock_event_type_obj_list);
  }));


  it('getEventTypes() >> Get reference to eventTypesSubject Subject as observable object ', fakeAsync(() => {
    expect(event_type_service.getEventTypes()).toBeInstanceOf(Observable);
  }));


  it("getCurrentTypes() >> Get immediate result with no call to server for eventTypes if there, else [] is returned", () => {
    let mock_event_type_obj_list = <EventType[]>[
      <EventType>{
        url: 'event/type/url/1'
      },
      <EventType>{
        url: 'event/type/url/2'
      }
    ];

    expect(event_type_service.getCurrentTypes()).toEqual([]);

    event_type_service['eventTypes'] = mock_event_type_obj_list;
    expect(event_type_service.getCurrentTypes()).toEqual(mock_event_type_obj_list);
  });

}); //end of describe test suite
