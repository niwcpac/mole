/*

import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { MapInstanceComponent } from './map-instance.component';
import { Marker, MapFocus } from '../../../models';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
describe('MapBoxComponent', () => {
  let componentWrapper: TestComponent;
  let component: MapInstanceComponent;
  let fixture: ComponentFixture<TestComponent>;
  let de: DebugElement;
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MapInstanceComponent, TestComponent ]
    })
      .compileComponents();
  }));
  beforeEach(() => {
    fixture = TestBed.createComponent(TestComponent);
    componentWrapper = fixture.componentInstance;
    de = fixture.debugElement.query(By.directive(MapInstanceComponent));
    component = de.componentInstance;
    fixture.detectChanges();
  });
  afterEach(() => {
    // Hack so if you are viewing through the test page the map is visibile
    // Map visibility is one of the tricky things for mapbox
    let mapDiv = de.queryAll(By.css('.mapboxgl-map'));
    mapDiv[0].styles.height="50vh";
  });
  it('should create', () => {
    expect(component).toBeTruthy();
  });
  describe('markers', () => {
      it('add', () => {
        let markerMap = [
          createMarker(1,2,1,'fa-crosshairs'),
          createMarker(3,4,2,'fa-crosshairs'),
          createMarker(5,6,3,'fa-crosshairs')];
        componentWrapper.markers = markerMap;
        fixture.detectChanges();
        expect(componentWrapper.markers).toBeDefined();
        // check that the markers match the values
        expect(component.mapboxMarkers.size).toEqual(3);
        // test that we have the same number of the rendered elements
        let renderedMarkers = de.queryAll(By.css('.mapboxgl-marker'));
        expect(component.mapboxMarkers.size).toEqual(renderedMarkers.length);
      })
      it('update and delete', () => {
        let markers = [
          createMarker(1,2,1,'fa-crosshairs'),
          createMarker(3,4,2,'fa-crosshairs'),
          createMarker(5,6,3,'fa-crosshairs')];
        componentWrapper.markers = markers;
        fixture.detectChanges();
        expect(component.mapboxMarkers.size).toEqual(3);
        expect(component.mapboxMarkers.get(1).markerInstance.getLngLat().lng).toEqual(1);
        expect(component.mapboxMarkers.get(1).markerInstance.getLngLat().lat).toEqual(2);
        markers[0].coordinates = [9,10];
        markers = markers.filter(x => x.eventId !== 2);
        componentWrapper.markers = markers;
        fixture.detectChanges();
        expect(component.markers).toBeDefined();
        // check that the markers match the updated values
        expect(component.mapboxMarkers.size).toEqual(2);
        expect(component.mapboxMarkers.has(2)).toBeFalse();
        // test that we have the same number of the rendered elements
        let renderedMarkers = de.queryAll(By.css('.mapboxgl-marker'));
        expect(component.mapboxMarkers.size).toEqual(renderedMarkers.length);
        // test improvement confirm rendered marker changed
        expect(component.mapboxMarkers.get(1).markerInstance.getLngLat().lng).toEqual(9);
        expect(component.mapboxMarkers.get(1).markerInstance.getLngLat().lat).toEqual(10);
      })
    }
  );
  describe('entities', () => {
      it('add', (done) => {
        // This is an async test
        // For entities the assumption is that the map has been loaded before any entities are loaded
        fixture.detectChanges();
        setTimeout(()=>{
          if(component.map) {
            let markers = [
              createMarker(64.483,53.36,1,'assets/camera.png'),
              createMarker(53.36,64.483,2,'assets/camera.png'),
              createMarker(5,6,3,'assets/camera.png')];
            componentWrapper.sources = ["assets/camera.png"];
            componentWrapper.entities = markers;
            fixture.detectChanges();
            expect(component.entities).toBeDefined();
            expect(component.map.getLayer('entities')).toBeDefined();
            expect(component.map.getSource('entities').serialize().data.features.length).toEqual(3);
            // sanity check
            expect(component.map.getLayer('notALayer')).toBeUndefined();
            done();
          }
        }, 100);
      })
      it('update', (done) => {
        // This is an async test
        // For entities the assumption is that the map has been loaded before any entities are loaded
        fixture.detectChanges();
        setTimeout(()=>{
          if(component.map) {
            let markers = [
              createMarker(64.483,53.36,1,'assets/camera.png'),
              createMarker(53.36,64.483,2,'assets/camera.png'),
              createMarker(5,6,3,'assets/camera.png')];
            componentWrapper.sources = ["assets/camera.png"];
            componentWrapper.entities = markers;
            fixture.detectChanges();
            markers[0].coordinates = [9,10];
            markers = markers.filter(x => x.eventId !== 2);
            componentWrapper.entities = markers;
            fixture.detectChanges();
            expect(component.entities).toBeDefined();
            expect(component.map.getLayer('entities')).toBeDefined();
            expect(component.map.getSource('entities').serialize().data.features.length).toEqual(2);
            expect(component.map.getSource('entities').serialize().data.features[0].geometry.coordinates).toEqual([9,10]);
            // sanity check
            expect(component.map.getLayer('notALayer')).toBeUndefined();
            done();
          }
        }, 100);
      })
    }
  );
  describe('onDemand', () => {
      //TODO tests for on demand markers (marker movement history)
    }
  );
  describe('create marker event', () => {
      //TODO tests for creating a marker
    }
  );
  describe('marker highlight', () => {
      //TODO tests for highlighting a marker
    }
  );
  describe('marker location update', () => {
      //TODO tests for updating marker location
    }
  );
  function createMarker(lat:number,lon:number, id: number, iconString: string): Marker{
    return {
      coordinates: [lat,lon],
      height: .5,
      pointStyle: {
        icon: iconString,
        color: 'white',
        use_marker_pin: true,
        marker_color: 'grey',
        scale_factor: 1,
        animation: 'invert-toggle-3',
        render_as_symbol: false,
        url: null,
        name: null,
        description: null,
        event_types_styled: null,
        entity_types_styled: null
      }, // marker styling
      metadata: {
        popup: "test"
      },
      eventId: id,
      heading: 50
    }
  }
});
@Component({
  template: `<mole-map-instance
              [style]="style"
              [focus]="mapFocus"
              [name]="name"
              [markers]="markers"
              [entities]="entities"
              [sources]="sources"
              (outFocusChage)="mapFocusChange($event)"></mole-map-instance>`
})
class TestComponent {
  mapFocus: MapFocus = {zoom: 0, center: [0,0], pitch: 0, bearing: 0, mapFocus: ""};
  // style: string = "http://localhost:8081/styles/urban_alpha_level1/style.json";
  // style: string = "http://localhost:8081/styles/ne_simple_style/style.json";
  // "glyphs": "http://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
  // "glyphs": "http://localhost::8081/fonts/{fontstack}/{range}.pbf",
  style: any = {"version":8,
    "name":"Empty Style",
    "sources":{
    },
    "sprite":"",
    "glyphs":"http://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
    "layers":[
      { "id":"background",
        "type":"background",
        "paint":{"background-color":"rgba(170, 142, 110, 1)"}
      }
    ]
  };
  name: string = "testName";
  markers: Marker[];
  entities: Marker[];
  sources: String[];
  mapFocusChange(focus:MapFocus){
  }
}

*/
