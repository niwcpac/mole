import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';

import { Subscription } from 'rxjs';

import {MapMarkerService, EventApiService, TrialApiService, PoseApiService } from '../../services';
import { Marker, MapFocus, Event, Trial, Entity, Pose } from "../../models";
import { MatDialog } from '@angular/material/dialog';
import { EventDialogComponent } from '../event/event-dialog/event-dialog.component';
import { CookieService } from 'ngx-cookie-service';
import { PoseAdapters } from '../../services/map/pose.adapter';
import { map } from 'rxjs/operators';

/**
 * Controls the initialization of map and data transmissions
 */
@Component({
  selector: 'mole-maps',
  templateUrl: './maps.component.html',
  styleUrls: ['./maps.component.scss']
})
export class MapsComponent implements OnInit, OnDestroy {


  private subscriptions = new Subscription();
  maps: MapSettings[];
  mapFocus: MapFocus;
  sourceImages: String[];
  focusedEventId: number;

  defaultStyle: MapSettings;
  defaultMap: string = "";
  entities: Marker[];
  agents: Entity[];
  markers: Marker[];
  agentMarkers: Marker[];

  @Input() event: Event;
  @Input() showTitle: boolean = true;
  @Input() allowPoseUpdates: boolean = true;
  @Input() useCesium: boolean = false;
  @Input() enableSwitcher: boolean = false;
  @Output() outPose = new EventEmitter<Pose>();
  eventMarker: Marker;
  createPose: boolean = false;
  trial: Trial;
  posesByPoseSource: Object;

  constructor(
    private _mapMarkerService: MapMarkerService,
    private _eventApiService: EventApiService,
    private _trialApiService: TrialApiService,
    private _poseApiService: PoseApiService,
    public dialog: MatDialog,
    private cookie: CookieService
  ) {
    this.posesByPoseSource = {};
    let mapsNotInitialized: boolean = true;

    if(cookie.check("map_name") ){
      this.defaultMap = cookie.get("map_name");
    }

    this.subscriptions.add(_trialApiService.getSelectedTrial().subscribe(
      trial => {
        this.trial = trial;
        // Clear poses in preparation for a different trial
        this.posesByPoseSource = {};
      }
    ));

    this.subscriptions.add(_poseApiService.getPoses().subscribe(
      many_poses =>  {
        // make a shallow copy to reassign posesByPoseSource later
        let new_mapping = Object.assign({}, this.posesByPoseSource);
        Object.keys(many_poses).forEach(pose_source => {
          let pose_source_mapping = {};
          Object.keys(many_poses[pose_source]).forEach(entity => {
            let new_list;
            if(this.posesByPoseSource.hasOwnProperty(pose_source) && this.posesByPoseSource[pose_source][entity]) {
              new_list =  [...this.posesByPoseSource[pose_source][entity], ...many_poses[pose_source][entity]];
            }
            else {
              new_list = [...many_poses[pose_source][entity]];
            }
            pose_source_mapping[entity] = new_list;
          }, this);
          new_mapping[pose_source] = pose_source_mapping;
        }, this);

        // reassign posesByPoseSource so that angular picks up the changes
        // not updating the reference makes angular ignore additions to the arrays within
        this.posesByPoseSource = new_mapping;
      }
    ));

    this.subscriptions.add(_mapMarkerService.getTrialStyles().subscribe(
      (trialStyles: MapSettings[]) =>
        {
          if(trialStyles){
            this.defaultStyle = trialStyles[0];
            for(let style of trialStyles) {
              if(style.default) {
                this.defaultStyle = style;
              }
            }

            this.setMapFocus(this.defaultStyle);
            if(this.defaultMap == "") {
              this.defaultMap = this.defaultStyle.name;
            }

          }
          this.maps = trialStyles;
          if(mapsNotInitialized) {
            mapsNotInitialized = false;
            // very short timeout so maps get rendered before setting the variables
            setTimeout(() => {this.mapSubscriptions()}, 1);
          }
        }
      ));



  }

  ngOnInit(){
    if(this.event) {
      if(this.event.startPose) {
        this.eventMarker = this._mapMarkerService.markerAdapter(this.event,"event");
        if(!this.eventMarker.eventId) {
          this.eventMarker.eventId = -2;
          this.eventMarker.pointStyle = {
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
          };
        }
        this.setMapFocus(this.defaultStyle);
      }
      else {
        this.createPose = true;
      }
    }
  }

  updateMapType(val){
    this.useCesium = val;
  }

  setMapFocus(style: MapSettings){
    let zoom: number = style.zoom;
    if( this.cookie.check("map_zoom")) {
      zoom =  Number(this.cookie.get("map_zoom"));
    }
    if(this.event) {
      this.mapFocus = {
        center: this.event.startPose.coordinates,
        zoom: zoom,
        pitch: 20,
        bearing: 0,
        mapFocus: ""
      }

    }
    else if(this.cookie.check("map_coordinate_lat")
         && this.cookie.check("map_coordinate_lng")) {
      this.mapFocus = {
        center: [ Number(this.cookie.get("map_coordinate_lng")),
                  Number(this.cookie.get("map_coordinate_lat"))],
        zoom: zoom,
        pitch: 20,
        bearing: 0,
        mapFocus: ""
      }
    }
    else {
      this.mapFocus = {
        center: [style.lng,style.lat],
        zoom: zoom,
        pitch: 20,
        bearing: 0,
        mapFocus: ""
      }
    }
  }

  filterMarkers(map: MapSettings, allMarkers: Marker[]) : Marker[] {
    let filteredMarkers = allMarkers;
    if(map != null && map.minElevation != null) {
      filteredMarkers = filteredMarkers.filter((m: Marker) => m.pose.elevation >= map.minElevation);
    }
    if(map != null && map.maxElevation != null) {
      filteredMarkers = filteredMarkers.filter((m: Marker) => m.pose.elevation <= map.maxElevation);
    }
    return filteredMarkers;
  }

  mapSubscriptions(){
    this.subscriptions.add(this._mapMarkerService.getFilteredMarkers().subscribe(
      (allMarkers: Marker[]) =>
        {
          this.markers = allMarkers;
        }
      ));

    this.subscriptions.add(this._mapMarkerService.getEntities().subscribe(
      (allEntities: Marker[]) =>
        {
          this.entities = allEntities;
        }
      ));
    this.subscriptions.add(this._mapMarkerService.getImages().subscribe(
      (images: String[]) =>
        {
          this.sourceImages = images;
        }
      ));
    this.subscriptions.add(this._eventApiService.getSelectedEvent().subscribe(
      (eventId: number) =>
        {
          this.focusedEventId = eventId;
        }
      ));
  }

  mapFocusChange(focus:MapFocus) {
    this.cookie.set("map_coordinate_lng",focus.center[0].toString());
    this.cookie.set("map_coordinate_lat",focus.center[1].toString());
    this.cookie.set("map_zoom",focus.zoom.toString());
    this.cookie.set("map_name",focus.mapStyle);
    // Note the following setting is for keeping multiple maps in sync
    this.mapFocus = focus;
  }

  mapFocusEvent(eventId:number) {
    this._eventApiService.setSelectedEvent(eventId);
    this._eventApiService.setLiveEventTracking(false);
  }

  mapCreateEvent(eventJson) {
    if(this.allowPoseUpdates) {
      let elevation = this._mapMarkerService.elevationDeterminator(eventJson.mapName)
      if(eventJson.marker.pose.elevation){
        elevation = eventJson.marker.pose.elevation
      }

      let entity = "/api/entities/"+this._mapMarkerService.defaultEntityName+"/"; 
      let notAnEvent = false;
      if(eventJson.marker && eventJson.marker.type && eventJson.marker.type == "Entity") {
        entity = "/api/entities/"+eventJson.marker.eventId+"/"; 
        notAnEvent = true;
      }

      let pose = {
        "coordinates": eventJson.marker.pose.coordinates,
        "elevation": elevation,
        "entity": entity,
        "pose_source": "/api/pose_sources/"+this._mapMarkerService.defaultPoseSourceId+"/"
      };
      this.subscriptions.add( this._mapMarkerService.createPose(pose)
      .pipe(map(x=> PoseAdapters.poseAdapter(x)))
      .subscribe((result: Pose) =>{
        if(notAnEvent){ // cesium entity update
          return;
        }

        if(this.event) {
          if(this.event.id) { // update existing
            this._eventApiService.updateEventPose(this.event.id,result.url);
          }
          else { // creating new
            this.outPose.emit(result)
          }
          this.event.startPose = result;
          this.eventMarker = this._mapMarkerService.markerAdapter(this.event,"event");
        }
        else if(eventJson.updateMarker){ // main map marker drag
          this._eventApiService.updateEventPose(eventJson.marker.eventId,result.url);
        }
        else { // main map create event
          let event = this._eventApiService.getEventObject(undefined,result);
          if(eventJson.marker.startDate){
            event.startDatetime = eventJson.marker.startDate
          }
          this.openEventDialog(event);
        }
      }));
    }
  }

  openEventDialog(event): void {
    const dialogRef = this.dialog.open(EventDialogComponent, {
      width: '33vw',
      data: event
    });
  }


  // clean up
  ngOnDestroy(){
    this.subscriptions.unsubscribe();
  }
}

// Local Interface to make life easier
export interface MapSettings {
  style: string;
  url: string;
  name: string;
  minElevation?: number;
  maxElevation?: number;
  lat?: number;
  lng?: number;
  zoom?: number;
  default?: boolean;
}
