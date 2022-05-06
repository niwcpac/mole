import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EventFilterFormComponent} from './event-filter-form.component';
import {EventApiService, EventTypeApiService} from "../../../services";
import {FormBuilder} from "@angular/forms";
import {BehaviorSubject, Observable} from "rxjs";
import {EventFilter, EventType} from "../../../models";
import {IncludesSubstrPipe} from "../../../pipes";
import {OrderByPipe} from "ngx-pipes";
import {By} from "@angular/platform-browser";

class MockEventApiService{
  private events_filter_subject: BehaviorSubject<EventFilter>;
  private event_filter: EventFilter = {
    level: 1,
    types: [<EventType>{}, <EventType>{}],
    metadata: ['meta1', 'meta2'],
    hasPose: true
  };

  constructor() {
    this.events_filter_subject = new BehaviorSubject<EventFilter>(this.event_filter);
  }

  getCurrentFilter(){
    return this.event_filter;
  }

  filterChangedNotification(): Observable<EventFilter> {
    return this.events_filter_subject.asObservable();
  }

  setPagedFilter(options_value){
    return null;
  }
}

class MockEventTypeApiService{
  getEventTypes(){
    return null;
  }
}

class MockEventFilterForm extends EventFilterFormComponent{
  ngOnInit() {
    super.ngOnInit();
  }
}

describe('EventFilterFormComponent', () => {
  let component: EventFilterFormComponent;
  let fixture: ComponentFixture<EventFilterFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MockEventFilterForm, IncludesSubstrPipe, OrderByPipe ]
    }).overrideComponent(MockEventFilterForm, {
      set:{
        providers: [
          {provide: EventApiService, useFactory: () => new MockEventApiService()},
          {provide: EventTypeApiService, useFactory: () => new MockEventTypeApiService()},
          {provide: FormBuilder}
        ],
      }
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MockEventFilterForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });


  it('onTypesChange() >> calls setPageFilter for formGroup', () => {
    let set_page_filter_spy = spyOn(component['_eventApiService'], 'setPagedFilter').and.callThrough();
    component.onTypesChange();
    expect(set_page_filter_spy).toHaveBeenCalledWith(component.options.value);
  });


  it('updateFilter() >> calls setPageFilter for current Event Filter', () => {
    let set_page_filter_spy = spyOn(component['_eventApiService'], 'setPagedFilter').and.callThrough();
    component.updateFilter();
    expect(set_page_filter_spy).toHaveBeenCalledWith(component.filter);
  });


  it('addMetadata(metadata: string) >> ', () => {
    let update_filter_spy = spyOn(component, 'updateFilter').and.returnValue(null);
    let new_meta = 'new metadata';

    component.addMetadata(new_meta);
    expect(component.filter.metadata).toContain(new_meta);
    expect(component.options.get('metadata').value).toEqual('');
    expect(update_filter_spy).toHaveBeenCalled();
  });


  it('mat-form-field for event type filters should NOT BE NULL when useTypesField is true', () => {
    let mat_form_field_event_type = fixture.debugElement.query(By.css('mat-form-field#form-field-event-type-filter'));
    expect(mat_form_field_event_type).not.toBeNull();
  });


  it('mat-form-field for event type filters should BE NULL when useTypesField is false', () => {
    component.useTypesField = false;
    fixture.detectChanges();
    let mat_form_field_event_type = fixture.debugElement.query(By.css('mat-form-field#form-field-event-type-filter'));
    expect(mat_form_field_event_type).toBeNull();
  });


  it('expect onTypesChange to be called when a selectionChange event triggers', () => {
    let event_element = fixture.debugElement.query(By.css('mat-select#select1-event-type-filter'));
    let on_types_change_spy = spyOn(component, 'onTypesChange').and.returnValue(null);
    event_element.triggerEventHandler('selectionChange', {});
    expect(on_types_change_spy).toHaveBeenCalled();
  });


  it('will populate mat-select element with each EventTypes pointstyle icons, color, and name', () => {
    let event_types = <EventType[]>[
      <EventType>{name: 'eventtype 1', pointStyle: {icon: 'et1 icon', marker_color: 'green'}},
      <EventType>{name: 'eventtype 2', pointStyle: {icon: 'et2 icon', marker_color: 'yellow'}}
      ];
    let event_types_obs = new BehaviorSubject<EventType[]>(event_types);
    component.eventTypesObservable = event_types_obs.asObservable();

    fixture.detectChanges();
    let mat_options = fixture.debugElement.queryAll(By.css('mat-option'));

    expect(mat_options.length).toEqual(event_types.length);

    for(let i=0; i<event_types.length; i++)
    {
      expect(mat_options[i].children[0].properties.icon).toEqual(event_types[i].pointStyle.icon);
      expect(mat_options[i].children[0].attributes.style).toEqual('color: ' + event_types[i].pointStyle.marker_color + ';');
      expect(mat_options[i].properties.innerText.trim()).toEqual(event_types[i].name);
    }
  });


  it('mat-form-field for metadata filters should NOT BE NULL when useMetaField is true', () => {
    let mat_form_field_metadata_filters = fixture.debugElement.query(By.css('mat-form-field#form-field-metadata-filter'));
    expect(mat_form_field_metadata_filters).not.toBeNull();
  });


  it('mat-form-field for metadata filters should BE NULL when useMetaField is false', () => {
    component.useMetaField = false;
    fixture.detectChanges();
    let mat_form_field_metadata_filters = fixture.debugElement.query(By.css('mat-form-field#form-field-metadata-filter'));
    expect(mat_form_field_metadata_filters).toBeNull();
  });


  it("expect addMetadata to be called with current Input element's metadata filter value when form field metadata button is clicked", () => {
    let input_elm_metafilter = fixture.debugElement.query(By.css('input#input-metadata-filter')).references.metadataFilter;
    let input_elm_meta_filter_name = "bacon";
    let add_metadata_spy = spyOn(component, 'addMetadata').and.returnValue(null);

    input_elm_metafilter.value = input_elm_meta_filter_name;
    fixture.detectChanges();

    let meta_button = fixture.debugElement.query(By.css('button#button1-metadata-filter'));
    meta_button.triggerEventHandler('click', input_elm_metafilter);
    fixture.detectChanges();

    expect(add_metadata_spy).toHaveBeenCalledWith(input_elm_meta_filter_name);
  });


  it('mat-form-field for event level filters should NOT BE NULL when useLevelField is true', () => {
    let form_field_event_level_filter = fixture.debugElement.query(By.css('mat-form-field#form-field-event-level-filter'));
    expect(form_field_event_level_filter).not.toBeNull();
  });


  it('mat-form-field for event level filters should BE NULL when useLevelField is false', () => {
    component.useLevelField = false;
    fixture.detectChanges();
    let form_field_event_level_filter = fixture.debugElement.query(By.css('mat-form-field#form-field-event-level-filter'));
    expect(form_field_event_level_filter).toBeNull();
  });


  it('mat-checkbox for event level filters should NOT BE NULL when usePoseField is true', () => {
    let checkbox_event_level_filter = fixture.debugElement.query(By.css('mat-checkbox#checkbox1-event-level-filter'));
    expect(checkbox_event_level_filter).not.toBeNull();
  });


  it('mat-checkbox for event level filters should BE NULL when usePoseField is false', () => {
    component.usePoseField = false;
    fixture.detectChanges();
    let checkbox_event_level_filter = fixture.debugElement.query(By.css('mat-checkbox#checkbox1-event-level-filter'));
    expect(checkbox_event_level_filter).toBeNull();
  });

});
