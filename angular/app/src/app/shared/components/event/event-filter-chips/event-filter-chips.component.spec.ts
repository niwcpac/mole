import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EventFilterChipsComponent } from './event-filter-chips.component';
import {EventFilter, EventType} from "../../../models";
import {BehaviorSubject, Observable} from "rxjs";
import {EventApiService} from "../../../services";
import Spy = jasmine.Spy;
import {By} from "@angular/platform-browser";

export class MockEventApiService {

  private eventsFilterSubject: BehaviorSubject<EventFilter>;

  constructor(){
    let event_filter: EventFilter = {
      level: 1,
      types: [<EventType>{name: 'event type 1'}, <EventType>{name: 'event type 2'}],
      metadata: ['meta1', 'meta2'],
      hasPose: true
    };
    this.eventsFilterSubject = new BehaviorSubject<EventFilter>(event_filter);
  }

  updateFilter(types: any[], meta: any[], level: number, hasPose: boolean){
    return null;
  }

  filterChangedNotification(): Observable<EventFilter>{
    return this.eventsFilterSubject.asObservable();
  }

}

/*
* Mock the Component for isolation testing since components ngOnInit calls one of the components functions
* */
export class MockEventFilterChips extends EventFilterChipsComponent{

  private create_chips_spy: Spy;

  ngOnInit() {
    this.create_chips_spy = spyOn<any>(this, 'createChips').and.returnValue(null);
    super.ngOnInit();
  }

}

describe('EventFilterChipsComponent', () => {
  let component: EventFilterChipsComponent;
  let fixture: ComponentFixture<EventFilterChipsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MockEventFilterChips ]
    }).overrideComponent(MockEventFilterChips,{
      set: {
        providers: [
          {provide: EventApiService, useFactory: () => new MockEventApiService() },
        ]
      }
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MockEventFilterChips);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });


  it('createChips() >> creates event type, meta, level, and pose chips and stores them in filterChips', () => {
    component['create_chips_spy'].and.callThrough();
    component.createChips();
    let event_chips = [
      {type: 'event_type', value: <EventType>{name: 'event type 1'}},
      {type: 'event_type', value: <EventType>{name: 'event type 2'}}
      ];
    let meta_chips = [{type: 'meta', value: 'meta1'}, {type: 'meta', value: 'meta2'}];
    let level_chip = {type: 'level', value: 1};
    let pose_chip = {type: 'pose', value: true};
    expect(component.filterChips).toContain(level_chip);
    expect(component.filterChips).toContain(pose_chip);
    for(let i=0; i< meta_chips.length; i++) {
      expect(component.filterChips).toContain(meta_chips[i]);
    }
    for(let j=0; j<event_chips.length; j++) {
      expect(component.filterChips).toContain(event_chips[1]);
    }
  });


  it(' removeFilter({type, value}) >> will remove specific filter from respective filterType array if specified filter exists', () => {
    let update_filter_spy = spyOn(component['eventService'], 'updateFilter').and.returnValue(null);
    let event_types = [<EventType>{name: 'event type 1'}, <EventType>{name: 'event type 2'}];

    component.removeFilter({type: 'level', value: 1});
    expect(component['filterLevel']).toBeNull();

    component.removeFilter({type: 'event_type', value: <EventType>{name:'event type 3'}});
    expect(component['filterTypes']).toEqual(event_types);
  });


  it('removeAll() >> will call updateFilter which will reset all event-filters', () => {
    let update_filter_spy = spyOn(component['eventService'], 'updateFilter').and.returnValue(null);
    component.removeAll();
    expect(update_filter_spy).toHaveBeenCalledWith([],[],0,false);
  });


  it('filterUpdate() >> will call updateFilter with each of the filters passed as params', () => {
    let update_filter_spy = spyOn(component['eventService'], 'updateFilter').and.returnValue(null);
    component.filterUpdate();
    expect(update_filter_spy).toHaveBeenCalledWith(component['filterTypes'], component['filterMeta'], component['filterLevel'], component['filterPose']);
  });


  it('mat-card element will NOT BE NULL when filter chips exist in filterChips', () => {
    component.filterChips.push({type: 'event_type', value: component['filterTypes'][0]});
    fixture.detectChanges();
    let mat_card = fixture.debugElement.query(By.css('mat-card'));
    expect(mat_card).not.toBeNull();
  });


  it('mat-card element will BE NULL when filter chips DONT exist in filterChips', () => {
    let mat_card = fixture.debugElement.query(By.css('mat-card'));
    expect(mat_card).toBeNull();
  });


  it('expect removeAll to be called when clear button is clicked', () => {
    component.filterChips.push({type: 'event_type', value: component['filterTypes'][0]});
    fixture.detectChanges();

    let button = fixture.debugElement.query(By.css('button#button1-clear-filter'));
    let remove_all_spy = spyOn(component, 'removeAll').and.returnValue(null);

    button.triggerEventHandler('click', {});
    fixture.detectChanges();
    expect(remove_all_spy).toHaveBeenCalled();
  });


  it("a filter chip should be created for each chip in filterChips and each filter chip's type and value properties will be set", () => {
    let event_chips = [
      {type: 'event_type', value: <EventType>{name: 'event type 1'}},
      {type: 'event_type', value: <EventType>{name: 'event type 2'}}
    ];

    component.filterChips.push(event_chips[0]);
    component.filterChips.push(event_chips[1]);
    fixture.detectChanges();

    let filter_chips = fixture.debugElement.queryAll(By.css('mole-event-filter-chip'));

    expect(filter_chips.length).toEqual(component.filterChips.length);

    for(let i = 0; i< filter_chips.length; i++){
      expect(filter_chips[i].properties.type).toEqual(event_chips[i].type);
      expect(filter_chips[i].properties.value).toEqual(event_chips[i].value);
    }
  });

});
