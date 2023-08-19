import { 
  Component,
  OnInit,
  AfterViewInit,
  Input,
  Output,
  ViewChild,
  ElementRef,
  HostListener,
  EventEmitter,
} from '@angular/core';
import { Event, EventType, EventImage, Pose } from '../../../models'
import { MatDialog } from '@angular/material/dialog';
import { EventDialogComponent } from '../../event/event-dialog/event-dialog.component';
import { ImageDialogComponent } from '../../images/image-dialog/image-dialog.component';
import { NotesDialogComponent } from '../../notes-dialog/notes-dialog.component';
import { EventApiService, EventTypeApiService } from '../../../services';
import { TimelineCardService } from './service/timeline-card.service';
import { Lightbox } from '@ngx-gallery/lightbox';
import { Gallery, GalleryItem, ImageItem } from '@ngx-gallery/core';
import { SharedHelpers } from '../../../shared.helpers';
import { Observable } from 'rxjs';

// enum to track state of card resize
const enum ResizeState {
  OFF = 0,
  RESIZE = 1
}

@Component({
  selector: 'mole-timeline-card',
  templateUrl: './timeline-card.component.html',
  styleUrls: ['./timeline-card.component.scss']
})
export class TimelineCardComponent implements OnInit, AfterViewInit {

  eventTypesObservable: Observable<EventType[]>;
  order: string = "name"

  selectedEventObservable = this._eventApiService.getSelectedEvent();

  @Input() event: Event;
  @Input() last: boolean = false;
  @Input() message: string = "No More Events To Load";
  @Input() inEdit: boolean = false;
  @Input() notesOption: boolean = false;
  @Input() imagesOption: boolean = false;
  @Input() mapOption: boolean = false;
  @Input() dialogOption: boolean = false;
  @Input() apiOption: boolean = false;
  @Input() allowPoseUpdates: boolean = false;
  @Input() showMetadata: boolean = true;
  @Input() allowResize: boolean = false;
  @Output() eventType = new EventEmitter<String>();
  
  // prioritized keys are listed first in metadata section
  prioritizedKeys: Array<string> = [];

  editingType: boolean = false;
  editingStartDatetime: boolean = false;
  editingEndDatetime: boolean = false;
  editingPose: boolean = false;
  editingMetadata: any = {};

  selectedId: number;

  imageGalleryId = 'eventImages';
  eventImages: GalleryItem[] = [];

  sharedHelpers = new SharedHelpers();

  // drag resize members
  @ViewChild("eventCard", { read: ElementRef }) public eventCard: ElementRef;
  @Input() top: number;
  localHeight: number;
  private cardPosition: { left: number, top: number };
  public mouse: {x: number, y: number}
  public resizeState: ResizeState = ResizeState.OFF;
  private newHeight: number;

  heightObservable = this._timelineCardService.getEventCardHeight();
  

  constructor(
    public dialog: MatDialog,
    private _eventApiService: EventApiService,
    private _eventTypeService: EventTypeApiService,
    private _timelineCardService: TimelineCardService,
    public imageGallery: Gallery,
    private imageViewer: Lightbox
  ) {}

  ngOnInit(): void {
    
    // check if event type has prioritized metadata keys
    if (this.event && this.event.eventType && this.event.eventType.priorityMetadata) {
      this.prioritizedKeys = this.event.eventType.priorityMetadata;
    }

    this.eventTypesObservable = this._eventTypeService.getEventTypes();

    // listen for height change
    this.heightObservable.subscribe(height => {
      this.localHeight = height;
    });

    // listen for selection of self from other components
    this.selectedEventObservable.subscribe((eventId: number) => {
      if (this.event) {
        this.selectedId = eventId;
      }
    });

    // add boolean values for metadata state (in edit / not in edit)
    if (this.event) {
      for (let key in this.event.metadata) {
        this.editingMetadata[key] = false;
      }
    }

  }

  ngAfterViewInit(): void {
    this.loadEventCard();
  }

  // get the element size of card - used for drag resizing
  private loadEventCard(){
    // drag resize variables
    if (this.eventCard) {
      const {left, top} = this.eventCard.nativeElement.getBoundingClientRect();
      this.cardPosition = {left, top};
    }
  }

  // sets event as selected, other components may respond when an event is selected
  setAsSelectedEvent(): void {
    if (this.event.url) {
      this._eventApiService.setSelectedEvent(this.event.id);
      this._eventApiService.setLiveEventTracking(false);
    }
  }

  // opens event in api (new tab)
  openApi(event: Event): void {
    window.open(event.url)
  }

  // sets the end datetime for events with duration and publishes immediately
  endEvent(event: Event): void {
    event.endDatetime = new Date();
    this._eventApiService.updateEvent(event);
  }

  // local pose attachment
  addPose(pose: Pose) {
    this.event.startPose = pose;
  }

  // local metadata deletion
  removeMetadata(key: string) {
    delete this.event.metadata[key];
  }

  // local update to a specified metadata key
  updateMetadataKey(key: string, event: any) {
    let val = this.event.metadata[key];
    let newKey = event.target.value;
    this.removeMetadata(key);
    this.event.metadata[newKey] = val;
    this.editingMetadata[newKey] = true;
  }

  // local update to a specified metadata value
  updateMetadataValue(key: string, event: any) {
    this.event.metadata[key] = event.target.value;
  }

  // opens event dialog - used for editing the event
  openEventDialog(event): void {
    const dialogRef = this.dialog.open(EventDialogComponent, {
      width: '66vw',
      data: event
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      // this._eventApiService.updateEvent(result);
    });
  }

  // handles image dialog
  // if no images, open upload dialog, if there are images, open image viewer
  openImagesDialog(): void {
    if (this.event.images.length == 0) {
      const dialogRef = this.dialog.open(ImageDialogComponent, {
        width: '50vw',
        data: this.event
      });

      dialogRef.afterClosed().subscribe(result => {
        console.log('The dialog was closed');
        console.log(result);
        // this._eventApiService.updateEvent(result);
      });
    }
    else {
      // load images and open viewer
      this.loadImagesToGallery();
      this.imageViewer.open(0, this.imageGalleryId, {
        // panelClass: 'fullscreen'
      });
    }
  }

  // opens dialog for viewing and writing notes
  openNotesDialog(): void {

    const dialogRef = this.dialog.open(NotesDialogComponent, {
      width: '33vw',
      data:this.event,
    });
    //Triggers display of OK and Cancel buttons in the dialog
    dialogRef.componentInstance.displayButtons=true;
    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
//       this._eventApiService.updateEvent(result);
    });
  }

  // loads event images into lightbox image viewer
  loadImagesToGallery() {
    this.eventImages = [];
    const galleryRef = this.imageGallery.ref(this.imageGalleryId);

    this.event.images.forEach(
      (img: EventImage) => {
        this.eventImages.push(new ImageItem({src: img.imageUrl, thumb: img.thumbUrl}))
      }
    )
    galleryRef.load(this.eventImages);
  }

  // ensures point style is retrieved from an event's type when in edit
  // (if grabbed directly from event, point style won't change when switching types)
  getEventPointStyle(event: Event): any {
    if (this.inEdit && event.eventType) {
      return event.eventType.pointStyle;
    }
    else if (event.pointStyle) {
      return event.pointStyle;
    }
    else {
      return {
        icon: "question",
        marker_color: "grey"
      }
    }
  }

  // calculates the duration of events with an end datetime
  getEventDuration(start: Date, end: Date): number {
    return this.sharedHelpers.getDuration(start, end);
  }

  // used to hide/show event type selection field
  toggleEditType() {
    this.editingType = !this.editingType;
  }

  // used to hide/show datetime input field
  toggleEditStartDatetime() {
    this.editingStartDatetime = !this.editingStartDatetime;
  }

  // used to hide/show datetime input field
  toggleEditEndDatetime() {
    this.editingEndDatetime = !this.editingEndDatetime;
  }

  // used to hide/show embedded map
  toggleEditPose() {
    this.editingPose = !this.editingPose;
  }

  // used to hide/show metadata editing options
  toggleEditMetadata(key: string) {
    this.editingMetadata[key] = !this.editingMetadata[key];
  }


  // listen to mousemove events for card resizing
  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent){
    this.mouse = { x: event.clientX, y: event.clientY };

    if(this.resizeState === ResizeState.RESIZE) {
      // because the card is scrollable, we need to reload it to update it's position on
      // the screen
      this.loadEventCard();
      this.resize()
    };
  }

  // the mouse up event ends the drag resize event
  @HostListener('window:mouseup')
  onMouseUp() {
    if (this.resizeState === ResizeState.RESIZE) {
      this.submitResize(); // immediately resize all timeline events on drag finish
    }
  }

  // locally resizes the event card
  private resize(){
    // calculate the distance between the top of the card and the mouse cursor
    this.newHeight = Number(this.mouse.y > this.cardPosition.top) ? this.mouse.y - this.cardPosition.top : 50;

    // the shortest an event can be is 50px tall before important details are out of view
    if (this.newHeight < 50) {
      this.newHeight = 50;
    }
    this.localHeight = this.newHeight;
  }

  // publishes new size to all subscribed cards
  submitResize() {
    this._timelineCardService.setEventCardHeight(this.event.id, this.newHeight);
  }

  // requests last published size and publishes for all subscribed cards
  revertResize() {
    this._timelineCardService.revertEventCardHeight();
  }

  // controls state (resizing / not resizing)
  setStatus(event: MouseEvent, state: number){
    if(state === 1) {
      event.stopPropagation();
    }
    else {
      this.loadEventCard();
    }
    this.resizeState = state;
  }

  bubbleUpEventType(value: string) {
    this.eventType.emit(value);
  }

}
