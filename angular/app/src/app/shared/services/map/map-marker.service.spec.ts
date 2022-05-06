import {fakeAsync, TestBed} from '@angular/core/testing';

import { MapMarkerService } from './map-marker.service';
import {HttpClientTestingModule, HttpTestingController, RequestMatch} from '@angular/common/http/testing';
import {EventApiService, EventTypeApiService, TrialApiService} from "..";
import {Router} from "@angular/router";
import {RouterTestingModule} from "@angular/router/testing";
import Spy = jasmine.Spy;
import {BehaviorSubject, Observable, Subject} from "rxjs";
import {Event, EventFilter, EventPayload, EventType, Marker, PointStyle, Trial} from "../../models";
import {PointStyleService} from "../point-style/point-style.service";
import {compareNumbers} from "@angular/compiler-cli/src/diagnostics/typescript_version";
import {environment} from "../../../../environments/environment";

class MockEventService{
  eventsPoseSubject: BehaviorSubject<Event[]>;
  eventsFilterSubject: BehaviorSubject<EventFilter>;

  events = <Event[]>[
    <Event>{id: 1, url: 'event/1/url'},
    <Event>{id: 2, url: 'event/2/url'}
  ];

  getPoseEvents(): Observable<Event[]> {
    this.eventsPoseSubject = new BehaviorSubject<Event[]>(this.events);
    return this.eventsPoseSubject.asObservable();
  }

  filterChangedNotification(): Observable<EventFilter> {
    this.eventsFilterSubject = new BehaviorSubject<EventFilter>(null);
    return this.eventsFilterSubject.asObservable();
  }

  createEventFromPayload(payload: EventPayload) {
    return null;
  }
}

class MockTrialService{
  selectedTrialSubject: BehaviorSubject<Trial>;

  mock_trial = <Trial>{scenario: {id: 1, entityGroups:["http://django:8000", "http://django:8000"]} }

  getSelectedTrial(): Observable<Trial> {
    this.selectedTrialSubject = new BehaviorSubject<Trial>(this.mock_trial);
    return this.selectedTrialSubject.asObservable();
  }
}

class MockPointStyleService{

  point_style = <PointStyle>{};

  getPointStyleFromTypeURL(typeURL): PointStyle {
    return this.point_style;
  }
}

describe('MapMarkerService', () => {
  let map_marker_service: MapMarkerService;
  let event_service: EventApiService;
  let trial_service: TrialApiService;
  let point_style_service: PointStyleService

  let http_testing_client: HttpTestingController;
  let auth_router: Router;

  let marker_adapter_spy: Spy;
  let filter_markers_spy: Spy;
  let pull_entities_spy: Spy;
  let pull_trial_styles_spy: Spy;


  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [EventApiService, TrialApiService, PointStyleService, MapMarkerService]
    }
    )

    TestBed.overrideProvider(EventApiService, {useFactory: () => new MockEventService()});
    TestBed.overrideProvider(TrialApiService, {useFactory: () => new MockTrialService()});
    TestBed.overrideProvider(PointStyleService, {useFactory: () => new MockPointStyleService()});

    event_service = TestBed.inject(EventApiService);
    trial_service = TestBed.inject(TrialApiService);
    point_style_service = TestBed.inject(PointStyleService);
    auth_router = TestBed.inject<any>(Router);
    http_testing_client = TestBed.inject<any>(HttpTestingController);

    auth_router.initialNavigation();

    marker_adapter_spy = spyOn(MapMarkerService.prototype, 'markerAdapter').and.callFake((event, layer) => {
      let adapted = <Marker><unknown>{
        coordinates: [100, 200],
        height: 100,
        heading: 20,
        pointStyle: {},
        eventId: event.id,
        metadata: ['meta1'],
        layer: layer,
        eventType: {}
      }
      return adapted;
    });

    filter_markers_spy = spyOn(MapMarkerService.prototype, 'filterMarkers').and.returnValue(null);
    pull_trial_styles_spy = spyOn(MapMarkerService.prototype, 'pullTrialStyles').and.returnValue(null);
    pull_entities_spy = spyOn(MapMarkerService.prototype, 'pullEntities').and.returnValue(null);

    map_marker_service = TestBed.inject(MapMarkerService);
  });

  it('should be created', () => {
    expect(map_marker_service).toBeTruthy();
  });


  it("filterMarkers() >> publishes list of markers that have an event type and whose id matches ones in currentFilters eventypes." +
    "If no event types exist then publish current markers", () => {

    filter_markers_spy.and.callThrough();
    map_marker_service['currentFilter'] = <EventFilter>{
      level: 1,
      types: [
      <EventType>{id:1, name:'event type 1 cars'}, <EventType>{id:2, name:'event type 2 cars'}, <EventType>{id: 1, name:'event type 1 boats'}
      ]
    };

    map_marker_service['currentMarkers'] = [
      <Marker><unknown>{
        coordinates: [100, 200],
        height: 100,
        heading: 20,
        pointStyle: {},
        eventId: 1,
        metadata: ['meta1'],
        layer: 'event',
        eventType: {id:1, name: 'event type 1 vehicles'}
      },

      <Marker><unknown>{
        coordinates: [100, 200],
        height: 100,
        heading: 20,
        pointStyle: {},
        eventId: 3,
        metadata: ['meta1'],
        layer: 'event',
        eventType: {id:3, name: 'event type 3 robots'}
      }
    ];

    map_marker_service.filterMarkers();
    map_marker_service['filteredMarkersSubject'].asObservable().subscribe(result => {
      expect(result).toEqual([map_marker_service['currentMarkers'][0]]);
    });

  });


  it("filterMarkers() >> publishes list of currentMarkers if no event types exist", () => {
    filter_markers_spy.and.callThrough();
    map_marker_service['currentFilter'] = <EventFilter>{
      level: 1,
      types: [
        <EventType>{id:1, name:'event type 1 cars'}, <EventType>{id:2, name:'event type 2 cars'}, <EventType>{id: 1, name:'event type 1 boats'}
      ]
    };

    map_marker_service['currentMarkers'] = [
      <Marker><unknown>{
        coordinates: [100, 200],
        height: 100,
        heading: 20,
        pointStyle: {},
        eventId: 1,
        metadata: ['meta1'],
        layer: 'event',
        eventType: {id:1, name: 'event type 1 vehicles'}
      },

      <Marker><unknown>{
        coordinates: [100, 200],
        height: 100,
        heading: 20,
        pointStyle: {},
        eventId: 3,
        metadata: ['meta1'],
        layer: 'event',
        eventType: {id:3, name: 'event type 3 robots'}
      }
    ];

    map_marker_service['currentFilter'] = null;
    map_marker_service.filterMarkers();
    map_marker_service['filteredMarkersSubject'].asObservable().subscribe(result => {
      expect(result).toEqual(map_marker_service['currentMarkers']);
    });
  });


  it("getFilteredMarkers() >> returns filteredMarkersSubject Subject as an observable", () => {
    let obs = map_marker_service.getFilteredMarkers();
    expect(obs).toBeInstanceOf(Observable);
    expect(obs).toEqual(map_marker_service['filteredMarkersSubject'].asObservable());
  });


  it("getMarkers() >> returns markersSubject Subject as an observable", () => {
    let obs = map_marker_service.getMarkers();
    expect(obs).toBeInstanceOf(Observable);
    expect(obs).toEqual(map_marker_service['markersSubject'].asObservable());
  });


  it("updateMarkerPoint(newLat:number, newLon:number\n" +
    "    , newMapOrElevation: any, eventId:number, metadataToAdd: string) >> !!!!!!!!!!!!!!! NOT IMPLEMENTED !!!!!!!!!!!!!!!!!!!!!", () => {
  });

  //TODO:
  it("pullEntities(trial: Trial) >> ", () => {
    // pull_entities_spy.and.callThrough();
    //
    // map_marker_service['selectedTrial'] = <Trial>{scenario: {id: 1, entityGroups:["http://django:8000/entity/", "http://django:8000/entity/"]} };
    // let trial_passed = <Trial>{scenario: {id:2, entityGroups: ["http://django:8000/entity/", "http://django:8000/entity/"] } };
    //
    // let first_mock_http_response_obj = [
    //   {related_entities: ["http://django:8000/related/entity/1", "http://django:8000/related/entity/2"]},
    //   {related_entities: ["http://django:8000/related/entity/3", "http://django:8000/related/entity/2"]},
    // ];
    //
    // map_marker_service.pullEntities(trial_passed);
    //
    // const req = http_testing_client.

    // expect(req.request.method).toEqual("GET");
    // req.flush(first_mock_http_response_obj);

  });


  it("getEntities() >> returns entitiesSubject Subject as an observerable", () => {
    let obs = map_marker_service.getEntities();
    expect(obs).toBeInstanceOf(Observable);
    expect(obs).toEqual(map_marker_service['entitiesSubject'].asObservable());
  });


  it("styleAdapter(server: any) >> set up style for server with url, name and param values in single object", () => {
    let server_name_1 = "server 1";
    let server_value_1 = {0: "7"};
    let server_value_2 = {1: "2"};

    let server = {base_url: '{window.location.hostname}/server/{z}/url', name: server_name_1, server_params: [{value: server_value_1}, {value: server_value_2}] };
    let mock_full_url = {
      "version": 8,
      "name": "OpenMapTiles",
      "sprite": "",
      "glyphs":environment.fonts,
      "sources": {
        "openstreet": {
          "type": "raster",
          "tiles": [
            environment.hostname + "/server/{z}/url"
          ],
          "minZoom":1,
          "maxZoom":20
        }
      },
      "layers":[{
        "id": "streets",
        "source": "openstreet",
        "type": "raster"
      }]
    };

    let full_mock = {
      0: server_value_1[0],
      1: server_value_2[1],
      style: <any>mock_full_url,
      name: server_name_1,
      url: environment.hostname + "/server/{z}/url"
    };

    expect(map_marker_service['styleAdapter'](server)).toEqual(full_mock);

    server.base_url = '{window.location.hostname}/server/styles/{z}/url'
    full_mock.url = environment.hostname + "/server/styles/{z}/url";
    full_mock.style = environment.hostname + "/server/styles/style.json";
    expect(map_marker_service['styleAdapter'](server)).toEqual(full_mock);


    server.base_url = '{window.location.hostname}/server/styles/style.json'
    full_mock.style = environment.hostname + "/server/styles/style.json";
    full_mock.url = environment.hostname + "/server/styles/{z}/{x}/{y}.jpg";
    expect(map_marker_service['styleAdapter'](server)).toEqual(full_mock);
  });


  it("pullTrialStyles() >> set styles to adapted style servers and publish this new style on styleSubject", fakeAsync(() => {
    pull_trial_styles_spy.and.callThrough();
    map_marker_service['stylesSubject'] = new Subject<any>();

    let mock_style = {
      0: '7',
      1: '2',
      style: 'localhost/server/url',
      name: 'server 1'
    };

    let style_adapt_spy = spyOn<any>(map_marker_service, 'styleAdapter').and.callFake(() => {
      return mock_style;
    });

    map_marker_service.pullTrialStyles();

    const req = http_testing_client.expectOne('/api/servers/');
    expect(req.request.method).toEqual("GET");
    req.flush(["server1"]);

    map_marker_service['stylesSubject'].subscribe(data => {
      expect(data).toEqual(mock_style)
    })
    expect(map_marker_service['styles']).toEqual([mock_style]);
    expect(style_adapt_spy).toHaveBeenCalledWith("server1");
  }));


  it("getTrialStyles() >> return stylesSubject ReplaySubject as an observable", () => {
    let obs = map_marker_service.getTrialStyles();
    expect(obs).toBeInstanceOf(Observable);
    expect(obs).toEqual(map_marker_service['stylesSubject'].asObservable());
  });


  it("getImages() >> return imageUrlSubject ReplaySubject as an observable", () => {
    let obs = map_marker_service.getImages();
    expect(obs).toBeInstanceOf(Observable);
    expect(obs).toEqual(map_marker_service['imageUrlSubject'].asObservable());
  });


  it("addMarker(lat:number, lon:number, mapName: string) >> creates a pose payload and grab the url from this new payload to create an EventPayload which" +
    "then gets used to created an Event", () => {
    let elevation_value = 1.1;
    let lat_value = 100;
    let lon_value = 200;
    let map_name = "mapname";
    let default_id = 1;
    let selected_trial_id = 2;
    let create_pose_sub = new BehaviorSubject<any>({url:'http://django:8000/pose/url'});

    let elevation_determinator_spy = spyOn(map_marker_service, 'elevationDeterminator').and.returnValue(elevation_value);
    let create_pose_spy = spyOn(map_marker_service, 'createPose').and.callFake(() => {
      return create_pose_sub.asObservable();
    });
    let create_event_from_payload_spy = spyOn(map_marker_service['_eventApiService'], 'createEventFromPayload').and.returnValue(null);

    let pose_payload = {
      "coordinates": [lat_value,lon_value],
      "elevation": elevation_value,
      "entity": "/api/entities/default entity/",
      "pose_source": "/api/pose_sources/1/"
    };

    let mock_result = {
      start_pose: "/pose/url",
      event_type: "/api/event_types/1/",
      trial: "/api/trials/2/"
    };

    map_marker_service['defaultEventTypeId'] = String(default_id);
    map_marker_service['selectedTrial'].id = selected_trial_id;
    map_marker_service.defaultEntityName = "default entity";
    map_marker_service.defaultPoseSourceId = '1';

    map_marker_service.addMarker(lat_value,lon_value, map_name);

    expect(elevation_determinator_spy).toHaveBeenCalledWith(map_name);
    expect(create_pose_spy).toHaveBeenCalledWith(pose_payload);
    expect(create_event_from_payload_spy).toHaveBeenCalledWith(mock_result);
  });


  it("getPose(id: number) >> gets pose with specified id request observable", () => {
    let pose_id = 1;

    let obser = map_marker_service.getPose(pose_id);
    obser.subscribe();

    const req = http_testing_client.expectOne('/api/poses/1');
    expect(req.request.method).toEqual("GET");
    req.flush('');
    expect(obser).toBeInstanceOf(Observable);
  });


  it("getPoseArrayMarkers(ids: number[]) >> generates a single observable containing all last emitted values by pose observables, gathered by their Id's", () => {
    let get_pose_spy = spyOn(map_marker_service, 'getPose').and.callFake((id) => {
      return new Observable<any>();
    });

    let ids = [1,2,3];

    expect(map_marker_service.getPoseArrayMarkers(ids)).toBeInstanceOf(Observable);
  });


  it("createPose(payload: Pose) >> posts passed pose to get created and returns this request as an observable", () => {
    let mock_pose = {
      coordinates: [100,200],
      elevation: 20,
      entity: 'entity/url',
      pose_source: 'pose/source/url'
    };

    let obser = map_marker_service.createPose(mock_pose);
    obser.subscribe();

    const req = http_testing_client.expectOne('/api/poses/');
    expect(req.request.method).toEqual("POST");
    req.flush(mock_pose);

    expect(obser).toBeInstanceOf(Observable);
  });


  it("markerAdapter(event: Event, layer: string = 'marker') >> Converts an Event's data to a Marker object with added layer attribute", () => {
    marker_adapter_spy.and.callThrough();
    let coord_value = [100,200];
    let eleveation_value = 20;
    let heading_value = 10;
    let pointStyle_value = {};
    let id_value = 12;
    let metadata_value = ['meta1'];
    let layer_value = 'marker';
    let eventtype_value = {};
    let startDate_value = new Date(50000);

    let mock_event = <Event><unknown>{
      startPose: {
        coordinates: coord_value,
        elevation: eleveation_value,
        heading: heading_value
      },
      pointStyle: pointStyle_value,
      id: id_value,
      metadata: metadata_value,
      eventType: eventtype_value,
      startDatetime: startDate_value
    };

    let mock_result = <Marker><unknown>{
      pose: { coordinates: coord_value,
            elevation: eleveation_value,
              heading: heading_value,
      },
      pointStyle: pointStyle_value,
      eventId: id_value,
      metadata: metadata_value,
      layer: layer_value,
      eventType: eventtype_value,
      startTime: startDate_value
      
    };

    expect(map_marker_service.markerAdapter(mock_event, layer_value)).toEqual(mock_result);

  });


  it("entityMarkerAdapter(entity: any, layer: string = 'entities') >> Converts an entity to a Marker Object", () => {
    let coordinates_val = [100,200];
    let elevation_val = 20;
    let heading_val = 10;
    let layer_value = "entities";
    let name_val = "testName"

    let mock_entity = {
      name: name_val,
      latestPose: {
        point: {coordinates: coordinates_val},
        elevation: elevation_val,
        heading: heading_val
      },
      pointStyle: map_marker_service['_pointStyleService']['point_style']
    };

    let mock_result = <Marker>{
      pose: { 
        coordinates: coordinates_val,
        elevation: elevation_val,
        heading: heading_val,
        entity: undefined,
        pose_source: undefined,
        url: undefined
      },
      pointStyle: map_marker_service['_pointStyleService']['point_style'],
      metadata: { description: name_val},
      layer: layer_value
    };

    expect(map_marker_service['entityMarkerAdapter'](mock_entity, 'entities')).toEqual(mock_result);

    mock_entity.latestPose.point = null;
    mock_result.pose.coordinates = null;
    expect(map_marker_service['entityMarkerAdapter'](mock_entity, 'entities')).toEqual(mock_result);

    mock_entity.latestPose = null;
    mock_result.pose = null;
    expect(map_marker_service['entityMarkerAdapter'](mock_entity, 'entities')).toEqual(mock_result);
  });


  it("elevationDeterminator(mapName: string) >> if passed mapname matches one of the style's name then increase minElevation by .1 or decrease " +
    "maxElevation by .1, if no names match return 0", () => {

    map_marker_service['styles'] = [
      {
        0: '7',
        1: '2',
        style: 'localhost/url',
        name: 'server 1',
        minElevation: null,
        maxElevation: 12
      }
    ];

    let result = map_marker_service.elevationDeterminator('server 1');
    expect(result).toEqual(11.9);

    map_marker_service['styles'][0]['maxElevation'] = null;
    map_marker_service['styles'][0]['minElevation'] = 10;

    result = map_marker_service.elevationDeterminator('server 1');
    expect(result).toEqual(10.1);

    map_marker_service['styles'][0]['name'] = 'server 2';
    result = map_marker_service.elevationDeterminator('server 1');
    expect(result).toEqual(0);
  });

});
