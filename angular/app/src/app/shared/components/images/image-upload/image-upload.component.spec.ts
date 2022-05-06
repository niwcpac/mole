import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageUploadComponent } from './image-upload.component';
import {BehaviorSubject, Observable, Subject} from "rxjs";
import {Event} from "../../../models";
import {ImageGalleryComponent} from "../..";
import {EventApiService} from "../../../services";
import {By} from "@angular/platform-browser";
import { EventEmitter } from 'events';

class MockEventApiService{
  private eventImageSubject: BehaviorSubject<{status, message}>;
  private returnFinished: boolean;

  constructor(){
    this.returnFinished = true;
  }

  public uploadEventImages(event: Event, images: FileList, index: number = 0) {
    if (index < images.length) {
      // only update event subscribers after the last image is uploaded
      let updateSubscribers = index == (images.length-1);
      this.uploadEventImage(event, images[index], updateSubscribers)
      .subscribe(uploadEvent => {
        if (uploadEvent) {
          if (uploadEvent["message"]) {
            //process upload progress here
            if (uploadEvent["message"] == 100) {
              // upload complete, begin next photo upload
              this.uploadEventImages(event, images, index+1);
            }
          }
        }
      });
    }
  }


  uploadEventImage(event: Event, image: File, updateEventSubscribers: boolean = true): Observable<{status, message}> {
    let new_subject = new BehaviorSubject<{ status, message }>(null);

    if(this.returnFinished) {
      new_subject.next({status: 'progress', message: 100});
    }
    else {
      new_subject.next({status: 'progress', message: 50});
    }
    return new_subject.asObservable();
  }
}

class MockImageUpload extends ImageUploadComponent{
  ngOnInit() {
    super.ngOnInit();
  }
}

describe('ImageUploadComponent', () => {
  let component: ImageUploadComponent;
  let fixture: ComponentFixture<ImageUploadComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MockImageUpload ]
    }).overrideComponent(MockImageUpload, {
      set: {
        providers: [
          {provide: EventApiService, useFactory: () => new MockEventApiService()},
        ],

      }
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MockImageUpload);
    component = fixture.debugElement.componentInstance;
    component.event = <Event>{
      url: '/api/events/1'
    };
    fixture.detectChanges();
  });


  it('should create', () => {
    expect(component).toBeTruthy();
  });


  // it('uploadImages(index: number) >> give messages on finished progress of uploading images for each file in filelist', () => {
  //   let file_1 = new File(['blobby bits1'], 'file1');
  //   let file_2 = new File(['blobby bits2'], 'file2');
  //   let file_3 = new File(['blobby bits3'], 'file3');
  //   let file_list = <FileList><unknown>[file_1, file_2, file_3];

  //   let upload_spy = spyOn(component['_eventApiService'], "uploadEventImage").and.callThrough();

  //   component.imagesToUpload = file_list;
  //   component.uploadImages(0);
  //   expect(upload_spy).toHaveBeenCalledTimes(3);
  //   let mat_progress_element = fixture.debugElement.query(By.css('mat-progress-bar'));
  //   fixture.detectChanges();
  //   expect(mat_progress_element).toEqual(null);

  // });


  // it('uploadImages(index: number) >> give in progress message of uploading image for one file in filelist', () => {
  //   let file_1 = new File(['blobby bits1'], 'file1');
  //   let file_2 = new File(['blobby bits2'], 'file2');
  //   let file_3 = new File(['blobby bits3'], 'file3');
  //   let file_list = <FileList><unknown>[file_1, file_2, file_3];

  //   let upload_spy = spyOn(component['_eventApiService'], "uploadEventImage").and.callThrough();

  //   component.imagesToUpload = file_list;
  //   component['_eventApiService']['returnFinished'] = false;
  //   component.uploadImages(0);
  //   expect(upload_spy).toHaveBeenCalledTimes(1);

  //   fixture.detectChanges();
  //   let mat_progress_element = fixture.debugElement.query(By.css('mat-progress-bar'));
  //   expect(mat_progress_element).not.toBe(null);

  // });


  it('handleImageInput(event) >> expect this method to be run with event param when event is triggered.', () => {
    let file_1 = new File(['blobby bits1'], 'file1');
    let file_2 = new File(['blobby bits2'], 'file2');
    let file_3 = new File(['blobby bits3'], 'file3');
    let file_list = <FileList><unknown>[file_1, file_2, file_3];

    let handle_image_spy = spyOn(component, "handleImageInput").and.callThrough();

    let input_image_files = {target: {files:file_list}};
    const input_element = fixture.debugElement.query(By.css('input'));

    input_element.triggerEventHandler('change', input_image_files);

    expect(handle_image_spy).toHaveBeenCalledWith(input_image_files);
    expect(component.imagesToUpload).toEqual(input_image_files.target.files);
  });


  it('handleImageInput(event) >> emit image files when event is not in database', () => {
    let file_1 = new File(['blobby bits1'], 'file1');
    let file_2 = new File(['blobby bits2'], 'file2');
    let file_3 = new File(['blobby bits3'], 'file3');
    let file_list = <FileList><unknown>[file_1, file_2, file_3];
    component.event.url = null;

    let handle_image_spy = spyOn(component, "handleImageInput").and.callThrough();
    let image_emit_spy = spyOn(component.newImagesUploadEvent, "emit");

    let input_image_files = {target: {files:file_list}};
    const input_element = fixture.debugElement.query(By.css('input'));

    // test with new event
    input_element.triggerEventHandler('change', input_image_files);

    expect(handle_image_spy).toHaveBeenCalledWith(input_image_files);
    expect(image_emit_spy).toHaveBeenCalledWith(input_image_files.target.files);
    expect(component.imagesToUpload).toEqual(input_image_files.target.files);
  });


  it('handleImageInput(event) >> expect this method to be run with event param when event is triggered.', () => {
    let file_1 = new File(['blobby bits1'], 'file1');
    let file_2 = new File(['blobby bits2'], 'file2');
    let file_3 = new File(['blobby bits3'], 'file3');
    let file_list = <FileList><unknown>[file_1, file_2, file_3];
    component.event.url = "/api/events/1"; // not a real event, just need a value for test

    let handle_image_spy = spyOn(component, "handleImageInput").and.callThrough();
    let existing_event_upload_spy = spyOn(component['_eventApiService'], "uploadEventImages");

    let input_image_files = {target: {files:file_list}};
    const input_element = fixture.debugElement.query(By.css('input'));

    // test with existing event
    input_element.triggerEventHandler('change', input_image_files);

    expect(handle_image_spy).toHaveBeenCalledWith(input_image_files);
    expect(existing_event_upload_spy).toHaveBeenCalledWith(component.event, input_image_files.target.files);
    expect(component.imagesToUpload).toEqual(input_image_files.target.files);
  });


  it('mat-progress-bar should NOT BE NULL when uploadingImage is TRUE', () => {
    component.uploadingImage = true;
    fixture.detectChanges();
    let mat_bar = fixture.debugElement.query(By.css('mat-progress-bar'));
    expect(mat_bar).not.toBeNull();
  });


  it('mat-progress-bar should BE NULL when uploadingImage is FALSE', () => {
    let mat_bar = fixture.debugElement.query(By.css('mat-progress-bar'));
    expect(mat_bar).toBeNull();
  });


  it('when publish button is clicked input elements click() method should trigger', () => {
    let input_elm = fixture.debugElement.query(By.css('input'));
    let click_spy = spyOn(input_elm.nativeElement, 'click').and.returnValue(null);

    let button = fixture.debugElement.query(By.css('button'));
    button.triggerEventHandler('click', {});
    fixture.detectChanges();

    expect(click_spy).toHaveBeenCalled();
  });

});
