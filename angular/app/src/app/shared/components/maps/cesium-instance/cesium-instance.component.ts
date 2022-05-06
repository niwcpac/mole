import { Component, Input, SimpleChanges, OnChanges, AfterViewInit, 
  ComponentFactoryResolver, Injector, ViewChild, ViewChildren, OnDestroy, Output, EventEmitter, SimpleChange } from '@angular/core';
import {
  ViewerConfiguration, CesiumService, AcNotification,
  ActionType, AcEntity,  MapEventsManagerService, 
  EventRegistrationInput, CesiumEvent, PickOptions
} from 'angular-cesium';
import { Entity, Marker, Pose, Trial } from 'src/app/shared/models';
import { of, ReplaySubject, Subject, Subscription } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { PinBuilder, JulianDate, Cartesian3, Matrix4, ShadowMode, ScreenSpaceEventType, HeightReference, Cartographic } from 'cesium';
import { MoleGeocoder } from './mole-geocoder';
import { MapMarkerService } from 'src/app/shared/services';

@Component({
  selector: 'mole-cesium-instance',
  templateUrl: './cesium-instance.component.html',
  styleUrls: ['./cesium-instance.component.scss'],
  providers: [
    ViewerConfiguration,
    CesiumService,
    MapEventsManagerService
  ]
})
export class CesiumInstanceComponent implements AfterViewInit, OnChanges, OnDestroy {


  private subscriptions = new Subscription();

  @Input() styles: any[];
  @Input() entities: Marker[];
  entitiesSubject: Subject<AcNotification>;

  @Input() agents: Entity[];
  agentSubject: Subject<AcNotification>;

  @Input() markers: Marker[];
  markerSubject: Subject<AcNotification>;

  @Input() trial: Trial;
  @Input() createPose: boolean = false;

  @Output() outCreateMarker = new EventEmitter<{marker:any, mapName:string, updateMarker?:boolean}>();
  @Output() outMarkerClick = new EventEmitter<number>();

  @ViewChildren("ACLayers") acLayers;
  @ViewChild("ACMap") acMap;

  // Markers need to disappear before a specific time
  // The code requires them to disappear after a specific time to work (TODO find a way around this requirement)
  // This is a global variable which is set days after trial end
  endtime: JulianDate;

  cesiumViewer;
  geocoder: MoleGeocoder;

  // Objects for rendering scene
  offset: Cartesian3;
  currentTileset;
  translation: Matrix4;
  
  // map used to find distance from entities
  entityPositionMap: Map<String, Cartesian3>;


  // helper method fixes bugs when swapping between mapbox and cesium maps
  reRunChanges: SimpleChanges;

  // context menu variables
  mapClickContextMenu;
  markerClickContextMenu;


  // variables for marker movement
  movableObject = undefined;
  planeObject = undefined;
  planeNormal = undefined;
  startPosition = undefined;
  moving = false;
  
  isEntityBeingTracked = false;
 
  constructor(
    private viewerConf: ViewerConfiguration,
    private resolver: ComponentFactoryResolver,
    private injector: Injector) {

    this.geocoder = new MoleGeocoder();
    this.viewerConf.viewerOptions = {
      baseLayerPicker: true,
      terrainProviderViewModels: [],
      imageryProviderViewModels: [],
      geocoder: this.geocoder,
      skyBox: false,
      skyAtmosphere: false
    };

    this.entityPositionMap = new Map();
    this.entitiesSubject = new ReplaySubject(1);
    this.agentSubject = new ReplaySubject(1);
    this.markerSubject = new ReplaySubject(1);
    // Zoom distance from DEFAULT_VIEW_RECTANGLE    
    Cesium.Camera.DEFAULT_VIEW_FACTOR = 0;

    // This is the offset of the model coordiante frame to the artifact coordinate frame 
    // In the sdf file artifact_origin
    // Setting of this variable has moved to the database server params
    this.offset = new Cartesian3(0, 0, 0);
    // The transform of the localframe coordinates to world coordinates with 0,0,0 being at the startPos
    // The east,down,(north) means x points east, y points down, and z points north. The z value is derived from the xy.
    // The important variable is the second one "down" which makes the model rightside up. 
    // The first could be (east,west,north,or south) which just rotates the model
    // In theory this part of the translation could be embedded in the tiles and we could use Cesium.Transforms.LocalFrameToFixedFrame
    // Setting of this variable has moved to the database server params
    this.translation = Matrix4.IDENTITY;

    this.mapClickContextMenu = [{ name: 'Create Marker', onActionClick: (event) => { this.mapClickCreateMarkerEvents(event)}}]
    this.markerClickContextMenu = [{ name: 'Move in XY', onActionClick: (entity) => { this.mapClickEnableMovement(Cesium.Plane.ORIGIN_XY_PLANE,entity)}},
    { name: 'Move in YZ', onActionClick: (entity) => { this.mapClickEnableMovement(Cesium.Plane.ORIGIN_YZ_PLANE,entity)}},
    { name: 'Move in ZX', onActionClick: (entity) => { this.mapClickEnableMovement(Cesium.Plane.ORIGIN_ZX_PLANE,entity)}},
    { name: 'Move on Surface', onActionClick: (entity) => { this.mapClickEnableMovement(undefined,entity)}}
    ]
  }

  ngAfterViewInit(): void {


    this.cesiumViewer = this.acMap.getCesiumViewer()
    this.setTimezoneFormat();
    this.timelineZoom();

    this.mapSetupMovement();    
    // Somewhat of a hack. The geocoders exposed methods don't pass the selected suggestion. Only the coordinates.
    // This lets us use the selected suggestion.
    let originalSuggestionMethiod = this.cesiumViewer.geocoder.viewModel.activateSuggestion
    this.cesiumViewer.geocoder.viewModel.activateSuggestion = (data) => this.overrideGeocoderActivateSuggestion(data, originalSuggestionMethiod);
    // This disables the default behavior of flying to the selected suggestion
    // This method does not have access to the select suggestion probably due to some Cesium bugs (GeocoderVieiwModel should have selectedSuggestion populated but doesn't)
    this.cesiumViewer.geocoder.viewModel.destinationFound = () => console.log('fly to disabled');

    this.cesiumViewer.trackedEntityChanged.addEventListener((event)=>{
      this.isEntityBeingTracked = event !== undefined && event !== null;      
    });

    this.cesiumViewer.selectedEntityChanged.addEventListener((event)=>{
      if(event && event.acEntity && event.acEntity.type == "Marker" && this.outMarkerClick){
        this.outMarkerClick.emit(parseInt(event.acEntity.id));
      }
    });

    // wait for afterViewInit before running the first ngOnChanges
    if (this.reRunChanges) {
      this.ngOnChanges(this.reRunChanges)
      this.reRunChanges = undefined
    }

  }

  setTimezoneFormat(){
    this.cesiumViewer.animation.viewModel.timeFormatter = function(date) {
      let dateTime: Date   = JulianDate.toDate(date);
      let options: any = {};
      options.timeZoneName = "short";
      options.hour12 = true;
      return dateTime.toLocaleTimeString('en',options);      
    };

    this.cesiumViewer.timeline.makeLabel = function(time) {
      let dateTime: Date   = JulianDate.toDate(time);
      let options: any = {};
      options.timeZoneName = "short";
      options.hour12 = true;
      return dateTime.toLocaleString('en',options);      
    }
  }

  stopTrackingEntity(){
    this.cesiumViewer.trackedEntity = null;
  }

  // Helper method to convert FontAwesome angular component to a svg string
  // Store the svg in a map so we don't have to regenerate the svg
  svgMap = new Map<any, string>()
  createBinarySVG(icon, markerColor) {
    let svg = this.createSVGForFontAwesome(icon);
    const parser = new DOMParser();
    let svgXML = parser.parseFromString(svg, 'text/xml');
    let svgTag = svgXML.getElementsByTagName('svg')[0];
    svgTag.setAttribute('style', 'color: ' + markerColor + ';');
    const serilaizer = new XMLSerializer();
    svg = serilaizer.serializeToString(svgXML);
    let svgFinal = 'data:image/svg+xml;base64,' + btoa(svg);
    return svgFinal;
  }

  // Actual code to pull svg from FontAwesome
  createSVGForFontAwesome(icon) {
    if (this.svgMap.has(icon)) {
      return this.svgMap.get(icon);
    }
    const factory = this.resolver.resolveComponentFactory(FaIconComponent);
    const component = factory.create(this.injector);
    component.instance.icon = icon;
    component.instance.render();
    component.destroy();
    let svg = (component.instance.renderedIconHTML as any).changingThisBreaksApplicationSecurity;
    this.svgMap.set(icon, svg);
    return svg;
  }

  // Create a cesium marker with a fontAwesome icon
  createPin(icon, markerColor, color) {
    let pinBuilder = new PinBuilder();
    let pinIcon = pinBuilder.fromUrl(this.createBinarySVG(icon, color), Cesium.Color.fromCssColorString(markerColor), 32);
    return pinIcon;

  }

  getCartographicString(cartesian){
    let cartographic = Cesium.Cartographic.fromCartesian(cartesian);
    let longitudeString = Cesium.Math.toDegrees(
      cartographic.longitude
    );
    let latitudeString = Cesium.Math.toDegrees(
      cartographic.latitude
    );

    return "Lat: " +
    ("   " + latitudeString) +
    "\u00B0"+"<br>"+
    "Lon: " +
    ("   " + longitudeString) +
    "\u00B0" + "<br>"+    
    "Alt: " +
    ("   " + cartographic.height);
  }




  

  mapSetupMovement(){
    // There is a bug in the ContextMenuService/MapEventsManager where the default left click to select entities option gets overwritten
    let savedLeftClickAction = this.cesiumViewer.screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.LEFT_CLICK);
    this.acMap.getMapEventsManager().register({event: CesiumEvent.LEFT_CLICK}).subscribe((event)=>{
      savedLeftClickAction(event.movement)
    })
    

    const downMovementRegistration: EventRegistrationInput = {
      event: CesiumEvent.LEFT_DOWN, // event type enum. [required!]
      // modifier: CesiumEventModifier.SHIFT, // event modifier enum. [optional]
      pick: PickOptions.PICK_ONE, // entity pick option, default PickOptions.NO_PICK. [optional]
      pickFilter: (entity) => {                 
        return entity && this.movableObject && entity.id == this.movableObject.id
      },
      entityType: AcEntity
    };
    this.acMap.getMapEventsManager().register(downMovementRegistration).subscribe((result) => {
      this.cameraMotionEnabled(false)
      this.moving = true;

    });

    const upMovementRegistration: EventRegistrationInput = {
      event: CesiumEvent.LEFT_UP, // event type enum. [required!]
      // modifier: CesiumEventModifier.SHIFT, // event modifier enum. [optional]
      pick: PickOptions.NO_PICK, // entity pick option, default PickOptions.NO_PICK. [optional]      
    };
    this.acMap.getMapEventsManager().register(upMovementRegistration).subscribe((result) => {      
      if(this.moving){
        this.cameraMotionEnabled(true)
        this.moving = false;
        this.cesiumViewer.entities.remove(this.planeObject);
        this.planeObject = undefined;
        
        if(this.outCreateMarker && this.movableObject.id != "CreatedMarker"){
          let carto = Cesium.Cartographic.fromCartesian(this.movableObject.position )
          let marker = {
            pose: {
              coordinates: [Cesium.Math.toDegrees(carto.longitude), Cesium.Math.toDegrees(carto.latitude)], 
              elevation: carto.height, 
              heading: 0
            },
            eventId:  this.movableObject.id, 
            type: this.movableObject.type
          }
          this.outCreateMarker.emit({marker:marker,mapName:'',updateMarker:true});
        }

        this.movableObject = undefined;
      }
    });

    const movingMovementRegistration: EventRegistrationInput = {
      event: CesiumEvent.MOUSE_MOVE, // event type enum. [required!]
      // modifier: CesiumEventModifier.SHIFT, // event modifier enum. [optional]
      pick: PickOptions.NO_PICK, // entity pick option, default PickOptions.NO_PICK. [optional]      
    };
    this.acMap.getMapEventsManager().register(movingMovementRegistration).subscribe((result) => {
      if(this.moving) {         
        let intersection;
        if(this.planeNormal){        
          let ray = this.cesiumViewer.camera.getPickRay(result.movement.endPosition);
          intersection = Cesium.IntersectionTests.rayPlane(ray,this.planeNormal);
        } else {         
          // pickPosition is buggy
          // Issues: if used after drillPick returns wrong height
          // If selecting the ground/ellipsoid returns wrong height
          // Otherwise will return a position of at the correct height of the model or tileset 
          intersection = this.cesiumViewer.scene.pickPosition(result.movement.startPosition);         
          let picks = this.cesiumViewer.scene.drillPick(result.movement.startPosition);
          let noTileSetFound = true;
          for(let pick of picks){
            if(pick.tileset || pick.primitive == this.currentTileset){
              noTileSetFound = false;
            }
          }          
          if(noTileSetFound){
            intersection = this.cesiumViewer.camera.pickEllipsoid(result.movement.startPosition);
          } 

        }
        if(intersection != undefined){
          let carto = Cesium.Cartographic.fromCartesian(intersection )
          if(carto.height > 10000 || carto.height < -10) {
            console.log("Elevation too large or small: Marker not moved")
            this.movableObject.position = this.startPosition;
          } else {
            this.movableObject.position = intersection;    
          }      
          let acnote = {
            id: this.movableObject.id,
            actionType: ActionType.ADD_UPDATE,
            entity: this.movableObject
          } as AcNotification;
          if(this.movableObject.type == "Marker"){
            this.markerSubject.next(acnote);
          } else if(this.movableObject.type == "Entity"){
            this.entitiesSubject.next(acnote);
          }
        }
      }
    });
  }

  mapClickEnableMovement(axis, clickedEntity) {

    
      if(clickedEntity == null || clickedEntity == undefined ||
        clickedEntity.position.x == undefined ||
        clickedEntity.position.y == undefined ||
        clickedEntity.position.z == undefined) {
        // We have clicked on nothing or object without a static position
        return;
      }

      if(this.planeObject != undefined){
        this.cesiumViewer.entities.remove(this.planeObject);
        this.planeObject = undefined;
      }

      this.movableObject = clickedEntity;
      this.startPosition = clickedEntity.position;
      if(axis == undefined){
        // moving object along ground or model
        // draw a white circle on the ground to show movement area
        let entity = new Cesium.Entity({
          position: clickedEntity.position,
          ellipse: {

            semiMinorAxis: 50.0,
            semiMajorAxis: 50.0,
            HeightReference: HeightReference.CLAMP_TO_GROUND,
            material: Cesium.Color.WHITE.withAlpha(0.1),
            outline: true,
            outlineColor: Cesium.Color.WHITE
          },
        });

        this.planeNormal = undefined;
        this.planeObject = this.cesiumViewer.entities.add(entity);
      } else {
        // moving object along a 2d plane
        // draw a white plane in that axis
        
        let entity = new Cesium.Entity({
          position: clickedEntity.position,
          plane: {
            dimensions: new Cesium.Cartesian2(50.0,50.0),
            material: Cesium.Color.WHITE.withAlpha(0.1),
            plane: axis,
            outline: true,
            outlineColor: Cesium.Color.WHITE
          },
        });

        // find the planeNormal for intersection computation
        // must be moved to the entity frame location
        let computedNormal = Matrix4.multiplyByPointAsVector(entity.computeModelMatrix(),axis.normal, new Cartesian3());
        Cartesian3.normalize(computedNormal,computedNormal);
        this.planeNormal = Cesium.Plane.fromPointNormal(clickedEntity.position, computedNormal);
        this.planeObject = this.cesiumViewer.entities.add(entity);
      }
    
  }

  cameraMotionEnabled(state) {
    this.stopTrackingEntity();
    this.cesiumViewer.scene.screenSpaceCameraController.enableRotate = state;
    this.cesiumViewer.scene.screenSpaceCameraController.enableZoom = state;
    this.cesiumViewer.scene.screenSpaceCameraController.enableLook = state;
    this.cesiumViewer.scene.screenSpaceCameraController.enableTilt = state;
    this.cesiumViewer.scene.screenSpaceCameraController.enableTranslate = state;
  }



  mapClickCreateMarkerEvents(event) {

      
      // If we clicked on the ground use pickEllipsoid
      // If we clicked on a cesium model or 3dtiles use pickPosition
      // NOTE: pickPosition returns inconsistent results when clicking the ground
      let point: Cartesian3;
      if(event.cesiumEntities == null){
        point = this.cesiumViewer.camera.pickEllipsoid(event.movement.startPosition);
      } else {
        point = this.cesiumViewer.scene.pickPosition(event.movement.startPosition);
      }

      if(this.outCreateMarker) {
        let carto = Cesium.Cartographic.fromCartesian(point )
        let date = JulianDate.toDate(this.cesiumViewer.clock.currentTime);
        let marker = {
          pose: {
            coordinates: [Cesium.Math.toDegrees(carto.longitude), Cesium.Math.toDegrees(carto.latitude)], 
            elevation: carto.height, 
            heading: 0
          },
          eventId: 'CreatedMarker', 
          type: 'Marker'}
        if(date.getTime() <= Date.now()){
          marker['startDate'] = date.toISOString();
        }
        this.outCreateMarker.emit({marker:marker,mapName:''})
      } else {
        this.markerSubject.next(this.createMarker(this.cesiumViewer.clock.currentTime.toString(), '#ffa500', point, 'CreatedMarker', 'question-circle', '#FFFFFF', "Created Marker"));
      }

  }

  // NOTE all uses of highlightRanges are undocumented features of CESIUM subject to change if CESIUM cleans up the timeline module
  // On the Cesium timeline show a highlight at this time. The highlight will range TIMELINE_HIGHLIGHT_LENGTH_SEC
  // If TIMELINE_HIGHLIGHT_LENGTH_SEC is too small and the timeline is zoomed out the highlight is not visible
  // Too large and highlights will overlap
  TIMELINE_HIGHLIGHT_LENGTH_SEC = 30
  addHighlight(startDate, color) {
    let range = this.cesiumViewer.timeline.addHighlightRange(color, 200);
    let trackPointStop = Cesium.JulianDate.addSeconds(startDate, this.TIMELINE_HIGHLIGHT_LENGTH_SEC, new Cesium.JulianDate());
    range.setRange(startDate, trackPointStop)
    this.cesiumViewer.timeline._lastHeight = undefined;
    this.cesiumViewer.timeline.resize()
  }

  // NOTE all uses of highlightRanges are undocumented features of CESIUM subject to change if CESIUM cleans up the timeline module
  // Zoom the timeline to this trials start and end times. If no endtime use 4 hours as a default
  timelineZoom() {
    if (this.trial && this.cesiumViewer) {
      let stopTime;
      if (this.trial.endDatetime && this.trial.endDatetime != null) {
        stopTime = Cesium.JulianDate.fromIso8601(this.trial.endDatetime, new Cesium.JulianDate());
      } else {
        stopTime = Cesium.JulianDate.fromIso8601(this.trial.startDatetime, new Cesium.JulianDate())
        Cesium.JulianDate.addHours(stopTime, 4, stopTime);
      }
      this.cesiumViewer.clock.currentTime = stopTime;      
      this.cesiumViewer.timeline.zoomTo(Cesium.JulianDate.fromIso8601(this.trial.startDatetime, new Cesium.JulianDate()), stopTime);
      // Global endtime of 10 days past default endtime. Certain map elements will disappear from map after this time
      this.endtime = Cesium.JulianDate.addDays(stopTime, 10, new Cesium.JulianDate());      

      // Remove all highlights if changing trial
      while (this.cesiumViewer.timeline._highlightRanges.length > 0) {
        this.cesiumViewer.timeline._highlightRanges.pop();
      }
    }
  }

  styleInit() {
    if (this.cesiumViewer) {
      var imageryViewModels = [];
      for (let style of this.styles) {

        imageryViewModels.push(new Cesium.ProviderViewModel({
          name: style.name,
          iconUrl: '',
          tooltip: '',
          // This function executes when changing the map view
          // Currently displaying different tilesets based on view
          creationFunction: () => {
            // Create rectangle area that defines the home button
            let zoomOffest = 360 / Math.pow(2, style.zoom);
            var extent = Cesium.Rectangle.fromDegrees(style.lng - zoomOffest, style.lat - zoomOffest, style.lng + zoomOffest, style.lat + zoomOffest);
            Cesium.Camera.DEFAULT_VIEW_RECTANGLE = extent;

            this.cesiumViewer.scene.primitives.remove(this.currentTileset)
            let tilesetUrl = undefined
            let tileTranslation = undefined
            let isModel = false;

            // Populate the translation and tiles from the database
            if (style.tileUrl) {
              tilesetUrl = style.tileUrl
            }

            if (style.type == "ident") {
              tileTranslation = Matrix4.IDENTITY;
            } else if (style.type == "model") {
              isModel = true;
              let startPos = Cartesian3.fromDegrees(style.lng, style.lat, 50);
              tileTranslation = Cesium.Transforms.localFrameToFixedFrameGenerator(style.modelTrans1, style.modelTrans2)(startPos);
            } else if (style.type == "offset") {
              let startPos = Cartesian3.fromDegrees(style.lng, style.lat, 50);
              tileTranslation = Cesium.Transforms.localFrameToFixedFrameGenerator(style.modelTrans1, style.modelTrans2)(startPos);
            }

            if (tilesetUrl && tileTranslation) {
              if (isModel) {
                this.currentTileset = new Cesium.Model.fromGltf({
                  url: tilesetUrl,
                  modelMatrix: tileTranslation,
                  shadows: ShadowMode.DISABLED
                });
              } else {
                this.currentTileset = new Cesium.Cesium3DTileset({
                  url: tilesetUrl,
                  modelMatrix: tileTranslation,
                  maximumMemoryUsage: 256,
                  maxiumScreenSpaceError: 500,
                  shadowMode: ShadowMode.DISABLED,
                  // debugShowGeometricError: true,
                  // debugShowBoundingVolume: true,
                  // debugShowContentBoundingVolume: true,
                  // debugShowRenderingStatistics: true
                  dynamicScreenSpaceError: true,
                });
              }

              let tilesetPromise = this.cesiumViewer.scene.primitives.add(this.currentTileset);
              tilesetPromise.readyPromise.then(() => {
                console.log('tileset loaded:' + tilesetUrl);
              });

              tilesetPromise.initialTilesLoaded.addEventListener(() => {
                // reload agents for clamping to ground
                this.loadAgents();
              });

            }


            // Some tile sets need to have offset and translations from the markers, entities, and agents
            // This sets those variables from the server params and forces a reload of those items
            if (style.reload == "true") {
              let startPos = Cartesian3.fromDegrees(style.lng, style.lat, 50);
              this.translation = Cesium.Transforms.localFrameToFixedFrameGenerator(style.trans1, style.trans2)(startPos);
              this.offset = new Cartesian3(style.x, style.y, style.z);

              if (this.entities) {
                this.loadEntities()
              }
              if (this.agents) {
                this.loadAgents()
              }
              if (this.markers) {
                this.loadMarkers()
              }

            }

            return new Cesium.UrlTemplateImageryProvider({
              url: style.url
            });
          }
        })
        );
      }
      let terrainViewModels = [];
      terrainViewModels.push(new Cesium.ProviderViewModel({
        name: "WGS84 Ellipsoid",
        iconUrl: "",
        tooltip: '',
        creationFunction: function () {

          return new Cesium.EllipsoidTerrainProvider();
        }
      })
      );
      // For testing purposes only to show what the terrain features would be
      terrainViewModels.push(new Cesium.ProviderViewModel({
        name: "MapTiler World Terrain (online only)",
        iconUrl: "",
        tooltip: '',
        creationFunction: function () {

          return new Cesium.CesiumTerrainProvider({
            url: 'https://api.maptiler.com/tiles/terrain-quantized-mesh/?key=m9PCHM95a3IBVdpHJnTj',
            requestVertexNormals: true
          });
        }
      })
      );
      this.cesiumViewer.baseLayerPicker.viewModel.imageryProviderViewModels = imageryViewModels;
      this.cesiumViewer.baseLayerPicker.viewModel.terrainProviderViewModels = terrainViewModels;
      // Which imagery to show by default
      this.cesiumViewer.baseLayerPicker.viewModel.selectedImagery = imageryViewModels[1];
    }
  }

  // Hack
  // Helper method to override and extend internal method. Second parameter is the originalMethod
  overrideGeocoderActivateSuggestion(data, originalMethod) {
    this.selectEntity(data.displayName);
    originalMethod(data);
  }

  // Select an entity to display on the CesiumViewer 
  // entityName must match the 'name' property of an entity under an ac-layer with the #ACLayers tag
  selectEntity(entityName) {
    console.log(entityName);
    for (let layer of this.acLayers) {
      for (let desc of layer.getLayerService().getDescriptions()) {
        if (desc.getCesiumObjectsMap().has(entityName)) {
          this.cesiumViewer.selectedEntity = desc.getCesiumObjectsMap().get(entityName);
          return;
        }
      }
    }
  }

  ngOnChanges(changes: SimpleChanges) {

    // wait for afterViewInit before running the first ngOnChanges
    // afterViewInit inits the cesiumViewer
    if (!this.cesiumViewer) {
      this.reRunChanges = changes;
      return;
    }

    // Resets the timeline range and clears any highlights
    if (changes.trial && changes.trial.currentValue) {
      this.timelineZoom()
    }

    // Sets up the layer selection options
    if (changes.styles && changes.styles.currentValue) {
      this.styleInit();
    }


    if (changes.entities && changes.entities.currentValue && this.entities.length > 0) {      
      this.loadEntities();
      this.removePreviousEntities(changes.entities);
    }

    if (changes.agents && changes.agents.currentValue && this.agents.length > 0) {
      this.loadAgents();
      this.removePreviousAgents(changes.agents);
    }

    if (changes.markers && this.markers) {
      this.loadMarkers();
      this.removePreviousMarkers(changes.markers);
    }

  }

  // Use this method for translating marker coordinates eg. Virtual compititon coordiante frames 
  getPoseWorldCoordinate(pose: Pose): Cartesian3{
    let pos: Cartesian3;
    pos = Cartesian3.fromDegrees(pose.coordinates[0], pose.coordinates[1], pose.elevation);
    return pos;
  }

  removePreviousEntities(change: SimpleChange){
    if(change.previousValue && change.previousValue.length > 0){
      this.removePrevious(
        (<Marker[]>change.previousValue).map( x => x.metadata.description.toString()),
        (<Marker[]>change.currentValue).map( x => x.metadata.description.toString()),
        this.entitiesSubject
      );
    }
  }

  removePreviousAgents(change: SimpleChange){
    if(change.previousValue && change.previousValue.length > 0){
      this.removePrevious(
        (<Entity[]>change.previousValue).map( x => x.name),
        (<Entity[]>change.currentValue).map( x => x.name),
        this.agentSubject
      );
    }
  }

  removePreviousMarkers(change: SimpleChange){
    if(change.previousValue && change.previousValue.length > 0){
      this.removePrevious(
        (<Marker[]>change.previousValue).map( x => x.eventId.toString()),
        (<Marker[]>change.currentValue).map( x => x.eventId.toString()),
        this.markerSubject
      );
    }
  }

  removePrevious(previousId: String[], currentId: String[], subjectStream: Subject<AcNotification>) {
    // Filter out all values from the previousIds that exists in the currentIds
    let idsToRemove: String[] = previousId.filter(val => !currentId.includes(val));
    if(idsToRemove.length > 0){
      let idsToRemoveNotifications: AcNotification[] = idsToRemove.map(id=>{
        return (<AcNotification>{
          id: id,
          actionType: ActionType.DELETE
        });
      });
      for(let note of idsToRemoveNotifications){
        subjectStream.next(note);
      }
    }
  }

  loadEntities() {
    of(...this.entities).pipe(map(entityMarker => {
      
      let pos = this.getPoseWorldCoordinate(entityMarker.pose);

      let entityJson = {
        id: entityMarker.metadata.description.toString(),
        position: pos,
        image: this.createBinarySVG(entityMarker.pointStyle.icon, entityMarker.pointStyle.marker_color),
        height: 2,
        width: 2,
        scale: .1,
        heightRef: HeightReference.NONE,
        type: "Entity"
      };
      this.geocoder.addEntity(entityJson);
      this.entityPositionMap.set(entityMarker.metadata.description.toString(),pos);

      let acentity = new AcEntity(entityJson)
      // Info displayed for entity when selected
      let detailCallback = new Cesium.CallbackProperty(() => {
        return this.getCartographicString(acentity["position"]) ;
      })

      acentity["detail"] = detailCallback;
      return ({
        id: entityMarker.metadata.description.toString(),
        actionType: ActionType.ADD_UPDATE,
        entity: acentity
      });
    }),
      filter(data => data != undefined)).subscribe(x => {        
        this.entitiesSubject.next(x);
      });
  }

  getMinPose(poses: Pose[]) : Pose{
    let minPose = poses[0];
    for(let pose of poses){
      if(minPose.timestamp > pose.timestamp){
        minPose = pose;
      }
    }
    return minPose;
  }


  // isAgentCopter(agent:Entity){
  //   // TODO more detailed determinator between flying and ground vehicles
  //   return agent.name.includes('Multirotor');
  // }

  loadAgents() {
    of(...this.agents).pipe(map(agentMarker => {
      if (agentMarker.allPoses.length == 0 && agentMarker.pointStyle.icon) {
        return undefined
      }
      // This is code specific to a specific scenario
      // For when the flying entities need their elevation offset by a specific degree to match the model

      // let copter:Boolean = this.isAgentCopter(agentMarker);
      // let copterOffset = undefined;
      // let clampToGround = false;
      // if(copter){
      //   // assuption copter elevation is 0 during startup
      //   // all future elevations are based off this start location offset
      //   let minPose = this.getMinPose(agentMarker.allPoses);
      //   let startingCart: Cartographic = Cartographic.fromCartesian(this.getPoseWorldCoordinate(minPose));
      //   copterOffset = this.cesiumViewer.scene.sampleHeight(startingCart) - minPose.elevation;        
      // } else {
      //   // clamp ground vehicles to ground        
      //   // TODO: comment bellow line if using cave data to demo
      //   clampToGround = true;
      //   // Note for clampToGround to work on a tileset the tileset must be loaded
      // }



      let entityJson = {
        id: agentMarker.name,
        image: this.createBinarySVG(agentMarker.pointStyle.icon, agentMarker.pointStyle.marker_color),
        height: 32,
        width: 32,
        heightRef: HeightReference.NONE,
      };

      this.geocoder.addEntity(entityJson);


      let posProp = new Cesium.SampledPositionProperty();
      let detailProp = new Cesium.TimeIntervalCollectionProperty();
      let orientationProp = new Cesium.SampledProperty(Cesium.Quaternion);

      detailProp.backwardExtrapolationType = Cesium.ExtrapolationType.HOLD;
      detailProp.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD;
      posProp.backwardExtrapolationType = Cesium.ExtrapolationType.HOLD;
      posProp.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD;

      for (let pose of agentMarker.allPoses) {
        // if(copterOffset){
        //   pose.elevation += copterOffset;
        // }        
        let pos = this.getPoseWorldCoordinate(pose);

        // if(clampToGround){
        //   pos = this.cesiumViewer.scene.clampToHeight(pos)
        // } 
        let time = Cesium.JulianDate.fromIso8601(pose.timestamp, new Cesium.JulianDate());
        posProp.addSample(time, pos);
        // Store the actual coordinates for later display
        detailProp.intervals.addInterval(
          new Cesium.TimeInterval({
            start: time,
            stop: time,
            data: "Source:"+pose.coordinates[0] + "," + pose.coordinates[1] + "," + pose.elevation 
          })
        )
        orientationProp.addSample(time, Cesium.Transforms.headingPitchRollQuaternion(pos, new Cesium.HeadingPitchRoll(pose.heading, 0, 0)));
      }

      if (agentMarker.pointStyle.animation) {
        entityJson["uri"] = agentMarker.pointStyle.animation;
        entityJson["scale"] = agentMarker.pointStyle.scale_factor
        // First argument is near number (if nearer than this distance don't display)
        // Second argument is far number (if futher than this distance don't display)
        entityJson["distanceFar"] = new Cesium.DistanceDisplayCondition(0, 1000)
        entityJson["distanceClose"] = new Cesium.DistanceDisplayCondition(1000)
      } else {        
        // do not display a model object as there is no model
        entityJson["uri"] = ''
        entityJson["scale"] = 1
        entityJson["distanceFar"] = new Cesium.DistanceDisplayCondition()
        entityJson["distanceClose"] = new Cesium.DistanceDisplayCondition(0,0)
      }
      entityJson["position"] = posProp;
      entityJson["orientation"] = orientationProp;
      // Camera default reposition for when an entity becomes focused on by the viewer
      entityJson["cameraZoomView"] = new Cartesian3(0, 0, 20);

      entityJson["type"] = "agent";
      let acentity = new AcEntity(entityJson)
      // What to display in the description popup when the entity is selected
      let detailCallback = new Cesium.CallbackProperty((time) => {
        return  this.getCartographicString(acentity["position"].getValue(time)) + 
        "<br>" + this.getIntervalPropertyData(detailProp,time) + 
        "<br>"+ this.findClosestEntity(acentity["position"].getValue(time));
      })
      acentity["detail"] = detailCallback;

      return ({
        id: agentMarker.name,
        actionType: ActionType.ADD_UPDATE,
        entity: acentity
      });
    }),
      filter(data => data != undefined)).subscribe(x =>
        this.agentSubject.next(x));
  }

  // Helper method for CESIUM
  // Will find data out of a TimeIntervalCollectionProperty that have a single time instance
  // Existing functions only return data with a time range
  getIntervalPropertyData(interalCollection, time){
    let detailIndex = interalCollection.intervals.indexOf(time);
    // indexOf returns bitwise not closest value if not an exact match
    if( detailIndex < 0){
      detailIndex = ~detailIndex;
    }

    // the index points to the next time needs to be the previous
    detailIndex -= 1;

    if( detailIndex >= interalCollection.intervals.length){
      detailIndex = interalCollection.intervals.length - 1;
    } else if (detailIndex < 0) {
      detailIndex = 0;
    }

    let previousInterval = interalCollection.intervals.get(detailIndex);
    let newTime = previousInterval.start;

    let diff = JulianDate.secondsDifference(time,newTime);
    let timeString: String;
    if(diff < 0) {
      timeString = "First Report in "
      diff = -1*diff
    } else {
      timeString = "Last Report ";
    }    
    if( diff > 86400) {
      let days = Math.trunc(diff/86400);
      diff = diff - days*86400;
      timeString += days + " d ";      
    }
    if( diff > 3600) {
      let hours = Math.trunc(diff/3600);
      diff = diff - hours*3600;
      timeString += hours + " h ";      
    }
    if( diff > 60) {
      let min = Math.trunc(diff/60);
      diff = diff - min*60;
      timeString += min + " m ";      
    }
    timeString += diff.toFixed(2) + " s ";

    return interalCollection.getValue(newTime) + "<br>" + timeString;
  }

  findClosestEntity(position: Cartesian3): String{
    let closestEntry;
    let closestDistance = undefined;
    for(let entry of this.entityPositionMap.entries()){
      // distanceSquared is more efficient than distance
      let distance = Cartesian3.distanceSquared(position,entry[1])
      if(closestDistance == undefined){
        closestDistance = distance;
        closestEntry = entry;
      } else if(distance < closestDistance){
        closestDistance = distance;
        closestEntry = entry;
      }
    }
    
    return "Closest Entity:"+closestEntry[0] + "<br>" +
           "Distance:" + Cartesian3.distance(position,closestEntry[1]).toFixed(3) + "m";
  }

  createMarker(startTimeISO: String, markerColor: String, position: Cartesian3, markerId: String, icon: String, iconColor: String, details): AcNotification {

    let startTime = Cesium.JulianDate.fromIso8601(startTimeISO, new Cesium.JulianDate())
    this.addHighlight(startTime, markerColor)
    // Five years after startTime
    let end = Cesium.JulianDate.addDays(startTime, 1825, new Cesium.JulianDate());      
    let interval = new Cesium.TimeInterval({
      start: startTime,
      stop: end
    });
    var arr = [interval];
    let availabilityProp = new Cesium.TimeIntervalCollection(arr);

    let entityJson = {
      avail: availabilityProp,
      id: markerId,
      position: position,
      image: this.createPin(icon, markerColor, iconColor),
      height: 32,
      width: 32,
      scale: .1,
      heightRef: HeightReference.NONE,
      type: "Marker",
      detail: undefined
    };
    this.geocoder.addEntity(entityJson);

    let acEntity = new AcEntity(entityJson);

    let detailCallback = new Cesium.CallbackProperty(() => {
      return details + "<br>" + this.getCartographicString(acEntity["position"]) ;
    })

    acEntity["detail"] = detailCallback;
    return (
      {
        id: markerId,
        actionType: ActionType.ADD_UPDATE,
        entity: acEntity
      } as AcNotification
    );
  }

  loadMarkers() {
    of(...this.markers).pipe(
      map(entityMarker => {

        let position = this.getPoseWorldCoordinate(entityMarker.pose);
        let details = JSON.stringify(entityMarker.metadata, null, 2);
        
        return this.createMarker(
          entityMarker.startTime.toISOString(),
          entityMarker.pointStyle.marker_color,
          position,
          entityMarker.eventId.toString(),
          entityMarker.pointStyle.icon,
          entityMarker.pointStyle.color,
          details)
      }
      ),
      filter(data => data != undefined)
    ).subscribe(x =>
      this.markerSubject.next(x)
    );
  }


  // clean up
  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

}

