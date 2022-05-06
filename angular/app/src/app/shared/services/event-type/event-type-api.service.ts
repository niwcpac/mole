import { Injectable, OnDestroy, OnInit } from '@angular/core';
import { Subscription, Subject, Observable, BehaviorSubject } from 'rxjs';
import { map } from "rxjs/operators";
import { HttpClient } from '@angular/common/http';


import { EventType } from '../../models';
import { EventTypeApiAdapters } from './event-type-api.adapter';

@Injectable({
  providedIn: 'root'
})
export class EventTypeApiService implements OnDestroy {
  private subscriptions = new Subscription();

  private eventTypesSubject: BehaviorSubject<EventType[]>;
  private eventTypes: EventType[];

  private eventTypeApiAdapters = new EventTypeApiAdapters();

  constructor(private http: HttpClient) {
    this.eventTypesSubject = new BehaviorSubject(null);
    this.initEventTypes();
  }


  // makes call to event_types endpoint, will pull back all event types
  // the constructor subscription should be the only call to this
  private initEventTypes(): void {
    let eventTypesRequest = this.http.get('/api/event_types/')
    .pipe(
      map((data: any) => data.map( item => this.eventTypeApiAdapters.eventTypeAdapter(item) ))
    );

    this.subscriptions.add(eventTypesRequest.subscribe(data => {
        this.eventTypes = data;
        this.eventTypesSubject.next(this.eventTypes)
      }
    ));
  }

  getEventTypes(): Observable<EventType[]> {
    return this.eventTypesSubject.asObservable();
  }

  // this will return an immediate result without having to wait on a return from the server
  getCurrentTypes(): EventType[] {
    if(this.eventTypes) {
      return this.eventTypes.slice();
    } else {
      return [];
    }

  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
