import {async, ComponentFixture, fakeAsync, TestBed} from '@angular/core/testing';
import {Event, EventType, MapFocus, Marker, PointStyle, Pose, Trial} from '../../models';
import {EventApiService, MapMarkerService, TrialApiService} from '../../services'
import {MapsComponent, MapSettings} from './maps.component';
import { By } from '@angular/platform-browser';
import {MatDialog} from "@angular/material/dialog";
import {CookieService} from "ngx-cookie-service";
import {BehaviorSubject, Subject} from "rxjs";
import Spy = jasmine.Spy;
import {EventDialogComponent} from "..";
import {map} from "rxjs/operators";

class MockMarkerService{

  stylesSubject: BehaviorSubject<any>; //styleAdapter
  filteredMarkersSubject: BehaviorSubject<Marker[]>;
  entitiesSubject: BehaviorSubject<Marker[]>;
  imageUrlSubject: BehaviorSubject<String[]>;
  poseSubject: BehaviorSubject<any>;
  defaultEntityName = "default entity name";
  defaultPoseSourceId = "12";
  mock_marker;

  trial_styles = [
    {style:{name: 'empty style 1'}, name: 'Test Floor 1'},
    {style:{name: 'empty style 2'}, name: 'Test Floor 2'}
  ];

  markers = [
    <Marker>{eventId: 1, pose: <Pose>{elevation: 130}},
    <Marker>{eventId: 2, pose: <Pose>{elevation: 256}},
    <Marker>{eventId: 3, pose: <Pose>{elevation: 420}}
  ];

  images = [
    "image1", "image2", "image3"
  ]

  getTrialStyles(){
    this.stylesSubject = new BehaviorSubject<any>(this.trial_styles);
    return this.stylesSubject.asObservable();
  }

  getFilteredMarkers(){
    this.filteredMarkersSubject = new BehaviorSubject(this.markers);
    return this.filteredMarkersSubject.asObservable();
  }

  getEntities(){
    this.entitiesSubject = new BehaviorSubject<Marker[]>(this.markers);
    return this.entitiesSubject.asObservable();
  }

  getImages(){
    this.imageUrlSubject = new BehaviorSubject<String[]>(this.images);
    return this.imageUrlSubject.asObservable();
  }

  createPose(payload: Pose){
    payload['url'] = 'mock/pose/url';
    payload['point'] = { coordinates: payload.coordinates };
    this.poseSubject = new BehaviorSubject<any>(payload);
    return this.poseSubject.asObservable();
  }

  markerAdapter(event: Event, layer: string = "marker"){
    return this.mock_marker;
  }

  elevationDeterminator(mapName: string){
    return 0;
  }
}

class MockEventApiService{

  eventsPoseSubject: Subject<Event[]>;
  selectedEventSubject: BehaviorSubject<number>;
  eventId = 1;

  getSelectedEvent(){
    this.selectedEventSubject = new BehaviorSubject<number>(this.eventId);
    return this.selectedEventSubject.asObservable();
  }

  setSelectedEvent(){
    return null;
  }

  updateEventPose(){
    return null;
  }

  getEventObject(){
    return null;
  }

  getPoseEvents(){
    return this.eventsPoseSubject.asObservable();
  }

  setLiveEventTracking(isLive: boolean) {
    return isLive;
  }
}

class MockTrialApiService{

  selectedTrialSub:Subject<Trial>;

  constructor() {
    this.selectedTrialSub = new Subject<Trial>();
  }  

  getSelectedTrial(){
    return this.selectedTrialSub.asObservable();
  }

  setSelectedTrial(trial: Trial){
    return null;
  }
}

class MockMatDialog{
  open(){
    return null;
  }
}

class MockMaps extends MapsComponent{

  ngOnInit() {
    super.ngOnInit();
  }

}


describe('MapsComponent', () => {
  let component: MapsComponent;
  let fixture: ComponentFixture<MapsComponent>;
  let set_map_focus_spy: Spy;
  let set_timeout_spy: Spy;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MockMaps ]
    }).overrideComponent(MockMaps, {
      set: {
        providers: [
          {provide: MapMarkerService, useFactory: () => new MockMarkerService()},
          {provide: EventApiService, useFactory: () => new MockEventApiService()},
          {provide: TrialApiService, useFactory: () => new MockTrialApiService()},
          {provide: MatDialog, useFactory: () => new MockMatDialog()},
          {provide: CookieService}
        ]
      }
    }).compileComponents();
  }));

  beforeEach(() => {
    set_map_focus_spy = spyOn(MapsComponent.prototype, 'setMapFocus').and.returnValue(null)
    set_timeout_spy = spyOn<any>(window, 'setTimeout').and.returnValue(null);

    fixture = TestBed.createComponent(MockMaps);
    component = fixture.debugElement.componentInstance;

    component.event = <Event>{
      startPose: {coordinates: [123,234], heading: 50},
      pointStyle: {icon: 'circle', marker_color: 'green'},
      id: 1,
      metadata: { popup: 'test'},
      eventType: <EventType>{name: 'event type 1'}
    };

    component['_mapMarkerService']['mock_marker'] = {
      coordinates: [123,234],
      height: 5,
      heading: 50,
      pointStyle: {icon: 'circle', marker_color: 'green'},
      eventId: 1,
      metadata: { popup: 'test'},
      layer: "event",
      eventType: <EventType>{name: 'event type 1'}
    }

    fixture.detectChanges();
  });

  afterEach(() => {
    // Hack so if you are viewing through the test page the map is visibile
    // Map visibility is one of the tricky things for mapbox
    let mapDivs = fixture.debugElement.queryAll(By.css('.mapboxgl-map'));
    for(let mapDiv of mapDivs) {
      mapDiv.styles.height="20vh";
    }
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });


  it("ngOnInit >> if an event is present and has a startPose, create an event marker for event and create focus point for map." +
    "If event does not have a pose then flip createPose toggle.", () => {
    let event_with_startpose = component.event;
    let result_marker = component['_mapMarkerService']['mock_marker'];

    expect(set_map_focus_spy).toHaveBeenCalledWith(component.defaultStyle);
    expect(component.eventMarker).toEqual(result_marker);

    component['_mapMarkerService']['mock_marker'].eventId = null;
    let result_marker_default = <Marker>{
      eventId: -2,
      pointStyle: {
        url: null,
        name: null,
        description: null,
        render_as_symbol: null,
        use_marker_pin: null,
        scale_factor: null,
        animation: null,
        entity_types_styled: [],
        event_types_styled: [],
        marker_color: "orange",
        color: "white",
        icon: "question"
      }
    };
    component.ngOnInit();
    expect(component.eventMarker.pointStyle).toEqual(result_marker_default.pointStyle);
    expect(component.eventMarker.eventId).toEqual(-2);

    component.event.startPose = null;
    component.eventMarker = null;
    component.createPose = false;
    component.ngOnInit();
    expect(component.createPose).toBeTrue();
    expect(component.eventMarker).toBeNull();
  });


  it("setMapFocus(style: MapSettings) >> creates a map focus point based off event coordinates if event is present, " +
    "if not cookies will be checked for previous coordinates and make a map focus point from those." +
    "If no event and cookies found, a map focus point is created by passed style coordinates", () => {

    set_map_focus_spy.and.callThrough();
    let passed_style = <MapSettings>{lat: 80, lng: 145, zoom: 60};

    let cookie_get_spy = spyOn<any>(component['cookie'], 'get').and.returnValue(null);
    let cookie_check_spy = spyOn(component['cookie'], 'check').and.returnValue(false);
    component.event = <Event>{startPose: {coordinates: [102,234]}};
    let mock_focus = {
      center: [102,234],
      zoom: 60,
      pitch: 20,
      bearing: 0,
      mapFocus: ""
    }

    //If event is present
    component.setMapFocus(passed_style);
    expect(component.mapFocus).toEqual(mock_focus);

    //If data is stored in cookies
    cookie_get_spy.and.callFake(param => {
      if(param == "map_zoom"){
        return 100;
      }
      else if(param == "map_coordinate_lat"){
        return 53;
      }
      else if(param == "map_coordinate_lng"){
        return 54;
      }
    });

    cookie_check_spy.and.returnValue(true);

    component.event = null;

    mock_focus['zoom'] = 100;
    mock_focus['center'] = [54, 53];
    component.setMapFocus(passed_style);

    expect(component.mapFocus).toEqual(mock_focus);

    //Default Map Focus
    cookie_check_spy.and.returnValue(false);
    mock_focus['center'] = [passed_style.lng, passed_style.lat];
    mock_focus['zoom'] = 60;

    component.setMapFocus(passed_style);
    expect(component.mapFocus).toEqual(mock_focus);
  });


  it("filterMarkers(map: MapSettings, allMarkers: Marker[]) >> grab all markers whose height is between the mapSettings min and max elevation", () => {
    let map_settings = <MapSettings>{minElevation: 100, maxElevation: 300};
    let markers = [
      <Marker>{eventId: 1, pose: <Pose>{elevation: 130}},
      <Marker>{eventId: 2, pose: <Pose>{elevation: 256}},
      <Marker>{eventId: 3, pose: <Pose>{elevation: 420}}
      ];

    let result_markers = [markers[0], markers[1]];

    let filtered_markers = component.filterMarkers(map_settings, markers);
    expect(filtered_markers).toEqual(result_markers);

    //Filter only by markers above min elevation
    map_settings.maxElevation = null;
    filtered_markers = component.filterMarkers(map_settings, markers);
    expect(filtered_markers).toEqual(markers);

    //Filter only by markers below max elevation
    map_settings.maxElevation = 300;
    map_settings.minElevation = null;
    filtered_markers = component.filterMarkers(map_settings, markers);
    expect(filtered_markers).toEqual(result_markers);
  });


  it("mapSubscriptions() >> creates all subscriptions for mapMarkerService and eventApiService observables for images, entities, selectEvents, and filteredMarkers", () => {
    component.mapSubscriptions();
    expect(component.markers).toEqual(component['_mapMarkerService']['markers']);
    expect(component.entities).toEqual(component['_mapMarkerService']['markers']);
    expect(component.sourceImages).toEqual(component['_mapMarkerService']['images']);
    expect(component.focusedEventId).toEqual(component['_eventApiService']['eventId']);
  });


  it("mapFocusChange(focus:MapFocus) >> saves current map focus into cookie", () => {
    let mock_focus = <MapFocus>{
      center: [102,234],
      zoom: 60,
      mapStyle: 'map style 1',
      mapFocus: ""
    };

    component.mapFocusChange(mock_focus);
    expect(component['cookie'].get('map_coordinate_lng')).toEqual(String(102));
    expect(component['cookie'].get('map_coordinate_lat')).toEqual(String(234));
    expect(component['cookie'].get('map_zoom')).toEqual(String(60));
    expect(component['cookie'].get('map_name')).toEqual("map style 1");
    expect(component.mapFocus).toEqual(mock_focus);
  });


  it("mapFocusEvent(eventId:number) >> get passed in selected event id", () => {
    let set_selected_spy = spyOn(component['_eventApiService'], 'setSelectedEvent').and.returnValue(null);
    component.mapFocusEvent(3);
    expect(set_selected_spy).toHaveBeenCalledWith(3);
  });


  it("mapCreateEvent(eventJson) >> if pose updates are allowed and an event exists update its pose," +
    "if pose updates are allowed and there is no event but updateMarker is true, then update the passed eventJson pose," +
    "if pose updates are allowed and there is no event and updateMarker is false, then create event", () => {

    let mock_eventJson = {
      marker: { pose: {coordinates: [234,102], elevation: 0, heading: 0}, eventId: 13},
      mapName: 'map name 1',
      updateMarker: false
    };

    let mock_updated_pose = {
      "coordinates": [234,102],
      "elevation": 0,
      "heading": undefined,
      "entity": "/api/entities/default entity name/",
      "pose_source": "/api/pose_sources/12/",
      "url": 'mock/pose/url'
    };

    component.allowPoseUpdates = true;
    let mock_marker = <Marker>{eventId: 1, layer: 'event'};
    component['_mapMarkerService']['mock_marker'] = mock_marker;

    //When event is present
    component.event = <Event>{id: 1, startPose: null};
    let update_event_pose_spy = spyOn(component['_eventApiService'], 'updateEventPose').and.returnValue(null);
    component.mapCreateEvent(mock_eventJson);

    expect(update_event_pose_spy).toHaveBeenCalledWith(1, 'mock/pose/url');
    expect(component.event.startPose).toEqual(<any>mock_updated_pose);
    expect(component.eventMarker).toEqual(mock_marker);

    //When event exists with no ID
    let emit_spy = spyOn(component.outPose, 'emit').and.returnValue(null);
    component.event.id = null;
    component.mapCreateEvent(mock_eventJson);
    expect(emit_spy).toHaveBeenCalledWith(mock_updated_pose);

    //No Event present and updateMarker is true
    component.event = null;
    mock_eventJson.updateMarker = true;
    component.mapCreateEvent(mock_eventJson);
    expect(update_event_pose_spy).toHaveBeenCalledWith(13, 'mock/pose/url');

    //No Event present and updateMarker is false
    mock_eventJson.updateMarker = false;
    let mock_event = <Event>{id:13, url:'event/url'};
    let get_event_obj_spy = spyOn(component['_eventApiService'], 'getEventObject').and.returnValue(mock_event);
    let open_event_dialog_spy = spyOn(component, 'openEventDialog').and.returnValue(null);

    component.mapCreateEvent(mock_eventJson);
    expect(get_event_obj_spy).toHaveBeenCalledWith(undefined, mock_updated_pose);
    expect(open_event_dialog_spy).toHaveBeenCalledWith(mock_event)
  });


  it("openEventDialog(event) >> ", () => {
    let open_spy = spyOn(component['dialog'], 'open').and.returnValue(null);
    let event = <Event>{id:1};
    component.openEventDialog(event);
    expect(open_spy).toHaveBeenCalledWith(EventDialogComponent, { width: '33vw', data: event});
  });


  it("mole-map-instance NOT NULL when maps PRESENT, else NULL", () => {
    component.maps = [<MapSettings>{style: 'map style', name: 'map setting name'}];
    fixture.detectChanges();
    let map_instance = fixture.debugElement.query(By.css('mole-map-instance'));
    expect(map_instance).not.toBeNull();

    component.maps = null;
    fixture.detectChanges();
    map_instance = fixture.debugElement.query(By.css('mole-map-instance'));
    expect(map_instance).toBeNull();
  });


  it("mapFocusEvent is triggered when outMarkerClick event happens", () => {
    let map_focus_event_spy = spyOn(component, 'mapFocusEvent').and.returnValue(null);
    component.maps = [<MapSettings>{style: 'map style', name: 'map setting name'}];
    fixture.detectChanges();
    let map_instance = fixture.debugElement.query(By.css('mole-map-instance'));
    map_instance.triggerEventHandler('outMarkerClick', 4);
    expect(map_focus_event_spy).toHaveBeenCalledWith(4);
  });


  it("mapCreateEvent is triggered when outCreateMarker event happens", () => {
    let map_create_event_spy = spyOn(component, 'mapCreateEvent').and.returnValue(null);
    component.maps = [<MapSettings>{style: 'map style', name: 'map setting name'}];
    fixture.detectChanges();
    let map_instance = fixture.debugElement.query(By.css('mole-map-instance'));
    map_instance.triggerEventHandler('outCreateMarker', {});
    expect(map_create_event_spy).toHaveBeenCalledWith({});
  });


  it("mapFocusChange is triggered when outFocusChange event happens", () => {
    let map_focus_change_spy = spyOn(component, 'mapFocusChange').and.returnValue(null);
    component.maps = [<MapSettings>{style: 'map style', name: 'map setting name'}];
    let map_focus = <MapFocus>{zoom: 20};
    fixture.detectChanges();
    let map_instance = fixture.debugElement.query(By.css('mole-map-instance'));
    map_instance.triggerEventHandler('outFocusChange', map_focus);
    expect(map_focus_change_spy).toHaveBeenCalledWith(map_focus);
  });

});

