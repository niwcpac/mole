import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Subscription, Observable, forkJoin, BehaviorSubject, ReplaySubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';

import { Marker, Pose, Event, Trial, EventFilter, EventType, EventPayload } from "../../models";
import { EventApiService } from "../event/event-api.service";
import { environment } from 'src/environments/environment';
import { TrialApiService } from '../trial/trial-api.service';
import { map, mergeAll, distinct } from 'rxjs/operators';
import { EntityApiService } from '../entity/entity-api.service';
import { PointStyleService } from '../point-style/point-style.service';
import { PoseAdapters } from './pose.adapter';
@Injectable({
  providedIn: 'root'
})
export class MapMarkerService implements OnDestroy {

  private subscriptions = new Subscription();

  private markersSubject: Subject<Marker[]>;
  private filteredMarkersSubject: Subject<Marker[]>;
  private entitiesSubject: Subject<Marker[]>;

  private selectedTrial: Trial;

  private currentMarkers: Marker[];
  private currentFilter: EventFilter;

  private imageUrlSubject: Subject<String[]>;

  // default values for creating pose and entity data
  // TODO extract/determine these values from database
 defaultEntityName: string = "map_marker";
 defaultPoseSourceId: string = "2";
 private defaultEventTypeId: string = "17"; // Other



  private stylesSubject: Subject<any>;
  private styles: any[];

  constructor(private _eventApiService: EventApiService
    , private _pointStyleService: PointStyleService
    , private _trialApiService: TrialApiService
    , private _entityApiService : EntityApiService
    , private http: HttpClient) {

      this.markersSubject = new ReplaySubject(1);
      this.filteredMarkersSubject = new ReplaySubject(1);
      this.entitiesSubject = new ReplaySubject(1);
      this.imageUrlSubject = new ReplaySubject(1);
      this.stylesSubject = new ReplaySubject(1);

      this.subscriptions.add(
        _eventApiService.getPoseEvents().subscribe(
          (events: Event[]) => {
            if(events) {
              this.currentMarkers = events.map( (event: Event) => this.markerAdapter(event));
              this.markersSubject.next(this.currentMarkers);
              this.filterMarkers();
            }
          }
        )
      );

      this.subscriptions.add(
        _entityApiService.getSelectedTrialEntities().subscribe(
          (entities: any[]) => {
            if(entities) {
              let entityMarkers = entities.map( entity => this.entityMarkerAdapter(entity)).filter(x=>x.pose && x.pose.coordinates != null && x.pointStyle.icon != null);
              
              this.entitiesSubject.next(entityMarkers);
            }
          }
        )
      );

      this.subscriptions.add(
        _eventApiService.filterChangedNotification().subscribe(
          (filter: EventFilter) => {
            this.currentFilter = filter;
            this.filterMarkers();
          }
        )
      );

      this.subscriptions.add(
        _trialApiService.getSelectedTrial().subscribe(
          (trial: Trial) => {
            if(trial) {
              this.selectedTrial = trial;
            }
          }
        )
      );

      this.pullTrialStyles();

   }

  filterMarkers() {
    if(this.currentFilter && this.currentFilter.types.length > 0) {
      this.filteredMarkersSubject.next(this.currentMarkers.filter((m:Marker)=>
          m.eventType &&
          this.currentFilter.types.some( (filterType:EventType) => filterType.id === m.eventType.id)
        ));
    }
    else {
      this.filteredMarkersSubject.next(this.currentMarkers);
    }
  }

  getFilteredMarkers(): Observable<Marker[]>{
    return this.filteredMarkersSubject.asObservable();
  }

  getMarkers(): Observable<Marker[]>{
    return this.markersSubject.asObservable();
  }

  // TODO finish Stub method
  updateMarkerPoint(newLat:number, newLon:number
    , newMapOrElevation: any, eventId:number, metadataToAdd: string) {
    // eventApiService marker.eventId
    // create new pose
      // get current metadata
      // set event start_pose and update metadata
      // patch request
  }

  pullEntities(trial: Trial) {
    if(!this.selectedTrial || (trial.scenario.id !== this.selectedTrial.scenario.id)) {
      // First get observables for all entityGroup calls
      let entityGroupObservables: Observable<string[]>[] = [];
      for(let entity_group of trial.scenario.entityGroups) {
        // TODO figure out why this is needed
        entityGroupObservables.push( this.http.get(entity_group.replace("http://django:8000",""))
            .pipe( map(
              // return only the related_entities array of the entity_group
              (data: any) => data.related_entities) )
        );
      }

      // join the results of all entityGroup
      forkJoin(entityGroupObservables).pipe(
          // combine the array of string[] into one string[]
          mergeAll(),
          // remove duplicates
          distinct()
      ).subscribe(
          // here we have the results of all the entityGroup calls
          ((entities: string[])=> {
            // get all the observables to each entity converted to a marker
            let entityObservables: Observable<Marker>[] = [];
            for(let entity of entities) {
              // TODO figure out why this is needed
              entityObservables.push( this.http.get(entity.replace("http://django:8000",""))
                  .pipe( map(
                    (data: any) => this.entityMarkerAdapter(data)
                  ))
              );
            }
            // join the results together and output them as the subject
            forkJoin(entityObservables).subscribe(
              data => {
                let hasLocation = data.filter(x => x.pose && x.pose.coordinates !== null);
                this.imageUrlSubject.next([...new Set(hasLocation.map(x => x.pointStyle.icon))]);
                this.entitiesSubject.next(hasLocation);
              }
            )

          })
      )
    }
  }


  getEntities(): Observable<Marker[]> {
    return this.entitiesSubject.asObservable();
  }

//TODO strongly type
private styleAdapter(server: any) : any {

  let url = server.base_url;

  url = url.replace("{window.location.hostname}",environment.hostname);
  // at the end of this if block urlStyle should have a json style or link to json style for mapbox
  // and url should have a {z}/{x}/{y}.jpg link that works for cesium
  let urlStyle;
  if(!url.includes("/styles/")) {
    urlStyle = {
      "version": 8,
      "name": "OpenMapTiles",
      "sprite": "",
      "glyphs":environment.fonts,
      "sources": {
        "openstreet": {
          "type": "raster",
          "tiles": [
            url
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
  } else if (url.includes("style.json")){
    urlStyle = url;
    url = url.replace("style.json","{z}/{x}/{y}.jpg")
  } else {
    urlStyle = url.split('{z}')[0] + "style.json"
  }

  let style = {
    style: urlStyle,
    url: url,
    name: server.name
  };


  for( let params of server.server_params ) {
    style = {...style, ...params.value}
  }

  return style;
}

pullTrialStyles() {
  let request = this.http.get("/api/servers/").pipe(
    map( (data: any) => data.map( item => this.styleAdapter(item)))
  );
  this.subscriptions.add(
    request.subscribe(
      (results: any) => {
        this.styles = results;
        this.stylesSubject.next(results);
      }
    )
  );
}

  getTrialStyles(): Observable<any[]> {

    return this.stylesSubject.asObservable();
  }

  getImages(): Observable<String[]> {
    return this.imageUrlSubject.asObservable();
  }

  addMarker(lat:number, lon:number, mapName: string) {

    let posePayload = {
      "coordinates": [lat,lon],
      "elevation": this.elevationDeterminator(mapName),
      "entity": "/api/entities/"+this.defaultEntityName+"/",
      "pose_source": "/api/pose_sources/"+this.defaultPoseSourceId+"/"
    };
    this.subscriptions.add( this.createPose(posePayload).subscribe(result =>{
          let payload: EventPayload = {
           start_pose: result.url.replace("http://django:8000",""),
           event_type: "/api/event_types/"+this.defaultEventTypeId+"/",
           trial: "/api/trials/"+this.selectedTrial.id+"/"
          };
          this._eventApiService.createEventFromPayload(payload);
        }
      )
    )
  }

  // TODO finish Stub method (make observable typed preferably to Marker)
  getPose(id: number): Observable<any>{
    return this.http.get('/api/poses/'+id);
    // .pipe( map( data => convertToTypedFormat) )
  }

  // TODO finish Stub method (make observable typed preferably to Marker)
  getPoseArrayMarkers(ids: number[]): Observable<any>{
    let poseObservables: Observable<any>[] = [];
    for(let id of ids){
      poseObservables.push(
        this.getPose(id)
        // .pipe( map( data => convertToTypedFormat) )
      );
    }
    return forkJoin(poseObservables);
  }

  createPose(payload: Pose): Observable<any>{
    let createPoseJson:any = payload;
    createPoseJson["lat"] = payload.coordinates[1];
    createPoseJson["lon"] = payload.coordinates[0];

    return this.http.post('/api/poses/', createPoseJson);
  }



     // clean up
  ngOnDestroy(){
    this.subscriptions.unsubscribe();
  }

  markerAdapter(event: Event, layer: string = "marker") : Marker {
    return {
      pose: event.startPose,
      pointStyle: event.pointStyle,
      eventId: event.id,
      metadata: event.metadata,
      layer: layer,
      eventType: event.eventType,
      startTime: event.startDatetime
    }
  }


  private entityMarkerAdapter(entity: any, layer: string = "entities") : Marker {
    let pose = null;
    if(entity.latestPose ) {
      pose = PoseAdapters.poseAdapter(entity.latestPose);
    }

    return {
      pose: pose,
      pointStyle: entity.pointStyle,
      layer: layer,
      metadata: {
        description: entity.name
      }
    }
  }



  elevationDeterminator(mapName: string): number {
    let currentStyle;
    for(let style of this.styles) {
      if(style.name == mapName) {
        currentStyle = style;
      }
    }
    if(currentStyle) {
      if(currentStyle.minElevation != null) {
        return currentStyle.minElevation + .1;
      }
      if(currentStyle.maxElevation != null) {
        return currentStyle.maxElevation - .1;
      }
    }

    return 0; // default elevation

  }

}
