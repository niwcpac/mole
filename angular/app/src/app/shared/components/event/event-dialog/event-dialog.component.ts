import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Event, EventType, LocalEventNote, Pose } from '../../../models'
import { EventTypeApiService, EventApiService } from '../../../services';
import { Observable } from 'rxjs';

@Component({
  selector: 'mole-event-dialog',
  templateUrl: './event-dialog.component.html',
  styleUrls: ['./event-dialog.component.scss']
})
export class EventDialogComponent implements OnInit, OnDestroy {

  displayedColumns: string[] = ['key', 'value', 'actions'];
  dataSource:any[] = [];

  eventTypesObservable: Observable<EventType[]>;
  imagesToUpload: File[] = null;
  order: string = "name";

  metaKeyInput: string = '';
  metaValueInput: string = '';

  metadataKeys = [];

  localNotes: Array<LocalEventNote> = [];
  localImages: FileList;

  constructor(
    private _eventApiService: EventApiService,
    private _eventTypeService: EventTypeApiService,
    public dialogRef: MatDialogRef<EventDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public event: Event
  ) { }

  ngOnInit() {
    this.eventTypesObservable = this._eventTypeService.getEventTypes();
    Object.entries(this.event.metadata).forEach(function([key, value]) {
      const newRow = { key: key, value: value, isEditable: false, actions: ''};
      this.dataSource = [...this.dataSource, newRow];
    }, this);
  }

  addMetadata(key: string, value: string) {
    this.event.metadata[key] = value;
    this.metadataKeys.push(key);
    this.metaKeyInput = '';
    this.metaValueInput = '';
  }

  addPose(pose: Pose) {
    this.event.startPose = pose;
  }

  addNote(note: LocalEventNote) {
    this.localNotes.push(note);
  }

  updateNote(updatedNote: LocalEventNote) {
    this.localNotes[this.getNoteIndexFromId(updatedNote.id)] = updatedNote;
  }

  deleteNote(deletedNote: LocalEventNote) {
    delete this.localNotes[this.getNoteIndexFromId(deletedNote.id)];
  }

  addNewImages(images: FileList) {
    this.localImages = images;
  }

  removeMetadata(key: string) {
    delete this.event.metadata[key];
    this.metadataKeys.splice(this.metadataKeys.indexOf(key), 1);
  }

  onSubmit(event: Event) {
    event.metadata = {};
    this.dataSource.forEach(function (element) {
      event.metadata[element.key] = element.value;
    });
 
    // updating existing event
    if(event.url) {
      this._eventApiService.updateEvent(event);
    }
    // creating new event
    else {
      this._eventApiService.createEvent(event, this.localNotes, this.localImages);
    }
    this.dialogRef.close();
  }

  openEventApi(event: Event): void {
    window.open(event.url)
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  handleImageInput(images: FileList) {
    this.imagesToUpload = [images.item(0)];
  }

  trackByFn(index: any, item: any) {
    return index;
  }

  getNoteIndexFromId(id: number) {
    for (var i=0; i<this.localNotes.length; i++) {
      if (this.localNotes[i].id == id) {
        return i;
      }
    }
  }

  addRow() {
    if(!this.dataSource.map((obj) => obj.key).includes('')) {
      const newRow = { key: '', value: '', isEditable: true, actions: ''};
      this.dataSource = [...this.dataSource, newRow];
    }
  }

  ngOnDestroy(): void {
    delete this.localImages;
    delete this.localNotes;
  }
}
