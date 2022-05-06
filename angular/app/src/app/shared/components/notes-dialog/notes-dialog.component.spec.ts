import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { NotesDialogComponent } from './notes-dialog.component';
import {Event, EventNote} from "../../models";
import {Subject} from "rxjs";
import {EventApiService} from "../../services";
import {MAT_DIALOG_DATA} from "@angular/material/dialog";
import {MatSnackBar} from "@angular/material/snack-bar";
import {By} from "@angular/platform-browser";
import {MatIcon} from "@angular/material/icon";
import {ReversePipe} from "ngx-pipes";
import {DebugElement} from "@angular/core";

class MockEventApiService {

  private mock_events = [
    <Event>{
      url: 'event/url/1', metadata: {meta1: 'metadata1', meta2:'metadata2', meta3:'metadata3'},
      eventType: {name: 'event type 1', pointStyle: {icon: 'icon for event type 1', marker_color: 'blue'} },
      notes: [{id: 0, note: 'note 1', tester: {name: 'tester1'}}, {id: 0, note: 'note 2', tester: {name: 'tester2'}}, {id: 0, note: 'note 3', tester: {name: 'tester3'}}]
    },
    <Event>{
      url: 'event/url/2', metadata: {meta4: 'metadata4', meta5:'metadata5', meta6:'metadata6'},
      eventType: {name: 'event type 2', pointStyle: {icon: 'icon for event type 2', marker_color: 'blue'} },
      notes: [{id: 0, note: 'note 4', tester: {name: 'tester4'}}, {id: 0, note: 'note 5', tester: {name: 'tester5'}}, {id: 0, note: 'note 6', tester: {name: 'tester6'}}]
    }
  ];

  private singleEventSubject: Subject<Event>;

  constructor(){
    this.singleEventSubject = new Subject<Event>();
    this.singleEventSubject.next(this.mock_events[0]);
  }

  addEventNote(newNoteValue, event){
    return new Observable<string>(newNoteValue);
  }

  updateEventNote(event, note, newValue){
    return null;
  }

  deleteEventNote(event, note){
    return null;
  }

  getSingleEvent(){
    return this.singleEventSubject.asObservable();
  }
}

class MockMatSnackbar{
  open(message: string, action: string, config: any) {
    return null;
  }
}

class MockNotesDialog extends NotesDialogComponent{
  ngOnInit() {
    super.ngOnInit();
  }
}

describe('NotesDialogComponent', () => {
  let component: NotesDialogComponent;
  let fixture: ComponentFixture<NotesDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MockNotesDialog, ReversePipe]
    }).overrideComponent(MockNotesDialog, {
      set: {
        providers: [
          {provide: EventApiService, useFactory: () => new MockEventApiService()},
          {provide: MAT_DIALOG_DATA, useFactory: () => new MockEventApiService()['mock_events'][0] },
          {provide: MatSnackBar, useFactory: () => new MockMatSnackbar()}
        ],
      }
    }).compileComponents();

  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MockNotesDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });


  it('attachNote() >> update current events note and resets newNoteValue', () => {
    let add_event_note_spy = spyOn(component['_eventApiService'], 'addEventNote').and.callThrough();
    component.attachNote();
    expect(component.newNoteValue).toEqual('');
    expect(add_event_note_spy).toHaveBeenCalledWith(component.event, component.newNoteValue);
  });


  it('updateNote(note: EventNote, newValue: string) >> updates note of Event with provided new note', () => {
    let update_event_note_spy = spyOn(component['_eventApiService'], 'updateEventNote').and.callThrough();
    let mock_event_note = <EventNote>{url: "/api/notes/1", note: 'event note'};
    let new_note = "new note value";
    component.updateNote(mock_event_note, new_note);
    expect(update_event_note_spy).toHaveBeenCalledWith(component.event, mock_event_note, new_note);
  });


  it('deleteNote(note: EventNote) >> deletes specified note from current event ', () => {
    let delete_event_note_spy = spyOn(component['_eventApiService'], 'deleteEventNote').and.callThrough();
    let snack_bar_spy = spyOn(component['_snackBar'], 'open').and.callThrough();
    let mock_event_note = <EventNote>{url: '/api/notes/0', note: 'event note'};
    component.deleteNote(mock_event_note);
    expect(delete_event_note_spy).toHaveBeenCalledWith(component.event, mock_event_note);
    expect(snack_bar_spy).toHaveBeenCalledWith("Note Deleted", "", {duration: 2000,});
  });


  it('toggleEdit(noteIndex: number, inEdit: boolean) >> adds editing attribute to EventNote and sets editing to appropriate boolean', () => {
    let index = 0;
    let inEdit = true;

    component.toggleEdit(index, inEdit);
    expect(component.event.notes[index]['editing']).toBeDefined();
    expect(component.event.notes[index]['editing']).toEqual(inEdit);
  });


  it('calling toggleEdit should hide and show different buttons', () => {
    let mat_icon_button_2s = fixture.debugElement.queryAll(By.css('#mat-icon-button-2'));
    let mat_icon_button_3s = fixture.debugElement.queryAll(By.css('#mat-icon-button-3'));
    let mat_icon_button_4s = fixture.debugElement.queryAll(By.css('#mat-icon-button-4'));

    for(let i = 0; i<component.event.notes.length; i++) {
      expect(mat_icon_button_2s[i]).not.toEqual(<DebugElement><unknown>[]);
      expect(mat_icon_button_4s[i]).not.toEqual(<DebugElement><unknown>[]);
    }
    expect(mat_icon_button_3s).toEqual([]);

    component.event.notes.forEach(note => {
      note["editing"] = true;
    });
    fixture.detectChanges();

    mat_icon_button_2s = fixture.debugElement.queryAll(By.css('#mat-icon-button-2'));
    mat_icon_button_3s = fixture.debugElement.queryAll(By.css('#mat-icon-button-3'));
    mat_icon_button_4s = fixture.debugElement.queryAll(By.css('#mat-icon-button-4'));

    for(let i=0; i<component.event.notes.length; i++) {
      expect(mat_icon_button_3s[i]).not.toEqual(<DebugElement><unknown>[]);
    }
    expect(mat_icon_button_2s).toEqual([]);
    expect(mat_icon_button_4s).toEqual([]);
  });


  it('expect "done" button to trigger attachNote when clicked', () => {
    let attach_spy = spyOn<any>(component, 'attachNote').and.returnValue(null);
    let mat_flat_button_2 = fixture.debugElement.query(By.css('#mat-icon-button-1'));
    mat_flat_button_2.triggerEventHandler('click', {});
    expect(attach_spy).toHaveBeenCalled();
  });


  it('expect "delete" button to trigger deleteNote when clicked', () => {
    let delete_spy = spyOn(component, 'deleteNote').and.returnValue(null);
    let mat_icon_button_3s = fixture.debugElement.queryAll(By.css('#mat-icon-button-4'));
    mat_icon_button_3s.reverse();

    for(let i=0; i< mat_icon_button_3s.length; i++) {
      mat_icon_button_3s[i].triggerEventHandler('click', {});
      expect(delete_spy).toHaveBeenCalledWith(component.event.notes[i]);
    }
  });


  it('expect "Update Note" button to trigger updateNote when clicked', () => {
    let update_spy = spyOn(component, 'updateNote').and.returnValue(null);

    component.event.notes.forEach(note => {
      note["editing"] = true;
    });

    fixture.detectChanges();

    let mat_flat_button_1s = fixture.debugElement.queryAll(By.css('#mat-flat-button-1'));
    mat_flat_button_1s.reverse();

    for(let i=0; i<mat_flat_button_1s.length; i++){
      mat_flat_button_1s[i].triggerEventHandler('click', {});
      expect(update_spy).toHaveBeenCalledWith(component.event.notes[i], component.event.notes[i].note);
    }
  });


  it('expect mat-card edit buttons to trigger toggleEdit when clicked', () => {
    let toggle_spy = spyOn(component, 'toggleEdit').and.returnValue(null);

    let mat_icon_button_1s = fixture.debugElement.queryAll(By.css('#mat-icon-button-2'));
    for(let i=0; i< mat_icon_button_1s.length; i++) {
      mat_icon_button_1s[i].triggerEventHandler('click', {});
      expect(toggle_spy).toHaveBeenCalledWith(0, true);
    }

    component.event.notes.forEach(note => {
      note["editing"] = true;
    });

    fixture.detectChanges();

    let mat_icon_button_2s = fixture.debugElement.queryAll(By.css('#mat-icon-button-3'));
    for(let i=0; i< mat_icon_button_2s.length; i++) {
      mat_icon_button_2s[i].triggerEventHandler('click', {});
      expect(toggle_spy).toHaveBeenCalledWith(0, false);
    }
  });


  it('title heading should NOT BE NULL when title is TRUE', () => {
    let title_heading = fixture.debugElement.query(By.css('h2'));
    expect(title_heading).not.toBeNull();
  });


  it('title heading should BE NULL when title is FALSE', () => {
    component.title = false;
    fixture.detectChanges();
    let title_heading = fixture.debugElement.query(By.css('h2'));
    expect(title_heading).toBeNull();
  });


  it('a mat-card element should be created for each event note', () => {
    let note_count = component.event.notes.length;
    let mat_cards = fixture.debugElement.queryAll(By.css('mat-card'));
    expect(mat_cards.length).toEqual(note_count);
  });


  it('mat-card-content for a note should NOT BE NULL if note is NOT being edited and the innerText be set to the note', () => {
    let notes_content = fixture.debugElement.queryAll(By.css('#mat-card-content-note'));
    notes_content.reverse();

    for(let i=0; i<notes_content.length; i++) {
      expect(notes_content[i]).not.toEqual(<DebugElement><unknown>[]);
      expect(notes_content[i].properties.innerText.trim()).toEqual(component.event.notes[i].note);
    }
  });


  it('mat-card-content for a note should BE NULL if note is being edited', () => {
    component.event.notes.forEach(note => {
      note["editing"] = true;
    });
    fixture.detectChanges();

    let notes_content = fixture.debugElement.queryAll(By.css('#mat-card-content-note'));
    expect(notes_content).toEqual([]);
  });


  it("mat-card-subtitle elements innerText should be the note's tester name", () => {
    let mat_card_subtitles = fixture.debugElement.queryAll(By.css('mat-card-subtitle'));
    mat_card_subtitles.reverse();

    for(let i=0; i<mat_card_subtitles.length; i++){
      expect(mat_card_subtitles[i].properties.innerText).toEqual(component.event.notes[i].tester.name);
    }
  });

});
