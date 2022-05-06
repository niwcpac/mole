import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import {BehaviorSubject, Observable, Subject} from "rxjs";
import { TimelineCardService } from './timeline-card.service';
import { AuthService } from '../../../../services';
import { Router } from '@angular/router';

class MockTimelineCardService {
  private cardHeightSubject: BehaviorSubject<number>;
  private currentHeight: number = 50;
  private prevHeight: number = 50;

  private cardHeighCookieName: string = "timeline-card-height";

  constructor() {
    this.cardHeightSubject = new BehaviorSubject<number>(50);
  }

  getEventCardHeight(): Observable<number> {
    return this.cardHeightSubject.asObservable();
  }

  setEventCardHeight(eventId: number, height: number) {
    if (!height || typeof(height) == 'undefined') {
      return;
    }

    // 50px is the minimum height to display event type name and time submitted
    if (height < 50) {
      height = 50;
    }

    // retain previous height if user chooses to revert their resize action
    this.prevHeight = this.currentHeight;
    this.currentHeight = height;

    this.cardHeightSubject.next(this.currentHeight); // publish new height to cards
    this.updateCookie();
  }

  revertEventCardHeight() {
    this.currentHeight = this.prevHeight;
    this.cardHeightSubject.next(this.currentHeight);
    this.updateCookie();
  }

  private updateCookie() {
    console.log(this.cardHeighCookieName, 'set to', this.currentHeight);
  }
}

describe('TimelineCardService', () => {
  let service: TimelineCardService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule], 
      providers: [
        {provide: TimelineCardService, useFactory: () => new MockTimelineCardService()}
      ]
    });
    service = TestBed.inject(TimelineCardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
