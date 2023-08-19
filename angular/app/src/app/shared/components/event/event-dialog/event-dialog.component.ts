import { Component, OnInit, Inject, OnDestroy, ViewChild} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Event, EventType, LocalEventNote, Pose, MetadataKey } from '../../../models'
import { EventApiService, MetadataApiService } from '../../../services';
import { Subscription } from 'rxjs';
import {NotesDialogComponent} from "../../notes-dialog/notes-dialog.component";

@Component({
  selector: 'mole-event-dialog',
  templateUrl: './event-dialog.component.html',
  styleUrls: ['./event-dialog.component.scss']
})
export class EventDialogComponent implements OnInit, OnDestroy {

  private subscriptions = new Subscription();

  selectedValues: string[] = [];
  metadataKeysToValuesMap: Map<string, string[]> = new Map<string, string[]>();
  metadataKeysDescription: Map<string, string> = new Map<string, string>();
  metadataValuesDescription: Map<string, string> = new Map<string, string>();

  displayedColumns: string[] = ['edit', 'key', 'value', 'actions'];
  dataSource: any[] = [];

  localNotes: Array<LocalEventNote> = [];
  localImages: FileList;

  imagesToUpload: File[] = null;

  @ViewChild(NotesDialogComponent) notes!: NotesDialogComponent;

  constructor(
    private _eventApiService: EventApiService,
    private _metadataKeyService: MetadataApiService,
    public dialogRef: MatDialogRef<EventDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public event: Event
  ) { }

  ngOnInit() {
    this.subscriptions.add(this._metadataKeyService.getMetadataKeys().subscribe(
      (data: MetadataKey) => {
        this.metadataKeysToValuesMap.set(data.name, data.metadatavalue_set);
        this.metadataKeysDescription.set(data.name, data.description);
        data.metadatavalue_set.forEach(function (singleValueName: string) {
          this.metadataValuesDescription.set(singleValueName, this._metadataKeyService.retrieveValueDescription(singleValueName));
        }, this);
      }
    ));
    if (this.event.eventType) {
      this.displayMetadataKeys(this.event.eventType);
    }

    if (this.dataSource.length == 0) {
      this.addRow('', '', true);
    }
  }

  onNoteAddClick(){
    if  (this.notes.newNoteValue.length > 0){
      this.notes.attachNote();
    }

  }
  addPose(pose: Pose) {
    this.event.startPose = pose;
  }

  addNote(note: LocalEventNote) {
    console.log("NOTE object passed to the addNote function",note);
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

  onSubmit(event: Event) {
    event.metadata = {};
    this.dataSource.forEach(function (element) {
      let trimmed_key = element.key.trim();
      if (trimmed_key) {
        event.metadata[trimmed_key] = element.value;
      }
    });

    let temp: string[] = [...this.metadataKeysToValuesMap.keys()];
    this.selectedValues.forEach(function (element, index, array) {
      event.metadata[temp[index]] = element;
    }, this);

    // updating existing event
    if (event.url) {
      this._eventApiService.updateEvent(event);
    }
    // creating new event
    else {
      this._eventApiService.createEvent(event, this.localNotes, this.localImages);
    }
    if (this.notes.newNoteValue.trim().length>0){
      this.notes.attachNote();
    }
    console.log("EVENT ", event);
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
    for (var i = 0; i < this.localNotes.length; i++) {
      if (this.localNotes[i].id == id) {
        return i;
      }
    }
  }

  addRow(key = '', value = '', isEditable = false) {
    const newRow = { edit: '', key: key, value: value, isEditable: isEditable, actions: '' };
    this.dataSource = [...this.dataSource, newRow];
  }

  deleteRow(row) {
    this.dataSource = this.dataSource.filter(i => i.key !== row.key);
  }

  displayMetadataKeys(newItem: EventType) {
    this.metadataKeysToValuesMap.clear();
    // Retrieve list of metadata keys expected for this event type
    newItem.metadatakey_set.forEach(function (metadata_key) {
      // Retreive metadata keys and their values
      this._metadataKeyService.retrieveKey(metadata_key);
      // Pre-emptively pushing values to the binding since we expect a value for each metadata key
      this.selectedValues.push("");
    }, this);
    // Using this.event.url as a way to determine if we're modifying an existing event
    if (this.event.url) {
      if (newItem.metadatakey_set.length) {
        // The first event dialog with existing metadata doesn't populate the
        // dropdown because the following code runs before the metadata api service
        // has a chance to retrieve the metadata keys from the API
        // TODO The expected fix for this would be to wait here until
        // this.metadataKeysToValuesMap is populated and continue
        // Ignoring it for now until it becomes an issue
      }

      let listToCheck: string[] = [...this.metadataKeysToValuesMap.keys()];
      Object.entries(this.event.metadata).forEach(function ([key, value]) {
        const index = listToCheck.indexOf(key);
        // item found means that there is a value tied to this key
        // therefore, we should pre-select the value from the dropdown
        if (index > -1) {
          // at index, remove 1 item and insert <value> at that location
          this.selectedValues.splice(index, 1, value);
        }
        // item not found means that the metadata key is a user-defined one instead of a config-defined one
        else {
          this.addRow(key, value, false);
        }
      }, this);
      // not an existing event so no need to check metadata
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    delete this.localImages;
    delete this.localNotes;
  }
}
