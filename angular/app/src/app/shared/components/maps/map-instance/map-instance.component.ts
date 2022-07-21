import { Component, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, ViewEncapsulation,
  AfterViewInit, ViewChild, ComponentFactoryResolver,
  Injector, OnDestroy, ComponentRef, ElementRef } from '@angular/core';
import * as mapboxgl from 'maplibre-gl';

import { MapFocus, Marker, Event, Pose } from "../../../models";
import { MarkerPopupComponent } from './marker-popup/marker-popup.component';
import { Subscription } from 'rxjs';
import { MarkerComponent } from './marker/marker.component';
import { MapboxStyleLayerSwitcherControl, MapboxStyleDefinition } from './style-layer-switcher/style-layer-switcher';
import { MapSettings } from '../maps.component';
import { FontAwesomeUnicode} from './font-awesome-map'
import { TimelineCardComponent } from '../../timeline/timeline-card/timeline-card.component';
import { EventApiService } from 'src/app/shared/services';

let COLORS = [
  '#005f5f',
  '#5f0000',
  '#5fff5f',
  '#005fff',
  '#00af00',
  '#00005f',
  '#ff5f00',
  '#ff5f5f',
  '#afffff',
  '#ffafff',
  '#ffff00',
  '#000000',
  '#ff00af',
  '#5f5f5f',
  '#5f5f00',
  '#ff005f',
  '#00ffff',
  '#00ffaf',
  '#ffffff',
  '#0000ff',
]

interface MarkerMetaData {
  markerInstance?: mapboxgl.Marker;
  popupComponentInstance?: ComponentRef<MarkerPopupComponent>;
  markerComponentInstance?: ComponentRef<MarkerComponent>;
  popupSubscription?: Subscription;
  marker?: Marker;
}

/*
  This component should contain minimal to no mole logic
  It should only be generating a mapbox gl map from the inputs
  And sending mapbox gl events to the parent
*/
@Component({
  selector: 'mole-map-instance',
  templateUrl: './map-instance.component.html',
  styleUrls: ['./map-instance.component.scss'],
  // Encapsulation none is needed for the html marker styling
  encapsulation: ViewEncapsulation.None
})
export class MapInstanceComponent implements OnChanges, AfterViewInit, OnDestroy {

  map: mapboxgl.Map;
  @ViewChild('map') mapElement: ElementRef;

  subscriptions: Subscription = new Subscription();

  // List of maptile styles and associated properties
  @Input() styles: MapSettings[];
  currentStyle: MapSettings;
  // String identifier for the maptile style to initially load
  @Input() default: string;
  // filter args takes in the mapSettings and array of markers
  // returns filtered marker array used for hiding items that should not be shown for a particular maptile
  @Input() filter: (arg1: MapSettings, arg2: Marker[]) => Marker[] ;
  componentRef: ComponentRef<any>[] = [];

  // Unique identifier for current map instance
  @Input() name: string;

  // elements to be displayed on the map
  @Input() markers: Marker[];
  mapboxMarkers: Map<number,MarkerMetaData>;
  @Input() entities: Marker[];
  @Input() agents: Marker[];  
  @Input() onDemandMarkers: Marker[];
  @Input() eventMarker: Marker;
  // display this marker seperately allow it to be dragable make it bigger

  @Input() createPose: boolean;

  // image urls that can be loaded for display on map
  @Input() sources: String[];

  // Id of particular marker to highlight
  @Input() markerFocus: number;

  @Input() showTitle: boolean = true;
  @Input() allowMarkerMovement: boolean = true;

  @Input() posesByPoseSource: Object;
  poseSourceLayersSet: Set<string>;

  // Map is centered on this point
  currentFocus: MapFocus = {zoom: 0, center: [0,0], pitch: 0, bearing: 0, mapFocus: ""};
  @Input() set focus(value: MapFocus){
    this.currentFocus=value;
    this.changeFocus();
  };

  @Output() outFocusChange = new EventEmitter<MapFocus>();
  @Output() outMarkerClick = new EventEmitter<number>();
  @Output() outCreateMarker = new EventEmitter<{marker:any, mapName:string, updateMarker?:boolean}>();

  elementClicked: boolean = false; // used to determine if map or marker was clicked when both events fire
  enable: boolean = true; // should the map publish its current map center focus
  styleSwitcher: MapboxStyleLayerSwitcherControl;
  markersVisible = {};
  selectedMarkerDraggable: boolean = false;
  dragging:number = 0;
  mouseButtons: number[] = [];

  // global variable for layer name
  entityLayer: string = "entities";

  markerFeatures: Map<number,any>;

  constructor(private resolver: ComponentFactoryResolver,
    private injector: Injector,
    private _eventApiService: EventApiService) {
    this.mapboxMarkers = new Map<number,MarkerMetaData>();
    this.poseSourceLayersSet = new Set<string>();
  }

  ngAfterViewInit(){
    this.initMap();

    this.map.on('styledata',  () => {
      this.initSources();
    });


  }

  initMap(){
    mapboxgl.accessToken = 'self-hosted tiles, no access token required (variable only needs to be defined) '
    let styleLayers: MapboxStyleDefinition[]= [];
    for(let mapIndex in this.styles){
      let styleDef = {title: this.styles[mapIndex].name, type: "style", uri: this.styles[mapIndex].style, id: mapIndex};
      if(this.styles[mapIndex].name === this.default){
        this.currentStyle = this.styles[mapIndex];
        styleLayers.push({ ...styleDef , default: true });
      } else {
        styleLayers.push({ ...styleDef , default: false });
      }
    }

    if(!this.currentStyle) {
      this.currentStyle = this.styles[0];
    }

    this.map = new mapboxgl.Map({
      container: this.mapElement.nativeElement,
      style: this.currentStyle.style
    });

    this.changeFocus();

    styleLayers.push({ title: "Entities",type: "layer", uri: [this.entityLayer], default: true, id: this.entityLayer });
    styleLayers.push({ title: "Agents",type: "layer", uri: ["agentSymbol","agentLabel"], default: true, id: "agents" });
    styleLayers.push({ title: "Markers",type: "layer", uri: ["clusters",'cluster-count',"markerIcon","markerShape"], default: true, id: "markers" });
    if(this.eventMarker) {
      styleLayers.push({ title: "Event",type: "marker", uri: "markers", default: true, id: "event" });
    }
    this.styleSwitcher = new MapboxStyleLayerSwitcherControl(styleLayers);
    this.map.addControl(this.styleSwitcher);
    this.map.addControl(new mapboxgl.NavigationControl());

    this.subscriptions.add(this.styleSwitcher.buttonClickSubject.subscribe(x=> this.markerToggle(x)));


    this.loadMapEvents();

  }


  loadMapEvents(){

    // If map is moved send out current location
    if(this.outFocusChange) {
      this.multipleMapSyncEvents();
    }

    if(this.outCreateMarker) {
      this.mapClickCreateMarkerEvents();
    }

    this.symbolLayerEvents();

    this.map.on('load', () => {
      this.map.resize();
    });
  }


  multipleMapSyncEvents(){
    this.map.on('move', () => {
      //Map focus of "" is an external centering event do not want to publish intermediate movements
      if(this.enable && this.currentFocus.mapFocus != "") {
        this.outFocusChange.emit(
          {
            center:[this.map.getCenter().lng,this.map.getCenter().lat],
            zoom:this.map.getZoom(),
            pitch:this.map.getPitch(),
            bearing:this.map.getBearing(),
            mapFocus:this.name,
            mapStyle:this.currentStyle.name
          }
        );
      }
    });

    this.map.on('moveend', () => {
      if(this.currentFocus.mapFocus == "") {
        //External map centering event has ended
        this.currentFocus.mapFocus = "ExternalMovementEnd";
      }
    });
  }

  generatePopupComponent(eventId: number) : ComponentRef<any> {
    let event: Event = this._eventApiService.getLoadedPoseEvent(eventId);
    const markerFactory = this.resolver.resolveComponentFactory(TimelineCardComponent);
    let component: ComponentRef<TimelineCardComponent> = markerFactory.create(this.injector);
    component.instance.event = event;
    component.changeDetectorRef.detectChanges();
    return component;

  }

  mapClickCreateMarkerEvents(){
    this.map.on('mousedown', (e) => {
      this.mouseButtons.push(e.originalEvent.button);
    });
    this.map.on('mouseup', (e) => {
      if(this.mouseButtons.length > 1 || this.mouseButtons[0] != 2 || this.eventMarker){
        this.mouseButtons = [];
        return;
      }
      this.mouseButtons = [];
      // check if click was marker
      // if(this.elementClicked) {
      //   this.elementClicked = false;
      //   return;
      // }

      // get lat/lon
      let lat = e.lngLat.lat;
      let lng = e.lngLat.lng;
      let elevation = 0;

      let popup: string = "Create Event";
      if(this.createPose) {
        popup = "Create Pose";
      }

      let markerPose: Pose = {
        coordinates:[lng,lat],
        elevation: elevation,
        heading: 0
      }

      let createMarker: Marker = {
        pose: markerPose,
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
        },
        metadata: {
          popup: popup
        },
        eventId: -1
      };
      if(this.mapboxMarkers.has(-1)) {
        this.removeMarker(-1);
      }

      if(e.originalEvent.ctrlKey) {
        this.outCreateMarker.emit({marker:createMarker,mapName:this.currentStyle.name})
      } else {
        this.addMarker(createMarker,false, false, true);
      }

    });
  }

  symbolLayerEvents(){
    this.map.on('click','markerShape', (e) => {
      this.outMarkerClick.emit(e.features[0].properties.id);
      if(e.originalEvent.altKey) {
        this.markerFeatures.get(e.features[0].properties.id).properties.draggable = true;
        this.setMapGeoJsonLayer([...this.markerFeatures.values()], "markers");
      }

      if(e.originalEvent.shiftKey) {
        let coordinates = e.features[0].geometry.coordinates.slice();
        let ref: ComponentRef<any> = this.generatePopupComponent(e.features[0].properties.id);
        this.componentRef.push(ref);
        let popup = new mapboxgl.Popup({
          offset: 42,
          className: "marker-card"
        }).setDOMContent(
          ref.location.nativeElement
        ).setLngLat(coordinates)
        .addTo(this.map);
        popup.on('close', () => {
          ref.destroy();
          const index = this.componentRef.indexOf(ref, 0);
          if (index > -1) {
            this.componentRef.splice(index, 1);
          }
        });

      }

    });
    this.map.on('mouseenter', 'markerShape', (e) => {
      if(this.markerFeatures.get(e.features[0].properties.id).properties.draggable) {
        this.map.getCanvas().style.cursor = 'move';
      } else {
        this.map.getCanvas().style.cursor = 'pointer';
      }

      // canvas.style.cursor = 'move';
      // map.setPaintProperty('point', 'circle-color', '#3887be');
    });

    this.map.on('mouseleave', 'markerShape', (e) => {
      this.map.getCanvas().style.cursor = '';
    });


    this.map.on('mousedown', 'markerShape', (e) => {
    // Prevent the default map drag behavior.
      e.preventDefault();
      this.dragging = e.features[0].properties.id;
      this.map.getCanvas().style.cursor = 'grab';

      this.map.once('mouseup', (e) => this.onUp(e));
    });


    this.map.on('mousemove', (e) =>this.onMove(e));
  }

  onMove(e) {
    if(this.dragging != 0 && this.markerFeatures.get(this.dragging) && this.markerFeatures.get(this.dragging).properties.draggable) {
      var coords = e.lngLat;

      // Set a UI indicator for dragging.
      this.map.getCanvas().style.cursor = 'grabbing';
      // Update the Point feature in `geojson` coordinates
      // and call setData to the source layer `point` on it.
      this.markerFeatures.get(this.dragging).geometry.coordinates = [coords.lng, coords.lat];

      this.setMapGeoJsonLayer([...this.markerFeatures.values()], "markers");
    }
  }

  onUp(e) {

    // Print the coordinates of where the point had
    // finished being dragged to on the map.
    if(this.markerFeatures.get(this.dragging).properties.draggable) {
      let latlng = this.markerFeatures.get(this.dragging).geometry.coordinates;

      let marker = {coordinates: latlng, eventId: this.dragging}
      this.outCreateMarker.emit({marker:marker,mapName:this.currentStyle.name,updateMarker:true});
    }
    this.markerFeatures.get(this.dragging).properties.draggable = false;
    this.map.getCanvas().style.cursor = '';
    this.dragging = 0;

  }


  markerSource() {
    let layerName = "markers";
    if(!this.map.getSource(layerName)){
      let visible = "visible";
      // Determine from the style switcher if this layer is visible
      if(this.styleSwitcher) {
        if(!this.styleSwitcher.activeLayers.has(layerName)){
          visible = "none";
        }
      }

      this.map.addSource(layerName, {
        "type": "geojson",
                "data": {
                  "type": "FeatureCollection",
                  "features": []
                },
                cluster: true,
                clusterMaxZoom: 14,
                clusterRadius: 50,
                clusterProperties: {
                  highlight: ["any", ["get", "highlight"]]
                }
      });
      this.map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: layerName,
        filter: ['has', 'point_count'],
        layout: {
          'visibility': visible,
        },
        paint: {
        // Use step expressions (https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
        // with three steps to implement three types of circles:
        //   * Blue, 20px circles when point count is less than 10
        //   * Yellow, 30px circles when point count is between 10 and 50
        //   * Pink, 40px circles when point count is greater than or equal to 50
          'circle-color':
          [ "case",
                ['get', 'highlight'], '#9400D3',
                [
                  'step',
                  ['get', 'point_count'],
                  '#51bbd6',
                  10,
                  '#f1f075',
                  50,
                  '#f28cb1'
                ]
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20,
            10,
            30,
            50,
            40
          ]
        }
        });

      this.map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: layerName,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count'],
          'text-font': ['Open Sans Bold'],
          'text-size': Number(12),
          'visibility': visible,
        }
      });


      let markerIcons = {
        id    : "markerIcon",
        type  : "symbol",
        "source": layerName,
        filter: ['!', ['has', 'point_count']],
        'layout': {
          'text-field': ['get', 'icon']  ,
          'text-anchor': "bottom",
          'text-font': ['Font Awesome 5 Free Solid'],
          'text-ignore-placement': true,
          'text-allow-overlap': true,

          'text-size': Number(15),
          'text-transform': 'uppercase',
          'visibility': visible,
        },
        'paint': {
            'text-color':  ['get', 'colorContrast'],
        }
      }
      let markerShape = {
        id    : "markerShape",
        type  : "symbol",
        filter: ['!', ['has', 'point_count']],
        "source": layerName,
        'layout': {
          'text-field': FontAwesomeUnicode.map["map-marker"],
          'text-anchor': "bottom",
          'text-font': ['Font Awesome 5 Free Solid'],
          'text-offset': [0,.5],
          'text-ignore-placement': true,
          'text-allow-overlap': true,
          'text-size': Number(30),
          'text-transform': 'uppercase',
          'visibility': visible,
        },
        'paint': {
            'text-color':  [ "case",
                ['get', 'highlight'], '#9400D3',
                ['get', 'markerColor']
            ] ,
            'text-halo-color':  ['get', 'colorContrast'],
            'text-halo-width': [ "case",
              ['get', 'draggable'], 2,
              0
            ]
        }
      }
      this.map.addLayer(markerShape);
      this.map.addLayer(markerIcons);

      this.loadMarkers();
    }
  }


  entitySource(){
    let layerName = this.entityLayer;
    if(!this.map.getSource(layerName)){
      this.map.addSource(layerName, {
        "type": "geojson",
                "data": {
                  "type": "FeatureCollection",
                  "features": []
                }
      });

      let visible = "visible";
      // Determine from the style switcher if this layer is visible
      if(this.styleSwitcher) {
        if(!this.styleSwitcher.activeLayers.has(layerName)){
          visible = "none";
        }
      }
      let json = {
        id    : layerName,
        type  : "symbol",
        "source": layerName,
        'layout': {
          'text-field': ['get', 'icon']  ,
          'text-anchor': "bottom",
          'text-font': ['Font Awesome 5 Free Solid'],
          'text-ignore-placement': true,
          'text-allow-overlap': false,
          'text-size': Number(15),
          'text-transform': 'uppercase',
          'visibility': visible,
        },
        'paint': {
            'text-color':  ['get', 'markerColor'],
        }
      }
      this.map.addLayer(json);

      // reload source data for map style changes as it has been cleared
      this.loadEntities();
    }
  }

  initSources() {
    if(this.styleSwitcher && this.styleSwitcher.activeStyle) {
      this.currentStyle = this.styles[this.styleSwitcher.activeStyle]
    }
    // reload source data for map style changes as it has been cleared
    this.entitySource();
    this.markerSource();
    this.agentSource();
    // reload markers as the filter may have changed
    this.loadEventMarker();

    this.loadPosesSource();

  }

  loadPosesSource(newPoses:Object = {}){
    let listOfFeatures = [];
    let my_collection = {
      "type": "geojson",
      "data": {
        "type": "FeatureCollection",
        "features": listOfFeatures,
      },
    }

    Object.keys(newPoses).forEach((pose_source_type) => {
      this.poseSourceLayersSet.add(pose_source_type);
      Object.keys(newPoses[pose_source_type]).forEach(entity => {
        // let result = newPoses[pose_source_type][entity].map(a => a.coordinates);
        newPoses[pose_source_type][entity].forEach(single_pose => {
          let asdf = {
            'type': 'Feature',
            'properties': {
              'pose_source': pose_source_type,
              'entity': single_pose.entity.name,
              'draggable': false
            },
            'geometry': {
              'type': 'Point',
              'coordinates': single_pose.coordinates,
            },
          }
          listOfFeatures.push(asdf);
        });
      });
    });

    if(!this.map.getSource("posesByPoseSource")) {
      this.map.addSource("posesByPoseSource", my_collection);
    }
    else{
      this.map.getSource("posesByPoseSource").setData({
        "type": "FeatureCollection",
        "features": listOfFeatures,
      });
    }

    // for item in poseSourceLayersSet
    // add a separate layer with its own styling
    // cast the set into an array to get a numerical index
    [...this.poseSourceLayersSet].forEach((pose_source, index) => {
      if(!this.map.getLayer(pose_source)){
        this.map.addLayer({
          'id': pose_source,
          'type': 'circle',
          'source': 'posesByPoseSource',
          // 'filter': ['==', ['get', 'pose_source'], pose_source],
          paint: {
            'circle-radius': 5,
            'circle-color': COLORS[index],
          },
        });
      }
    }, this);
  }

  loadEntities(){
    if(this.entities) {
    const layerName = this.entityLayer;
      let filteredEntities = this.filter(this.currentStyle, this.entities)
      // create feature array for the layer
      let geoJSONFeatures = [];
      for(let entity of filteredEntities){
        geoJSONFeatures.push(this.getGeoJSONPoint(entity));
      }

      this.setMapGeoJsonLayer(geoJSONFeatures, layerName);
    }
  }

  agentSource(){
    let layerName = "agents";
    if(!this.map.getSource(layerName)){
      this.map.addSource(layerName, {
        "type": "geojson",
                "data": {
                  "type": "FeatureCollection",
                  "features": []
                }
      });

      let visible = "visible";
      // Determine from the style switcher if this layer is visible
      if(this.styleSwitcher) {
        if(!this.styleSwitcher.activeLayers.has(layerName)){
          visible = "none";
        }
      }
      let json = {
        id    : "agentSymbol",
        type  : "symbol",
        "source": layerName,
        'layout': {
          'text-field': ['get', 'icon']  ,
          'text-anchor': "center",
          'text-font': ['Font Awesome 5 Free Solid'],
          'text-ignore-placement': true,
          'text-allow-overlap': false,

          'text-size': Number(15),
          'text-transform': 'uppercase',
          'visibility': visible,
        },
        'paint': {
            'text-color':  ['get', 'markerColor'],
        }
      }

      let label = {
        id    : "agentLabel",
        type  : "symbol",
        "source": layerName,
        'layout': {
          'text-field': ['get', 'description']  ,
          'text-anchor': "top",
          'text-font': ['Open Sans Bold'],
          'text-ignore-placement': false,
          'text-allow-overlap': false,
          'text-offset': [0,1],

          'text-size': Number(15),
          'visibility': visible,
        },
        'paint': {
            'text-color':  ['get', 'markerColor'],
        }
      }

      this.map.addLayer(label);
      this.map.addLayer(json);


      // reload source data for map style changes as it has been cleared
      this.loadAgents();
    }
  }

  loadAgents(){
    if(this.agents) {
    const layerName = "agents";
      let filteredEntities = this.filter(this.currentStyle, this.agents)
      // create feature array for the layer
      let geoJSONFeatures = [];
      for(let entity of filteredEntities){
        geoJSONFeatures.push(this.getGeoJSONPoint(entity));
      }

      this.setMapGeoJsonLayer(geoJSONFeatures, layerName);
    }
  }


  loadMarkers(){
    if(this.markers) {
      // get all existing marker keys

      let currentMarkers = this.filter(this.currentStyle, this.markers)
      if(this.eventMarker) {
        currentMarkers = currentMarkers.filter(x=> x.eventId != this.eventMarker.eventId);
      }

      this.markerFeatures = new Map<number,any>();
      for(let marker of currentMarkers) {
        let highlight: boolean = this.markerFocus == marker.eventId;

        this.markerFeatures.set(marker.eventId,this.getGeoJSONPoint(marker,highlight));

      }
      this.setMapGeoJsonLayer([...this.markerFeatures.values()], "markers");

    }
  }

  loadEventMarker(){
    if(this.eventMarker) {
      // get all existing marker keys
      if(this.mapboxMarkers.has(this.eventMarker.eventId)){
        this.removeMarker(this.eventMarker.eventId);
        this.addMarker(this.eventMarker,false,true, true);
      } else {
        this.addMarker(this.eventMarker,false,true, true);
      }
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if(changes.posesByPoseSource && this.posesByPoseSource){
      this.loadPosesSource(changes.posesByPoseSource.currentValue);      
    }
    if(changes.markers && this.markers){
      this.loadMarkers()
    }

    if(changes.eventMarker && this.eventMarker){
      this.loadEventMarker()
    }

    // entities should only change if all entities change
    if(changes.entities && changes.entities.currentValue){
     this.loadEntities();
    }

    // entities should only change if all entities change
    if(changes.agents && changes.agents.currentValue){
      this.loadAgents();
      }

    // entities should only change if all entities change
    if(changes.onDemandMarkers){
      // clear marks
      for(let mark of this.onDemandMarkers){
        // add mark in map
      }
    }

    if(changes.sources && changes.sources.currentValue){
      for(let imagePath of this.sources) {
        if(!this.map.hasImage(imagePath)) {
          this.map.loadImage(
            imagePath,
            (error, image) => {
                if (error) throw error;
                this.map.addImage(imagePath, image)
            }
          );
        }
      }
    }

    if(changes.markerFocus){
      let reload: boolean = false;
      // has previous value and previous value exists in mapboxmarkers
      if(changes.markerFocus.previousValue && this.markerFeatures.get(changes.markerFocus.previousValue)) {
        let marker = this.markerFeatures.get(changes.markerFocus.previousValue)
        marker.properties.highlight = false;
        reload = true;
      }

      // has currentvalue and current value exists in mapboxmarkers
      if(changes.markerFocus.currentValue && this.markerFeatures.get(changes.markerFocus.currentValue)) {
        let marker = this.markerFeatures.get(changes.markerFocus.currentValue)
        marker.properties.highlight = true;
        reload = true;
      }
      if(reload){
        this.setMapGeoJsonLayer([...this.markerFeatures.values()], "markers");
      }

    }
  }


  markerToggle(type: string){
    this.markersVisible[type] = !this.markersVisible[type];
    for(let markerMetadata of this.mapboxMarkers ) {
      if(markerMetadata[1].marker.layer == type) {
        if(!this.markersVisible[type]) {
          markerMetadata[1].markerInstance.addTo(this.map);
        } else {
          markerMetadata[1].markerInstance.remove();
        }
      }
    }
  }

  addMarker(marker: Marker, highlightOnClick: Boolean = true, eventMarker: boolean = false, movable: boolean = false ){

    let metadata: MarkerMetaData = {"marker": marker};

    const markerFactory = this.resolver.resolveComponentFactory(MarkerComponent);
    const markerComponent = markerFactory.create(this.injector);
    markerComponent.instance.point_style = marker.pointStyle;
    markerComponent.instance.large_size = eventMarker;
    markerComponent.changeDetectorRef.detectChanges();
    metadata.markerComponentInstance = markerComponent;
    let element = markerComponent.location.nativeElement;
    let dragable = movable && this.allowMarkerMovement;

    let mapBoxMarker = new mapboxgl.Marker({
      element: element,
      anchor: "center",
      draggable: dragable
    });
    mapBoxMarker.setLngLat(marker.pose.coordinates);

    if(eventMarker){
      mapBoxMarker.on('dragend', (e) =>
        {
          let lat = e.target.getLngLat().lat;
          let lng = e.target.getLngLat().lng;
          marker.pose.coordinates = [lng,lat];
          this.outCreateMarker.emit({marker:marker,mapName:this.currentStyle.name,updateMarker:true});
        }
      );
    }


    if(marker.metadata && marker.metadata.popup) {
      // TODO popup html for non create event marker popups
      const factory = this.resolver.resolveComponentFactory(MarkerPopupComponent);
      const component = factory.create(this.injector);

      metadata.popupSubscription = component.instance.popClick.subscribe(
        (event) => {
          this.removeMarker(marker.eventId);
          this.outCreateMarker.emit({marker:marker,mapName:this.currentStyle.name});
        });
      component.instance.buttonText = marker.metadata.popup;
      component.changeDetectorRef.detectChanges();
      var popup = new mapboxgl.Popup({
        offset: 42
      }).setDOMContent(
        component.location.nativeElement
      );
      metadata.popupComponentInstance = component;
      mapBoxMarker.setPopup(popup);
    }
    if(!this.markersVisible[marker.layer]) {
      mapBoxMarker.addTo(this.map);
    }
    metadata.markerInstance = mapBoxMarker;
    this.mapboxMarkers.set(marker.eventId,metadata);

  }


  getGeoJSONPoint(entity : Marker, highlight: boolean = false) {
    let description = "";
    if(entity.metadata && entity.metadata.description) {
      description = entity.metadata.description;
    }
    let feature = {
      "type"    : "Feature",
      "geometry"  : {
        "type"        : "Point",
        "coordinates" : entity.pose.coordinates
      },
      "properties"  : {
        "id"   : entity.eventId,
        "description" : description,
        "icon" : FontAwesomeUnicode.map[entity.pointStyle.icon],
        "markerColor": entity.pointStyle.marker_color,
        "heading"   : entity.pose.heading,
        "image" : entity.pointStyle.icon,
        "color" : entity.pointStyle.color,
        "colorContrast" : this.getColorContrast(entity.pointStyle.marker_color),
        "highlight": highlight,
        "draggable": false
      }
    };
    return feature;
  }

  getColorContrast( hex_color )
  {
      var contrast_color = '#fafafa';
      if ( hex_color != null ) {
          if ( hex_color[0] == '#' ) {
              var marker_color_hex = Number(hex_color.replace('#', '0x'))
              if ( marker_color_hex > 0x7fffff ) {
                  contrast_color = '#1A1A1A';
              }
          }
      }
      return contrast_color;
  }

  setMapGeoJsonLayer(geoJSONFeatures: any[], layerName: string){
    if(this.map.getSource(layerName)) {
      this.map.getSource(layerName).setData( {
                  "type": "FeatureCollection",
                  "features": geoJSONFeatures
      });
    }



  }

  // Method changes view to provided parameters. Disables tracking of view while changing view
  changeFocus(){
    if(this.map && this.currentFocus.mapFocus !== this.name) {
      this.enable = false;
      this.map.setZoom(this.currentFocus.zoom);
      this.map.setPitch(this.currentFocus.pitch);
      this.map.setBearing(this.currentFocus.bearing);
      this.map.setCenter(this.currentFocus.center);
      this.enable = true;
    }
  }

removeMarker(markerId: number) {
  let metadata = this.mapboxMarkers.get(markerId);
  metadata.markerInstance.remove();
  this.cleanupMarkerMetadata(metadata);
  this.mapboxMarkers.delete(markerId);
}

cleanupMarkerMetadata(markerMetadata: MarkerMetaData){
  if(markerMetadata.markerComponentInstance) {
    markerMetadata.markerComponentInstance.destroy();
  }
  if(markerMetadata.popupSubscription) {
    markerMetadata.popupSubscription.unsubscribe();
  }
  if(markerMetadata.popupComponentInstance) {
    markerMetadata.popupComponentInstance.destroy();
  }

}

  // clean up
  ngOnDestroy(){
    for(let markerMetadata of this.mapboxMarkers ) {
      this.cleanupMarkerMetadata(markerMetadata[1]);
    }
    this.subscriptions.unsubscribe();

    for(let ref of this.componentRef){
      ref.destroy();
    }
  }

}
