import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import {DebugElement} from "@angular/core";

import { EventCreatorComponent } from './event-creator.component';

import {EventApiService, EventTypeApiService} from '../../../services';
import {BehaviorSubject, Observable} from "rxjs";

import {EventType} from "../../../models";
import {MatDialog} from "@angular/material/dialog";
import {EventDialogComponent} from "../..";


export class MockEventTypeApiService {
  private mock_data: EventType[] = [
    {
      url: 'eventtype/url/1',
      id: 1,
      name: 'eventtype 1',
      description: 'event type 1 description',
      eventLevel: 1,
      metadataStyleFields: 'metadata style fields',
      priorityMetadata: [],
      pointStyle: null,
      hasDuration: true,
      exclusiveWith: [],
      resetsWith: [],
      endsSegment: true,
      isManual: true
    },
    {
      url: 'eventtype/url/2',
      id: 2,
      name: 'eventtype 2',
      description: 'event type 2 description',
      eventLevel: 2,
      metadataStyleFields: 'metadata style fields',
      priorityMetadata: [],
      pointStyle: null,
      hasDuration: true,
      exclusiveWith: [],
      resetsWith: [],
      endsSegment: true,
      isManual: true,
    }
  ];

  private eventTypesSubject: BehaviorSubject<EventType[]>;

  constructor(){
    this.eventTypesSubject = new BehaviorSubject(this.mock_data);
  }

  public getEventTypes(): Observable<EventType[]> {
    return this.eventTypesSubject.asObservable();
  }
}

class MockEventApiService{
  event_obj = <Event><unknown>{id: 1, url: 'event/1/url'};

  getEventObject(eventType){
    return this.event_obj;
  }
}

class MockMatDialog{
  open(comp, config){
    return null;
  }
}

class MockEventCreator extends EventCreatorComponent{
  ngOnInit() {
    super.ngOnInit();
  }
}

describe('EventCreatorComponent', () => {
  let component: EventCreatorComponent;
  let component_dom: DebugElement;
  let fixture: ComponentFixture<EventCreatorComponent>;
  let mock_event_type_api_service: MockEventTypeApiService;

  beforeEach(async(() => {
    mock_event_type_api_service = new MockEventTypeApiService();

    TestBed.configureTestingModule({
      declarations: [MockEventCreator],
    }).overrideComponent(MockEventCreator, {
      set: {
        providers: [
          {provide: EventTypeApiService, useFactory: () => new MockEventTypeApiService()},
          {provide: EventApiService, useFactory: () => new MockEventApiService()},
          {provide: MatDialog, useFactory: () => new MockMatDialog()}
        ]
      }
    }).compileComponents();

    fixture = TestBed.createComponent(MockEventCreator);
    component = fixture.debugElement.componentInstance;
    component_dom = fixture.debugElement;
  }));


  it('should create', () => {
    expect(component).toBeTruthy();
  });


  it('showevents() >> !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!UNFINISHED!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!', () => {

  });


  it('createNewDialog(eventType) >> Open dialog with new created event as the data for the dialog', () => {
    let event_type = <EventType>{name: 'event type 1'};

    let dialog_spy = spyOn(component.dialog, 'open').and.callThrough();
    let get_event_object_spy = spyOn(component['eventService'], 'getEventObject').and.callThrough();

    component.createNewDialog(event_type);
    expect(dialog_spy).toHaveBeenCalledWith(EventDialogComponent, {width: '33vw', data: component['eventService']['event_obj']});
    expect(get_event_object_spy).toHaveBeenCalledWith(event_type);
  });


}); //end of EventCreatorComponent testing suite
