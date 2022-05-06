import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlexLayoutModule } from "@angular/flex-layout";
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { OrderModule } from 'ngx-order-pipe';
import { StartsWithPipe, IncludesSubstrPipe } from './pipes';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { GalleryModule } from  '@ngx-gallery/core';
import { LightboxModule } from  '@ngx-gallery/lightbox';
import { GallerizeModule } from  '@ngx-gallery/gallerize';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { OwlDateTimeModule, OwlNativeDateTimeModule } from 'ng-pick-datetime';
import { RouterModule } from '@angular/router';
import { LuxonModule } from 'luxon-angular';
import {NgPipesModule} from 'ngx-pipes';

import { MoleMatModule } from './molemat.module';
import {
  MapsComponent,
  MapInstanceComponent,
  CesiumInstanceComponent,
  ContextMenuLayerComponent,
  CesiumContextMenuComponent,
  MarkerPopupComponent,
  MarkerComponent,
  TrialCreatorComponent,
  TrialSelectorComponent,
  TimelineComponent,
  TimelineCardComponent,
  EventDialogComponent,
  NotesDialogComponent,
  EventTypeButtonComponent,
  EventCreatorComponent,
  ImageDialogComponent,
  ImageUploadComponent,
  ImageGalleryComponent,
  EventFilterComponent,
  EventFilterFormComponent,
  EventTypeCardsComponent,
  EventTypeCardComponent,
  EventFilterChipsComponent,
  EventFilterChipComponent,

} from "./components";


import { AngularCesiumModule } from 'angular-cesium';
import { AngularCesiumWidgetsModule } from 'angular-cesium'

@NgModule({
  declarations: [
    MapsComponent,
    MapInstanceComponent,
    CesiumInstanceComponent,
    ContextMenuLayerComponent,
    CesiumContextMenuComponent,
    MarkerPopupComponent,
    MarkerComponent,
    TrialCreatorComponent,
    TrialSelectorComponent,
    TimelineComponent,
    TimelineCardComponent,
    EventDialogComponent,
    EventTypeButtonComponent,
    EventCreatorComponent,
    StartsWithPipe,
    IncludesSubstrPipe,
    NotesDialogComponent,
    ImageDialogComponent,
    ImageUploadComponent,
    ImageGalleryComponent,
    EventFilterComponent,
    EventFilterFormComponent,
    EventTypeCardsComponent,
    EventTypeCardComponent,
    EventFilterChipsComponent,
    EventFilterChipComponent,
  ],
  exports: [
    MapsComponent,
    MapInstanceComponent,
    CesiumInstanceComponent,
    TrialCreatorComponent,
    TrialSelectorComponent,
    TimelineComponent,
    TimelineCardComponent,
    EventDialogComponent,
    EventTypeButtonComponent,
    EventCreatorComponent,
    StartsWithPipe,
    IncludesSubstrPipe,
    EventFilterComponent,
    EventFilterFormComponent,
    EventTypeCardsComponent,
    EventTypeCardComponent,
    EventFilterChipsComponent,
    EventFilterChipComponent,
  ],
  imports: [
    CommonModule,
    MoleMatModule,
    FormsModule,
    ReactiveFormsModule,
    OrderModule,
    FlexLayoutModule,
    HttpClientModule,
    ScrollingModule,
    GalleryModule,
    LightboxModule,
    GallerizeModule,
    FontAwesomeModule,
    OwlDateTimeModule, 
    OwlNativeDateTimeModule,
    RouterModule,
    RouterModule,
    LuxonModule,
    NgPipesModule,
    AngularCesiumModule.forRoot(),
    AngularCesiumWidgetsModule,
  ]
})
export class SharedModule {
  constructor(library: FaIconLibrary) {
    library.addIconPacks(fas);
  }
}
