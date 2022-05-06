import { Component, OnInit, Inject, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Event, EventNote } from '../../models';
import { EventApiService } from '../../services';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LocalEventNote } from '../../models/event.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'mole-notes-dialog',
  templateUrl: './notes-dialog.component.html',
  styleUrls: ['./notes-dialog.component.scss']
})
export class NotesDialogComponent implements OnInit, OnDestroy {

  @Input() title: boolean = true;

  @Output() newNoteEvent = new EventEmitter<LocalEventNote>();
  @Output() updateNoteEvent = new EventEmitter<LocalEventNote>();
  @Output() deleteNoteEvent = new EventEmitter<LocalEventNote>();

  dialogNotes: Array<any> = [];
  eventObservable = this._eventApiService.getSingleEvent();
  newNoteValue: string = '';
  localNoteId: number = -1;

  constructor(
    private _eventApiService: EventApiService,
    private _snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public event: Event
  ) { }

  ngOnInit(): void {
    this.eventObservable.subscribe(
      (event: Event) => {
        this.event = event;
        this.dialogNotes = this.event.notes;
      }
    )

    if (this.event.url) {
      this.dialogNotes = this.event.notes;
    }
  }

  attachNote() {
    if (this.event.url) {
      this._eventApiService.addEventNote(this.event, this.newNoteValue).subscribe(_ => {
        // note post success
      });
    }
    else {
      let newNote: LocalEventNote = {
        id: ++this.localNoteId,
        tester: {name: "Note"},
        note: this.newNoteValue
      }
      this.newNoteEvent.emit(newNote);
      this.dialogNotes = this.dialogNotes.concat([newNote]);
    }
    this.newNoteValue = '';
  }

  updateNote(note: EventNote, newValue: string) {
    // note exists in db
    if (note.url) {
      this._eventApiService.updateEventNote(this.event, note, newValue);
    }

    // note is local
    else {
      note.note = newValue;
      this.updateNoteEvent.emit(note); // send update to parent

      // update note locally
      let noteIndex = this.getNoteIndexFromId(note.id);
      if (noteIndex != -1) {
        this.dialogNotes[noteIndex] = note;
        this.dialogNotes = this.dialogNotes.concat([]); // trigger array change for data bind
        this.toggleEdit(note.id, false);
      }
    }
  }

  deleteNote(note: EventNote) {
    // note exists in db
    if (note.url) {
      this._eventApiService.deleteEventNote(this.event, note);
    }

    // note is local
    else {
      this.deleteNoteEvent.emit(note); // send delete to parent

      // delete note locally
      let noteIndex = this.getNoteIndexFromId(note.id);
      if (noteIndex != -1) {
        this.dialogNotes.splice(noteIndex, 1);
        this.dialogNotes = this.dialogNotes.concat([]); // trigger array change for data bind
      }
    }
    
    // show note deleted message
    this._snackBar.open("Note Deleted", "", {
      duration: 2000,
    });
  }

  toggleEdit(noteId: number, inEdit: boolean) {
    this.dialogNotes[this.getNoteIndexFromId(noteId)]["editing"] = inEdit;
  }

  getNoteIndexFromId(id: number) : number {
    for (var i=0; i<this.dialogNotes.length; i++) {
      if (this.dialogNotes[i].id == id) {
        return i;
      }
    }
    return -1;
  }

  ngOnDestroy(): void {
    delete this.dialogNotes;
  }

}
