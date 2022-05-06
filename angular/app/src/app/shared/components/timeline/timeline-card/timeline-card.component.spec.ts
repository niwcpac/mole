import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { TimelineCardComponent } from './timeline-card.component';
import {BehaviorSubject, Observable, Subject} from "rxjs";
import {Event, EventImage, EventNote, EventType, Pose} from "../../../models";
import Spy = jasmine.Spy;
import {EventApiService, EventTypeApiService} from "../../../services";
import {MatDialog} from "@angular/material/dialog";
import {Lightbox} from "@ngx-gallery/lightbox";
import {Gallery, GalleryItem, ImageItem} from "@ngx-gallery/core";
import {OrderByPipe} from "ngx-pipes";
import {DurationFromMillisecondsPipe, DurationToFormatPipe} from "luxon-angular";
import {EventDialogComponent, ImageDialogComponent, NotesDialogComponent} from "../..";
import {By} from "@angular/platform-browser";
import {compilePipeFromMetadata} from "@angular/compiler";
import {trigger} from "@angular/animations";
import { TimelineCardService } from './service/timeline-card.service';

class MockEventApiService{
  selected_event_subject: BehaviorSubject<number>;
  event_id: number;

  constructor() {
    this.event_id = 1;
    this.selected_event_subject = new BehaviorSubject<number>(this.event_id);
  }

  getSelectedEvent(): Observable<number>{
    return this.selected_event_subject.asObservable();
  }

  updateEvent(event: Event) {
    return null;
    //might emit new event for singleEventSubject Subject<Event>
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

class MockEventTypeApiService{

  event_types_subject: BehaviorSubject<EventType[]>;
  event_types: EventType[];

  constructor() {
    this.event_types = [];
    this.event_types_subject = new BehaviorSubject<EventType[]>(this.event_types);
  }

  getEventTypes(): Observable<EventType[]> {
    return this.event_types_subject.asObservable();
  }
}

class MockMatDialog{

  dialog_ref = new BehaviorSubject<any>(null);
  after_close = {
    afterClosed: () => {
      return this.dialog_ref;
    }
  };

  open(component, config){
    return this.after_close;
  }
}

class MockGallery{
  load_func = {
    load: (param) => {return null}
  };

  ref(id){
    return this.load_func;
  }
}

class MockLightBox{
  open(index, id, config){
    return null;
  }
}

class MockTimelineCard extends  TimelineCardComponent{
  ngOnInit() {
    super.ngOnInit();
  }
}

describe('TimelineCardComponent', () => {
  let component: TimelineCardComponent;
  let fixture: ComponentFixture<TimelineCardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MockTimelineCard, OrderByPipe, DurationToFormatPipe, DurationFromMillisecondsPipe]
    }).overrideComponent(MockTimelineCard, {
      set: {
        providers: [
          {provide: EventApiService, useFactory: () => new MockEventApiService()},
          {provide: TimelineCardService, useFactory: () => new MockTimelineCardService()},
          {provide: EventTypeApiService, useFactory: () => new MockEventTypeApiService()},
          {provide: MatDialog, useFactory: () => new MockMatDialog()},
          {provide: Gallery, useFactory: () => new MockGallery()},
          {provide: Lightbox, useFactory: () => new MockLightBox()}
        ]
      }
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MockTimelineCard);
    component = fixture.componentInstance;

    component.event = <Event>{
      eventType: <EventType>{
        pointStyle: {icon: 'pointStyle icon', marker_color: 'green'},
        name: 'eventtype name',
        hasDuration: true
      },
      url: 'event/url',
      startDatetime: new Date(50000),
      endDatetime: new Date(80000),
      metadata: {meta1: 'meta1', meta2: 'meta2'},
      notes: [<EventNote>{note: 'note1'}, <EventNote>{note: 'note2'} ],
      images: [<EventImage>{image: 'image1'}, <EventImage>{image: 'image2'}],
      startPose: <Pose>{url: 'start/pose/url', id: 1, coordinates: [0,0], elevation: 0},
      id: 1,
      pointStyle: {icon: 'pointStyle icon', marker_color: 'green'},
    };


    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });


  it('openApi(event: Event) >> expect window to open specified events url', () => {
    let window_open_spy = spyOn(window, 'open').and.returnValue(null);
    let mock_event = <Event>{url: 'event/url'};
    component.openApi(mock_event);
    expect(window_open_spy).toHaveBeenCalledWith(mock_event.url);
  });


  it('endEvent(event: Event) >> sets events endDatetime an updates change', () => {
    let update_event_spy = spyOn(component['_eventApiService'], 'updateEvent').and.returnValue(null);
    let mock_event = component.event;
    let date = new Date();
    component.endEvent(mock_event);
    expect(update_event_spy).toHaveBeenCalledWith(mock_event);
    expect(mock_event.endDatetime).toEqual(date);
  });


  it('addPose(pose) >> set events startPose to passed in pose', () => {
    let pose = {url: 'pose/url', id: 1, coordinates:[], elevation:5};
    component.addPose(pose);
    expect(component.event.startPose).toEqual(pose);
  });


  it('removeMetadata(key: string) >> remove specified metadata from events metadata', () => {
    let meta_remove = 'meta1';
    let result_meta = {meta2: 'meta2'};
    component.removeMetadata(meta_remove);
    expect(component.event.metadata).toEqual(result_meta);
  });


  it('updateMetadataKey(key: string, event: any) >> updates metadata key to changed input elements value and updates editingMetadata to show its editing', () => {
    let new_key = 'newmeta1';
    let key = 'meta1';
    let old_value = component.event.metadata[key];

    let change_event_value = {target: {value: new_key} };
    let result_meta_keys = ['meta2', new_key];

    let remove_meta_spy = spyOn(component, 'removeMetadata').and.callFake(() => { component.event.metadata = {meta2: 'meta2'} });

    component.updateMetadataKey(key, change_event_value);

    expect(remove_meta_spy).toHaveBeenCalledWith(key);
    expect(Object.keys(component.event.metadata)).toEqual(result_meta_keys);
    expect(component.event.metadata[new_key]).toEqual(old_value);
    expect(component.editingMetadata[new_key]).toBeTrue();
  });


  it('updateMetadataValue(key: string, event: any) >> updates metadata value to changed input elements value', () => {
    let key = 'meta1';
    let new_value = 'the new value'
    let change_event_value = {target: {value: new_value} };

    component.updateMetadataValue(key, change_event_value);
    expect(component.event.metadata[key]).toEqual(new_value);
  });


  it('openEventDialog(event) >> opens EventDialog modal window and on close console logs its closing', () => {
    let dialog_open_spy = spyOn(component.dialog, 'open').and.callThrough();
    let open_params = {width: '33vw', data: component.event};

    component.openEventDialog(component.event);
    expect(dialog_open_spy).toHaveBeenCalledWith(EventDialogComponent, open_params);
  });


  it('openImagesDialog() >> open images dialog modal if there are no images for current event', () => {
    component.event.images = [];
    let dialog_open_spy = spyOn(component.dialog, 'open').and.callThrough();
    let open_params = {width: '50vw', data: component.event};
    component.openImagesDialog();
    expect(dialog_open_spy).toHaveBeenCalledWith(ImageDialogComponent, open_params);
  });


  it('openImagesDialog() >> open image lightbox overlay if there are images for current event', () => {
    let dialog_open_spy = spyOn(component['imageViewer'], 'open').and.callThrough();
    let load_images_to_gallery_spy = spyOn(component, 'loadImagesToGallery').and.returnValue(null);

    component.openImagesDialog();

    expect(dialog_open_spy).toHaveBeenCalledWith(0, 'eventImages', {});
    expect(load_images_to_gallery_spy).toHaveBeenCalled();
  });


  it('openNotesDialog() >> ', () => {
    let dialog_open_spy = spyOn(component.dialog, 'open').and.callThrough();
    let open_params = {width: '33vw', data: component.event};

    component.openNotesDialog();
    expect(dialog_open_spy).toHaveBeenCalledWith(NotesDialogComponent, open_params);
  });


  it('loadImagesToGallery() >> creates an ImageItem for each image in event and then is loaded to gallery', () => {
    let gallery_ref_spy = spyOn(component.imageGallery, 'ref').and.callThrough();
    let gallery_load_spy = spyOn(component.imageGallery['load_func'], 'load').and.callThrough();

    component.loadImagesToGallery();

    expect(gallery_ref_spy).toHaveBeenCalledWith('eventImages');
    for(let i =0; i<component.event.images.length; i++){
      let oracle_value = new ImageItem({src: component.event.images[i].imageUrl, thumb: component.event.images[i].thumbUrl});
      expect(component.eventImages[i]).toEqual(oracle_value);
    }
    expect(gallery_load_spy).toHaveBeenCalledWith(component.eventImages);
  });


  it('getEventPointStyle(event: Event) >> gets the events event type point style if currently editing or gets the events point style', () => {
    let result = component.getEventPointStyle(component.event);
    expect(result).toEqual(component.event.pointStyle);

    component.inEdit = true;
    let result2 = component.getEventPointStyle(component.event);
    expect(result2).toEqual(component.event.eventType.pointStyle);
  });


  it('getEventDuration(start: Date, end: Date) >> gets duration of event in milliseconds', () => {
    let start = new Date(100000);
    let end = new Date(500000);
    let result_value = 400000;
    let duration_spy = spyOn(component.sharedHelpers, 'getDuration').and.returnValue(result_value);
    let result = component.getEventDuration(start, end);
    expect(duration_spy).toHaveBeenCalledWith(start, end);
    expect(result).toEqual(result_value);
  });


  it('toggleEditType() >> sets editingType to opposite boolean value', () => {
    component.editingType = true;
    component.toggleEditType();
    expect(component.editingType).toBeFalse();

    component.editingType = false;
    component.toggleEditType();
    expect(component.editingType).toBeTrue();
  });


  it('toggleEditStartDatetime() >>  sets editingStartDatetime to opposite boolean value', () => {
    component.editingStartDatetime = false;
    component.toggleEditStartDatetime();
    expect(component.editingStartDatetime).toBeTrue();

    component.editingStartDatetime = true;
    component.toggleEditStartDatetime();
    expect(component.editingStartDatetime).toBeFalse();
  });


  it('toggleEditEndDatetime() >>  sets editingEndDatetime to opposite boolean value', () => {
    component.editingEndDatetime = true;
    component.toggleEditEndDatetime();
    expect(component.editingEndDatetime).toBeFalse();

    component.editingEndDatetime = false;
    component.toggleEditEndDatetime();
    expect(component.editingEndDatetime).toBeTrue();
  });


  it('toggleEditPose() >>  sets editingPose to opposite boolean value', () => {
    component.editingPose = false;
    component.toggleEditPose();
    expect(component.editingPose).toBeTrue();

    component.editingPose = true;
    component.toggleEditPose();
    expect(component.editingPose).toBeFalse();
  });


  it('toggleEditMetadata(key: string) >>  sets editingMetadata at specified key to opposite boolean value', () => {
    let key = 'meta1';
    component.editingMetadata[key] = true;
    component.toggleEditMetadata(key);
    expect(component.editingMetadata[key]).toBeFalse();

    component.editingMetadata[key] = false;
    component.toggleEditMetadata(key);
    expect(component.editingMetadata[key]).toBeTrue();
  });


  it("mat-card element is NOT NULL when last is FALSE else it is NULL", () => {
    component.last = false;
    fixture.detectChanges();
    let mat_card = fixture.debugElement.query(By.css('#mat-card-timeline'));
    expect(mat_card).not.toBeNull();

    component.last = true;
    fixture.detectChanges();
    mat_card = fixture.debugElement.query(By.css('#mat-card-timeline'));
    expect(mat_card).toBeNull();
  });


  it("mat-card-title NOT NULL if inEdit OR editingType FALSE, else it is NULL", () => {
    component.inEdit = false;
    component.editingType = true;
    fixture.detectChanges();
    let mat_card_title = fixture.debugElement.query(By.css('#mat-card-title-timeline'));
    expect(mat_card_title).not.toBeNull();

    component.inEdit = true;
    component.editingType = false;
    fixture.detectChanges();
    mat_card_title = fixture.debugElement.query(By.css('#mat-card-title-timeline'));
    expect(mat_card_title).not.toBeNull();

    component.inEdit = true;
    component.editingType = true;
    fixture.detectChanges();
    mat_card_title = fixture.debugElement.query(By.css('#mat-card-title-timeline'));
    expect(mat_card_title).toBeNull();
  });


  it("toggleEditType is called when mat-card-title is clicked", () => {
    component.inEdit = false;
    fixture.detectChanges();
    let mat_card_title = fixture.debugElement.query(By.css('#mat-card-title-timeline'));
    let toggle_spy = spyOn(component, 'toggleEditType').and.returnValue(null);
    mat_card_title.triggerEventHandler('click', {});
    expect(toggle_spy).toHaveBeenCalled();
  });


  it("mat-card-title's innerText should be events event type name", () => {
    component.inEdit = false;
    fixture.detectChanges();
    let mat_card_title = fixture.debugElement.query(By.css('#mat-card-title-timeline'));
    let name = component.event.eventType.name;
    expect(mat_card_title.properties.innerText.trim()).toEqual(name);
  });


  it("span for event type NOT NULL if inEdit AND editingType are TRUE, else it is NULL.", () => {
    component.inEdit = true;
    component.editingType = true;
    fixture.detectChanges();
    let span_form_field = fixture.debugElement.query(By.css('#span-mat-form-field-1'));
    expect(span_form_field).not.toBeNull();

    component.editingType = false;
    fixture.detectChanges();
    span_form_field = fixture.debugElement.query(By.css('#span-mat-form-field-1'));
    expect(span_form_field).toBeNull();
  });


  it("span's mat-label for event types innerText to be set to event types name if an eventType exists", () => {
    component.inEdit = true;
    component.editingType = true;
    fixture.detectChanges();

    let label1 = fixture.debugElement.query(By.css('#span-mat-form-field-1'));
    let label2 = fixture.debugElement.query(By.css('#span-mat-form-field-2'));
    expect(label1).not.toBeNull();
    expect(label2).toBeNull();
    expect(label1.properties.innerText.trim()).toContain(component.event.eventType.name);
  });


  it("span's span-mat-form-field-label for event types innerText to be set to 'No Event Type Assigned' when eventTypes dont exist", () => {
    component.inEdit = true;
    component.editingType = true;

    component.event.eventType = null;
    fixture.detectChanges();

    let label1 = fixture.debugElement.query(By.css('#span-mat-form-field-label-1'));
    let label2 = fixture.debugElement.query(By.css('#span-mat-form-field-label-2'));
    expect(label1).toBeNull();
    expect(label2).not.toBeNull();
    expect(label2.properties.innerText.trim()).toContain("No Event Type Assigned");
  });


  it("span for startDatetime NOT NULL if inEdit AND editingStartDatetime are TRUE, else it is NULL", () => {
    component.inEdit = true;
    component.editingStartDatetime = true;
    fixture.detectChanges();
    let span_form_field = fixture.debugElement.query(By.css('#span-mat-form-field-2'));
    expect(span_form_field).not.toBeNull();

    component.editingStartDatetime = false;
    fixture.detectChanges();
    span_form_field = fixture.debugElement.query(By.css('#span-mat-form-field-2'));
    expect(span_form_field).toBeNull();
  });


  it("span for endDatetime NOT NULL if inEdit AND editingEndDatetime are TRUE, else it is NULL", () => {
    component.inEdit = true;
    component.editingEndDatetime = true;
    fixture.detectChanges();
    let span_form_field = fixture.debugElement.query(By.css('#span-mat-form-field-3'));
    expect(span_form_field).not.toBeNull();

    component.editingEndDatetime = false;
    fixture.detectChanges();
    span_form_field = fixture.debugElement.query(By.css('#span-mat-form-field-3'));
    expect(span_form_field).toBeNull();
  });


  it("span for metadata should iterate though all events metadata", () => {
    let span_mat_card_content1 = fixture.debugElement.queryAll(By.css('#span-mat-card-content-1')) // prioritized metadata
    let span_mat_card_content2 = fixture.debugElement.queryAll(By.css('#span-mat-card-content-2')) // rest of the metadata
    let meta_list = Object.keys(component.event.metadata);
    let meta_length = meta_list.length;

    expect(span_mat_card_content1.length + span_mat_card_content2.length).toEqual(meta_length);
  });


  it("span for metadata NOT NULL if inEdit AND editingMetadata[key] are TRUE, else it is NULL.", () => {
    let index = 0;
    let keys = Object.keys(component.event.metadata);
    let key = keys[index];

    component.inEdit = true;
    keys.forEach(k => { component.editingMetadata[k] = true});
    fixture.detectChanges();


    let span_form_field = fixture.debugElement.queryAll(By.css('#span-mat-form-field-4'));
    expect(span_form_field[index]).not.toBeNull();

    component.inEdit = false;
    fixture.detectChanges();

    span_form_field = fixture.debugElement.queryAll(By.css('#span-mat-form-field-4'));
    expect(span_form_field).toEqual([]);
  });


  it("span for metadata text NOT NULL if inEdit OR editingMetadata[key] are FALSE, else it is NULL", () => {
    let index = 0;
    let keys = Object.keys(component.event.metadata);
    let key = keys[index];

    component.inEdit = false;
    component.editingMetadata[key] = true;
    fixture.detectChanges();

    let span_meta_text = fixture.debugElement.queryAll(By.css('#span-meta-text'));
    expect(span_meta_text[index]).not.toBeNull();

    component.inEdit = true;
    component.editingMetadata[key] = false;
    fixture.detectChanges();

    span_meta_text = fixture.debugElement.queryAll(By.css('#span-meta-text'));
    expect(span_meta_text[index]).not.toBeNull();

    component.inEdit = true;
    component.editingMetadata[key] = true;
    keys.forEach(k => { component.editingMetadata[k] = true});
    fixture.detectChanges();

    span_meta_text = fixture.debugElement.queryAll(By.css('#span-meta-text'));
    expect(span_meta_text).toEqual([]);
  });


  it("expect when a span for meta text exists hits innerText is the meta's key and value", ()=> {
    let index = 0;
    let keys = Object.keys(component.event.metadata);
    let key = keys[index];
    let innert_text_result = key + ": " + component.event.metadata[key];

    component.inEdit = false;
    component.editingMetadata[key] = true;
    fixture.detectChanges();

    let span_meta_text = fixture.debugElement.queryAll(By.css('#span-meta-text'));
    expect(span_meta_text[index]).not.toBeNull();
    expect(span_meta_text[index].properties.innerText.trim()).toEqual(innert_text_result);
  });


  it("span for mat-card-subtitle NOT NULL if inEdit OR editingStartDatetime are FALSE, else it is NULL", () => {
    component.inEdit = true;
    component.editingStartDatetime = false;
    fixture.detectChanges();
    let span_form_field = fixture.debugElement.query(By.css('#span-mat-card-subtitle-1'));
    expect(span_form_field).not.toBeNull();

    component.inEdit = false;
    component.editingStartDatetime = true;
    fixture.detectChanges();
    span_form_field = fixture.debugElement.query(By.css('#span-mat-card-subtitle-1'));
    expect(span_form_field).not.toBeNull();

    component.editingType = true;
    component.editingStartDatetime = true;
    fixture.detectChanges();
    span_form_field = fixture.debugElement.query(By.css('#span-mat-form-field-1'));
    expect(span_form_field).toBeNull();
  });


  it("mat-card-subtitle NOT NULL if event url exists, else NULL", () => {
    component.event.url = "event/url";

    fixture.detectChanges();
    let mat_card_subtitle = fixture.debugElement.query(By.css('mat-card-subtitle'));
    expect(mat_card_subtitle).not.toBeNull();

    component.event.url = "";
    fixture.detectChanges();
    mat_card_subtitle = fixture.debugElement.query(By.css('mat-card-subtitle'));
    expect(mat_card_subtitle).toBeNull();
  });


  it("mat-select options will populate to each event type emitted by eventTypesObservable and " +
    "sets icon property to current event types pointstyle icon and sets style property to pointstyle marker_color when " +
    "inEdit and editingType are both TRUE.", () => {
    let toggle_spy = spyOn(component, 'toggleEditType').and.returnValue(null);
    component.inEdit = true;
    component.editingType = true;

    let event_types = [
      <EventType>{name: 'type1', pointStyle: {icon: 'circle', marker_color:'blue'}},
      <EventType>{name:'type2', pointStyle: {icon: 'circle', marker_color:'blue'}},
    ];
    component['_eventTypeService']['event_types_subject'].next(event_types);
    fixture.detectChanges();


    let mat_select = fixture.debugElement.query(By.css('#mat-select-event-types'));
    let options = mat_select.children;

    expect(options.length).toEqual(event_types.length);
    for(let i = 0; i< options.length; i++){
      expect(options[i].children[0].properties.icon).toEqual(event_types[i].pointStyle.icon);
      expect(options[i].children[0].styles.color).toEqual(event_types[i].pointStyle.marker_color);
      expect(options[i].properties.innerText.trim()).toEqual(event_types[i].name);
    }
  });


  it("div div-event-type-end-date-2 end event should NOT BE NULL when an event's eventtype has a duration, else NULL", () => {
    component.event.eventType.hasDuration = true;
    fixture.detectChanges();

    let div = fixture.debugElement.query(By.css('#div-event-type-end-date-1'));
    expect(div).not.toBeNull();

    component.event.eventType.hasDuration = false;
    fixture.detectChanges();

    div = fixture.debugElement.query(By.css('#div-event-type-end-date-1'));
    expect(div).toBeNull();
  });


  it("div div-event-type-end-date-2 should NOT BE NULL when event's endDatetime exists, else NULL ", () => {
    let div = fixture.debugElement.query(By.css('#div-event-type-end-date-2'));
    expect(div).not.toBeNull();

    component.event.endDatetime = null;
    fixture.detectChanges();
    div = fixture.debugElement.query(By.css('#div-event-type-end-date-2'));
    expect(div).toBeNull();
  });


  it("span span-end-date should NOT BE NULL if inEdit OR editingEndDatetime is false, else NULL", () => {
    component.inEdit = false;
    component.editingEndDatetime = true;

    fixture.detectChanges();
    let span = fixture.debugElement.query(By.css('#span-end-date'));

    expect(span).not.toBeNull();

    component.inEdit = true;
    component.editingEndDatetime = false;

    fixture.detectChanges();
    span = fixture.debugElement.query(By.css('#span-end-date'));

    expect(span).not.toBeNull();

    component.inEdit = true;
    component.editingEndDatetime = true;

    fixture.detectChanges();
    span = fixture.debugElement.query(By.css('#span-end-date'));

    expect(span).toBeNull();
  });


  it("span span-end-date Duration should be formated in hh:mm:ss", () => {
    component.inEdit = false;

    let get_event_duration = spyOn(component, 'getEventDuration').and.returnValue(60000);
    fixture.detectChanges();

    let span = fixture.debugElement.query(By.css('#span-end-date'));
    expect(span.properties.innerText.trim()).toEqual("Duration: 00:01:00");
    expect(get_event_duration).toHaveBeenCalled();
  });


  it("when button button-mat-form-field-done is clicked toggleEditEndDatetime is called", () => {
    component.inEdit = true;
    component.editingEndDatetime = true;

    fixture.detectChanges();

    let button = fixture.debugElement.query(By.css('#button-mat-form-field-done'));
    let toggle_spy = spyOn(component, 'toggleEditEndDatetime').and.returnValue(null);
    button.triggerEventHandler('click', {});

    fixture.detectChanges();
    expect(toggle_spy).toHaveBeenCalled();
  });


  it("when button-mat-icon-done is clicked toggleEditMetadata gets called", () => {
    component.inEdit = true;
    component.editingMetadata['meta1'] = true;

    fixture.detectChanges();

    let button = fixture.debugElement.query(By.css('#button-mat-icon-done'));
    let toggle_spy = spyOn(component, 'toggleEditMetadata').and.returnValue(null);
    let meta_key = 'meta1';
    button.triggerEventHandler('click', meta_key);

    fixture.detectChanges();
    expect(toggle_spy).toHaveBeenCalledWith(meta_key);
  });


  it("when button-mat-icon-delete is clicked removeMetadata is called", () => {
    component.inEdit = true;
    component.editingMetadata['meta1'] = true;

    fixture.detectChanges();

    let button = fixture.debugElement.query(By.css('#button-mat-icon-delete'));
    let toggle_spy = spyOn(component, 'removeMetadata').and.returnValue(null);
    let meta_key = 'meta1';
    button.triggerEventHandler('click', meta_key);

    fixture.detectChanges();
    expect(toggle_spy).toHaveBeenCalledWith(meta_key);
  });


  it("expect br br-pose-edit NOT NULL when editingPose is TRUE, else NULL", () => {
    component.editingPose = true;
    fixture.detectChanges();

    let br = fixture.debugElement.query(By.css('#br-pose-edit'));
    expect(br).not.toBeNull();

    component.editingPose = false;
    fixture.detectChanges();

    br = fixture.debugElement.query(By.css('#br-pose-edit'));
    expect(br).toBeNull();
  });


  it("expect mole-maps mole-maps-pose NOT NULL when editingPose is TRUE, else NULL", () => {
    component.editingPose = true;
    fixture.detectChanges();

    let mole_map = fixture.debugElement.query(By.css('#mole-maps-pose'));
    expect(mole_map).not.toBeNull();

    component.editingPose = false;
    fixture.detectChanges();

    mole_map = fixture.debugElement.query(By.css('#mole-maps-pose'));
    expect(mole_map).toBeNull();
  });


  it("button button-mat-icon-button-notes NOT NULL when notesOption is TRUE, else NULL", () => {
    component.notesOption = true;
    fixture.detectChanges();

    let button = fixture.debugElement.query(By.css('#button-mat-icon-button-notes'));
    expect(button).not.toBeNull();

    component.notesOption = false;
    fixture.detectChanges();

    button = fixture.debugElement.query(By.css('#button-mat-icon-button-notes'));
    expect(button).toBeNull();
  });


  it("expect openNotesDialog to run when button button-mat-icon-button-notes is clicked", () => {
    component.notesOption = true;
    let open_notes_dialog_spy = spyOn(component, 'openNotesDialog').and.returnValue(null);
    fixture.detectChanges();

    let button = fixture.debugElement.query(By.css('#button-mat-icon-button-notes'));
    button.triggerEventHandler('click', {});
    fixture.detectChanges();

    expect(open_notes_dialog_spy).toHaveBeenCalled();
  });


  it("button button-mat-icon-button-images NOT NULL when imagesOption is TRUE, else NULL", () => {
    component.imagesOption = true;
    fixture.detectChanges();

    let button = fixture.debugElement.query(By.css('#button-mat-icon-button-images'));
    expect(button).not.toBeNull();

    component.imagesOption = false;
    fixture.detectChanges();

    button = fixture.debugElement.query(By.css('#button-mat-icon-button-images'));
    expect(button).toBeNull();
  });


  it("expect openImagesDialog to run when button button-mat-icon-button-images is clicked", () => {
    component.imagesOption = true;
    let open_images_dialog_spy = spyOn(component, 'openImagesDialog').and.returnValue(null);
    fixture.detectChanges();

    let button = fixture.debugElement.query(By.css('#button-mat-icon-button-images'));
    button.triggerEventHandler('click', {});

    fixture.detectChanges();
    expect(open_images_dialog_spy).toHaveBeenCalled();
  });


  it("button button-mat-icon-button-map NOT NULL when mapOption is TRUE, else NULL", () => {
    component.mapOption = true;
    fixture.detectChanges();

    let button = fixture.debugElement.query(By.css('#button-mat-icon-button-map'));
    expect(button).not.toBeNull();

    component.mapOption = false;
    fixture.detectChanges();

    button = fixture.debugElement.query(By.css('#button-mat-icon-button-map'));
    expect(button).toBeNull();
  });


  it("expect toggleEditPose to run when button button-mat-icon-button-map is clicked", () => {
    component.mapOption = true;
    let toggle_edit_pose_spy = spyOn(component, 'toggleEditPose').and.returnValue(null);
    fixture.detectChanges();

    let button = fixture.debugElement.query(By.css('#button-mat-icon-button-map'));
    button.triggerEventHandler('click', {});
    fixture.detectChanges();

    expect(toggle_edit_pose_spy).toHaveBeenCalled();
  });


  it("button button-mat-icon-button-dialog NOT NULL when dialogOption is TRUE, else NULL", () => {
    component.dialogOption = true;
    fixture.detectChanges();

    let button = fixture.debugElement.query(By.css('#button-mat-icon-button-dialog'));
    expect(button).not.toBeNull();

    component.dialogOption = false;
    fixture.detectChanges();

    button = fixture.debugElement.query(By.css('#button-mat-icon-button-dialog'));
    expect(button).toBeNull();
  });


  it("expect openEventDialog to run when button button-mat-icon-button-dialog is clicked", () => {
    component.dialogOption = true;
    let open_event_dialog_spy = spyOn(component, 'openEventDialog').and.returnValue(null);
    fixture.detectChanges();

    let button = fixture.debugElement.query(By.css('#button-mat-icon-button-dialog'));
    button.triggerEventHandler('click', <Event>{});

    fixture.detectChanges();
    expect(open_event_dialog_spy).toHaveBeenCalledWith(component.event);
  });


  it("button button-mat-icon-button-api NOT NULL when apiOption is TRUE AND an event url exists, else NULL", () => {
    component.apiOption = true;
    component.event.url = 'event/url';
    fixture.detectChanges();

    let button = fixture.debugElement.query(By.css('#button-mat-icon-button-api'));
    expect(button).not.toBeNull();

    component.apiOption = false;
    fixture.detectChanges();

    button = fixture.debugElement.query(By.css('#button-mat-icon-button-api'));
    expect(button).toBeNull();
  });


  it("expect openApi to run when button button-mat-icon-button-api is clicked", () => {
    component.apiOption = true;
    component.event.url = 'event/url';
    let open_api_spy = spyOn(component, 'openApi').and.returnValue(null);
    fixture.detectChanges();

    let button = fixture.debugElement.query(By.css('#button-mat-icon-button-api'));
    button.triggerEventHandler('click', <Event>{});
    fixture.detectChanges();

    expect(open_api_spy).toHaveBeenCalledWith(component.event);
  });


  it("mat-icons for button button-mat-icon-button-map will have location_on or location_off as " +
    "its innerText if event startPose exists or not respectively", () => {
    component.mapOption = true;
    let pose_exist_text = "location_on";
    let pose_not_exist_text = "location_off";
    fixture.detectChanges();

    let button = fixture.debugElement.query(By.css('#button-mat-icon-button-map'));
    let icon = button.query(By.css('mat-icon'));
    expect(icon.properties.innerText.trim()).toEqual(pose_exist_text);

    component.event.startPose = null;
    fixture.detectChanges();

    button = fixture.debugElement.query(By.css('#button-mat-icon-button-map'));
    icon = button.query(By.css('mat-icon'));
    expect(icon.properties.innerText.trim()).toEqual(pose_not_exist_text);
  });

});
