import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageGalleryComponent } from './image-gallery.component';
import {Event, EventImage} from '../../../models'
import { EventApiService } from 'src/app/shared/services';
import {BehaviorSubject, Observable} from "rxjs";
import {By} from "@angular/platform-browser";


export class MockEventApiService{
  private singleEventSubject: BehaviorSubject<Event>;

  constructor(){
    let mock_event = <Event>{images: [
        <EventImage>{url: 'image/url/1', thumbUrl: 'image/thumburl/1', imageUrl:'imageurl/1'},
        <EventImage>{url: 'image/url/2', thumbUrl: 'image/thumburl/2', imageUrl:'imageurl/2'}
      ]};
    this.singleEventSubject = new BehaviorSubject<Event>(mock_event);
  }

  getSingleEvent(): Observable<Event> {
    return this.singleEventSubject.asObservable();
  }
}

class MockImageGallery extends ImageGalleryComponent{
  ngOnInit() {
    super.ngOnInit();
  }
}

describe('ImageGalleryComponent', () => {
  let component: ImageGalleryComponent;
  let fixture: ComponentFixture<ImageGalleryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MockImageGallery ]
    }).overrideComponent(MockImageGallery, {
      set: {
        providers: [
          {provide: EventApiService, useFactory: () => new MockEventApiService()},
        ],

      }
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MockImageGallery);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });


  it('Check img src attributes set', () => {
    let img = fixture.debugElement.queryAll(By.css('img'));

    for(let i=0; i<img.length; i++) {
      expect(img[i].attributes.src).toContain(component.event.images[i].thumbUrl);
      expect(img[i].attributes.imagesrc).toEqual(component.event.images[i].imageUrl);
      expect(img[i].attributes.thumbsrc).toEqual(component.event.images[i].thumbUrl);
    }

    expect(img.length).toEqual(component.event.images.length);
  });
});
