import { Component } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { Event} from 'cesium'
import { CesiumInstanceComponent } from './cesium-instance.component';
import { Entity, Marker, Pose } from 'src/app/shared/models';


class MockCesiumViewer{
  animation:any;
  timeline:any;
  screenSpaceEventHandler:any;
  geocoder:any;
  baseLayerPicker:any;
  trackedEntityChanged:Event;
  scene:any;
  entities:any;
  selectedEntityChanged:Event;
  constructor(){
    this.animation = {
      viewModel: { 
        timeFormatter: null
      }};
    this.timeline = {
      makeLabel: null
    };

    this.screenSpaceEventHandler = {
      getInputAction: () => { return () => {}}
    };

    this.geocoder = {
      viewModel: {
        activateSuggestion: () => {},
        destinationFound: () => {},
      }
    };
    this.baseLayerPicker = {
      viewModel: {
        imageryProviderViewModels: null,
        terrainProviderViewModels: null,
        selectedImagery: null,
      }
    };

    this.trackedEntityChanged = new Event();
    this.selectedEntityChanged = new Event();

    this.scene = {
      screenSpaceCameraController: {
        enableRotate: false,
        enableZoom: false,
        enableLook: false,
        enableTilt: false,
        enableTranslate: false,
      },
      clampToHeight: (pos) => { return pos;},
      primitives: {
        remove: () => {}
      }
    };

    this.entities = {
      remove: () => {}
    }
    
  }
}

class MockMapEventsManager{
  register(){
    return {
      subscribe: () => {}
    };
  }
}

@Component({
  selector: 'ac-map',
  template: ''
})
class MockAcMapComponent{ 
  getCesiumViewer(){
    return new MockCesiumViewer();
  }

  getMapEventsManager(){
    return new MockMapEventsManager();
  }

}

describe('CesiumInstanceComponent', () => {
  let component: CesiumInstanceComponent;
  let fixture: ComponentFixture<CesiumInstanceComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ 
        CesiumInstanceComponent,
        MockAcMapComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CesiumInstanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.outCreateMarker = undefined;
    component.svgMap.set('car','<svg></svg>');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('agents loaded and searchable', (done: DoneFn) => {
    component.agents = [
      <Entity>{
        allPoses: [
          <Pose>{
            elevation: 1,
            coordinates: [10,10],
            heading: 0,
            timestamp: '2018-09-22T07:00:10.500000-07:00'
          }
        ],
        name: "mockAgent",
        pointStyle: {
          marker_color: "Green",
          icon: "car"
        }      
      },
      <Entity>{
        allPoses: [
          <Pose>{
            elevation: 2,
            coordinates: [20,20],
            heading: 30,
            timestamp: '2019-09-22T07:00:10.500000-07:00'
          }
        ],
        name: "mock place num2",
        pointStyle: {
          marker_color: "Green",
          icon: "car"
        }      
      }
    ];
    component.loadAgents();
    console.log(component.agents)
    component.geocoder.geocode("Age").then((results:any)=>{
      expect(results.length).toEqual(1);
      expect(results[0].displayName).toEqual("mockAgent");
      done();
    });

    component.geocoder.geocode("mock").then((results:any)=>{
      expect(results.length).toEqual(2);   
      done();   
    });   

  })

  it('entities loaded and searchable', (done: DoneFn) => {
    component.entities = [
      <Marker>{
        pose: <Pose>{
          elevation: 1,
          coordinates: [10,10],
          heading: 0
        },
        metadata: {
          description: "Bat"
        },
        pointStyle: {
          marker_color: "Green",
          icon: "car"
        }      
      },
      <Marker>{
        pose: <Pose>{
          elevation: 2,
          coordinates: [20,20],
          heading: 0
        },
        metadata: {
          description: "Rat"
        },
        pointStyle: {
          marker_color: "Green",
          icon: "car"
        }      
      }
    ];

    component.entitiesSubject.subscribe()
    component.loadEntities();
    component.geocoder.geocode("Ba").then((results:any)=>{
      expect(results.length).toEqual(1);
      expect(results[0].displayName).toEqual("Bat");
      done();
    });

    component.geocoder.geocode("at").then((results:any)=>{
      expect(results.length).toEqual(2);      
      done();
    });   


  })
});
