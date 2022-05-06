import { Component } from '@angular/core';
import { BasicContextMenu } from 'angular-cesium';

export interface ContextMenuData {
  items: MenuItem[];
  name?: String;
  entity?: any;
  close: () => void;
}

export interface MenuItem {
  name: String;
  onActionClick: (entity) => void;
}


@Component({
  templateUrl: './cesium-context-menu.component.html',  
  styleUrls: ['./cesium-context-menu.component.scss'],
  selector: 'cesium-context-menu',
})
export class CesiumContextMenuComponent implements BasicContextMenu {
  data: ContextMenuData; // data will be injected from the ContextMenuService.open()
}
