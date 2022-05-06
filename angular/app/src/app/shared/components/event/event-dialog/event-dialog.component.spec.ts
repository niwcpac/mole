import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EventDialogComponent } from './event-dialog.component';
import { EventTypeApiService, EventApiService } from '../../../services';
import {Event, EventType} from "../../../models";
import {BehaviorSubject, Observable, Subject} from "rxjs";

import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import {OrderPipe} from "ngx-order-pipe";
import {By} from "@angular/platform-browser";

class MockEventTypeApiService {
  private mock_data = <EventType[]>[
    {name: 'event type 1', pointStyle: {icon: 'icon for event type 1', marker_color: 'blue'}},
    {name: 'event type 2', pointStyle: {icon: 'icon for event type 2', marker_color: 'blue'}}
  ];

  private eventTypesSubject: BehaviorSubject<EventType[]>;

  constructor(){
    this.eventTypesSubject = new BehaviorSubject(this.mock_data);
  }

  public getEventTypes(): Observable<EventType[]> {
    return this.eventTypesSubject.asObservable();
  }
}//end of class MockEventTypeApi

class MockEventApiService {

  private mock_events = [
    <Event>{url: 'event/url/1', metadata: {meta1: 'metadata1', meta2:'metadata2', meta3:'metadata3'},
      eventType: {name: 'event type 1', pointStyle: {icon: 'icon for event type 1', marker_color: 'blue'} }
    },
    <Event>{url: 'event/url/2', metadata: {meta4: 'metadata4', meta5:'metadata5', meta6:'metadata6'},
      eventType: {name: 'event type 2', pointStyle: {icon: 'icon for event type 2', marker_color: 'blue'} }
    }
  ];
  private eventsPagedSubject: Subject<Event[]>;

  constructor(){
    this.eventsPagedSubject = new Subject<Event[]>();
  }

  updateEvent(){
    this.eventsPagedSubject.next(this.mock_events);
  }

  createEvent(event){
    return null;
  }
}


class MockMatDialogRef{
  constructor(){}

  close(){
    console.log("Dialogue Closed");
  }
}

class MockEventDialog extends EventDialogComponent{
  ngOnInit() {
    super.ngOnInit();
  }
}

describe('EventDialogComponent', () => {
  let component: EventDialogComponent;
  let fixture: ComponentFixture<EventDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MockEventDialog, OrderPipe]

    }).overrideComponent(MockEventDialog, {
      set: {
        providers: [
          {provide: EventTypeApiService, useFactory: () => new MockEventTypeApiService()},
          {provide: EventApiService, useFactory: () => new MockEventApiService()},
          {provide: MatDialogRef, useFactory: () => new MockMatDialogRef()},
          {provide: MAT_DIALOG_DATA, useFactory: () => new MockEventApiService()['mock_events'][0] },
        ],

      }
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MockEventDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });


  it('addMetadata(key: string, value: string) >> add new metadata key to components metadataKey list', () => {
    let new_meta = ['meta1', 'meta2', 'meta3', 'meta8'];

    component.addMetadata('meta8', 'metadata8');
    expect(component.metadataKeys).toEqual(new_meta);
  });


  it('addPose(pose) >> add startpose to current event object', () => {
    let pose = {
      url: 'pose/url',
      id: 1,
      coordinates: [102.3, 45],
      elevation: 200,
    }
    component.addPose(pose);
    expect(component.event.startPose).toEqual(pose);
  });


  it('removeMetadata(key: string) >> removes a metadata key from components metadataKey list', () => {
    let end_result_meta = ['meta1', 'meta3'];

    component.removeMetadata('meta2');
    expect(component.metadataKeys).toEqual(end_result_meta);
  });


  it('onSubmit(event: Event) >> expect updateEvent to be called and that the mat dialog closes', () => {
    let mock_event_update_spy = spyOn(component['_eventApiService'], 'updateEvent').and.returnValue(null);
    let mock_mat_ref_spy = spyOn(component.dialogRef, 'close').and.returnValue(null);

    let event = component['_eventApiService']['mock_events'][0];
    component.onSubmit(event);
    expect(mock_event_update_spy).toHaveBeenCalledWith(event);
    expect(mock_mat_ref_spy).toHaveBeenCalled();
  });


  it('onSubmit(event: Event) >> expect createEvent to be called and that the mat dialog closes', () => {
    let mock_event_create_spy = spyOn(component['_eventApiService'], 'createEvent').and.returnValue(null);
    let mock_mat_ref_spy = spyOn(component.dialogRef, 'close').and.returnValue(null);

    let event = component['_eventApiService']['mock_events'][0];
    event['url'] = '';
    component.onSubmit(event);
    expect(mock_event_create_spy).toHaveBeenCalledWith(event, component.localNotes, component.localImages);
    expect(mock_mat_ref_spy).toHaveBeenCalled();
  });


  it('onNoClick() >> dialog should be closed', () => {
    let mock_mat_ref_spy = spyOn(component.dialogRef, 'close').and.returnValue(null);
    component.onNoClick();
    expect(mock_mat_ref_spy).toHaveBeenCalled();
  });


  it('openEventApi(event: Event) >> opens specified event in window', () => {
    let window_spy = spyOn(window, 'open').and.returnValue(null);
    let event_to_open = component['_eventApiService']['mock_events'][0];
    component.openEventApi(event_to_open);

    expect(window_spy).toHaveBeenCalledWith(event_to_open['url']);
  });


  it('handleImageInput(images: FileList) >> queues up first image in filelist for upload', () => {
    let file_1 = new File(['blobby bits1'], 'file1');
    let file_2 = new File(['blobby bits2'], 'file2');
    const fileList = {
      0: file_1,
      1: file_2,
      length: 2,
      item: (index: number) => fileList[index]
    };

    component.handleImageInput(fileList);
    expect(component.imagesToUpload).toEqual([file_1]);
  });


  it('trackByFn(index: any, item: any) >> THIS METHOD SEEMS NOT FINISHED', () => {
    let index = 8;
    expect(component.trackByFn(index, {})).toEqual(8);
  });


  it('addMetadata is called when done button is clicked', () => {
    let click_event_addmetadata_spy = spyOn(component, 'addMetadata').and.returnValue(null);
    let desired_button = fixture.debugElement.query(By.css('button#button1-mat-tab-group'));
    let key_input = fixture.debugElement.query(By.css('input#input-key'));
    let value_input = fixture.debugElement.query(By.css('input#input-value'));


    desired_button.triggerEventHandler('click', {});
    fixture.detectChanges();

    expect(click_event_addmetadata_spy).toHaveBeenCalledWith(key_input.references.newKey.value, value_input.references.newValue.value);
  });


  it('onNoClick is called when cancel button is clicked', () => {
    let click_event_noclick_spy = spyOn(component, 'onNoClick').and.callThrough();
    let desired_button = fixture.debugElement.query(By.css('button#button1-dialog-action'));

    desired_button.triggerEventHandler('click', {});
    fixture.detectChanges();

    expect(click_event_noclick_spy).toHaveBeenCalled();
  });


  it('mole image/notes dialog to exist when the event has a url', () => {
    let mole_image_dialog = fixture.debugElement.query(By.css('mole-image-dialog'));
    let mole_notes_dialog = fixture.debugElement.query(By.css('mole-notes-dialog'));
    expect(mole_notes_dialog).not.toBeNull();
    expect(mole_image_dialog).not.toBeNull();
  });


  // it('mole image/notes dialog to NOT exist when the event has NO url', () => {
  //   component.event['url'] = null;
  //   fixture.detectChanges();
  //   let mole_image_dialog = fixture.debugElement.query(By.css('mole-image-dialog'));
  //   let mole_notes_dialog = fixture.debugElement.query(By.css('mole-notes-dialog'));
  //   expect(mole_image_dialog).toBeNull();
  //   expect(mole_notes_dialog).toBeNull();
  // });


  it('onSubmit called when ok button is clicked', () => {
    let on_submit_spy = spyOn(component, 'onSubmit').and.returnValue(null);
    let ok_button = fixture.debugElement.query(By.css('button#button2-dialog-action'));
    ok_button.triggerEventHandler('click', component.event);
    expect(on_submit_spy).toHaveBeenCalledWith(component.event);
  });

});
