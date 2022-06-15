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

  ELEMENT_DATA: any[] = [
    { key: 'Hydrogen', value: 1.0079, isEditable: false},
    { key: 'Helium', value: 4.0026, isEditable: false},
    { key: 'Lithium', value: 6.941, isEditable: false},
    { key: 'Beryllium', value: 9.0122, isEditable: false},
  ];
  displayedColumns: string[] = ['key', 'value'];
  dataSource = this.ELEMENT_DATA;

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
    Object.keys(this.event.metadata).forEach(key => {
      this.metadataKeys.push(key);
    });
    console.log("im in init");
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

  addRow() {}

  ngOnDestroy(): void {
    delete this.localImages;
    delete this.localNotes;
  }

}
