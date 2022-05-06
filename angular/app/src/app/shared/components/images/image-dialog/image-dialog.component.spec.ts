import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageDialogComponent } from './image-dialog.component';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";

import {DebugElement} from "@angular/core";
import {By} from "@angular/platform-browser";

class MockMatDialogRef{

}

class MockImageDialog extends ImageDialogComponent{
  ngOnInit() {
    super.ngOnInit();
  }
}

describe('ImageDialogComponent >> ', () => {
  let component: ImageDialogComponent;
  let fixture: ComponentFixture<ImageDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MockImageDialog ]

    }).overrideComponent(MockImageDialog, {
      set: {
        providers: [
          {provide: MatDialogRef, useFactory: () => new MockMatDialogRef()},
          {provide: MAT_DIALOG_DATA, useFactory: () => {} }
        ],

      }
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MockImageDialog);
    component = fixture.debugElement.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });


  it('should set mole-image-upload and mole-image-gallery selector properties', () => {
    let mole_image_upload_selector = fixture.debugElement.query(By.css('mole-image-upload'));
    let mole_image_gallery_selector = fixture.debugElement.query(By.css('mole-image-gallery'));
    expect(mole_image_upload_selector.properties.event).toEqual(component.event);
    expect(mole_image_gallery_selector.properties.event).toEqual(component.event);
  });


  it('"Images" heading should NOT BE NULL if title is TRUE', () => {
    let title_heading = fixture.debugElement.query(By.css('h1'));
    expect(title_heading).not.toBeNull();
    expect(title_heading.properties.innerText.trim()).toEqual("Images");
  });


  it('"Images" heading should BE NULL if title is FALSE', () => {
    component.title = false;
    fixture.detectChanges();
    let title_heading = fixture.debugElement.query(By.css('h1'));
    expect(title_heading).toBeNull();
  });

});
