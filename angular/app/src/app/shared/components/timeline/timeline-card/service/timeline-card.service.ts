import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { CookieService } from 'ngx-cookie-service';

import { EventApiService } from '../../../../services';

/*
  This service is responsible for coordinating event card height between the timeline
  and the timeline cards.
*/

@Injectable({
  providedIn: 'root'
})
export class TimelineCardService implements OnDestroy {

  private subscriptions = new Subscription();
  private cardHeightSubject: BehaviorSubject<number>;

  private currentHeight: number = 50;
  private prevHeight: number = 50;

  private cardHeighCookieName: string = "timeline-card-height";

  constructor(
    private _eventApiService: EventApiService,
    private _cookieService: CookieService
  ) {
    this.cardHeightSubject = new BehaviorSubject<number>(50);

    // check if height is saved in cookie from previous session
    if (this._cookieService.check(this.cardHeighCookieName)) {
      // if cookie found, publish height to cards and set local variables
      let cookieHeight = +this._cookieService.get(this.cardHeighCookieName);
      this.cardHeightSubject.next(cookieHeight);
      this.currentHeight = this.prevHeight = cookieHeight;
    }
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

    // setting the selected event enables the timeline to know where to auto-scroll to
    this._eventApiService.setSelectedEvent(eventId);
    this.cardHeightSubject.next(this.currentHeight); // publish new height to cards
    this.updateCookie();
  }

  revertEventCardHeight() {
    this.currentHeight = this.prevHeight;
    this.cardHeightSubject.next(this.currentHeight);
    this.updateCookie();
  }

  private updateCookie() {
    this._cookieService.set(this.cardHeighCookieName, this.currentHeight.toString());
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
