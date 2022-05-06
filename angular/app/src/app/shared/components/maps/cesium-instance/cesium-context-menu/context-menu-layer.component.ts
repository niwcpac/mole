import { Component, Input, OnInit } from '@angular/core';
import { AcEntity, CesiumEvent, ContextMenuService, CoordinateConverter, MapEventsManagerService, PickOptions } from 'angular-cesium';
import { ContextMenuData, CesiumContextMenuComponent } from './cesium-context-menu.component';


@Component({
  selector: 'context-menu-layer',
  template: ``,
  providers: [CoordinateConverter]
})

export class ContextMenuLayerComponent implements OnInit {
  constructor(private contextMenuService: ContextMenuService,
              private mapEventsManager: MapEventsManagerService,
              private coordinateConverter: CoordinateConverter) {
  }

  @Input() mapClickData;
  @Input() markerClickData; 


  ngOnInit() {    

      this.contextMenuService.onClose.subscribe(()=>{
        
      } );
      this.mapEventsManager
      .register({ event: CesiumEvent.RIGHT_CLICK, pick: PickOptions.PICK_ALL})
      .subscribe(event => {        
        console.log(event)
        
        if(event.entities == null && event.cesiumEntities == null){
          // world click
          this.mapMarker(event);
        } else if(event.entities && event.entities.length == 1 && event.entities[0] == undefined) {
          // model or 3dtiles click
          this.mapMarker(event);
        } else {
          // marker, entity, or agent click
          this.entityMarker(event);  
        }        
      });

  }

  entityMarker(event){
    const position = this.coordinateConverter.screenToCartesian3(event.movement.endPosition);
    if (!position) {
      return;
    }
    let ent = undefined;
    for(let entity of event.entities){
      if(entity instanceof AcEntity ){
        ent = entity;
        if(ent["type"] != "agent"){
          // we don't want to be able to move an agent
          break;
        }
      }
    }

    if(ent == undefined){
      this.mapMarker(event);
    } else if(ent["type"] == "agent") {
      // TODO custom context menu for agents?
      console.log("agents are not movable")
      return;
    }

    this.contextMenuService.open<ContextMenuData>(
      CesiumContextMenuComponent,
      position,
      {
        data: {
          items: this.markerClickData,
          name: ent.id,
          entity: ent,
          close: () => {this.contextMenuService.close();}
        }
      }
    );
  }

  mapMarker(event){
      const position = this.coordinateConverter.screenToCartesian3(event.movement.endPosition);
        if (!position) {
          return;
        }



        this.contextMenuService.open<ContextMenuData>(
          CesiumContextMenuComponent,
          position,
          {
            data: {
              items: this.mapClickData,
              entity: event,
              close: () => {this.contextMenuService.close();}
            }
          }
      );
  }
}