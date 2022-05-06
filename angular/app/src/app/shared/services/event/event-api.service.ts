import { Injectable, OnDestroy } from '@angular/core';
import {Subscription, Subject, interval, Observable, BehaviorSubject, ReplaySubject} from 'rxjs';
import { map } from "rxjs/operators";
import { HttpClient, HttpHeaders, HttpEventType, HttpRequest, HttpResponse } from '@angular/common/http';

import { AuthService } from '../auth/auth.service';
import { TrialApiService } from '../trial/trial-api.service';
import {EventApiAdapters} from './event-api.adapter'
import { Event, EventNote, EventFilter, EventPageResult, EventType, EventPayload, Pose} from "../../models";
import { SharedHelpers } from "../../shared.helpers";
import { EventPayloadApiAdapters } from '../auth/payload.adapter';
import { LocalEventNote } from '../../models/event.model';

@Injectable({
  providedIn: 'root'
})
export class EventApiService implements OnDestroy {
  private subscriptions = new Subscription();

  latestEventTime: Date;
  private selectedTrialId: number;
  private selectedTrialUrl: string;
  private INTERVAL_TIME: number = 2000; // 2 second

  private eventsPagedSubject: Subject<Event[]>;
  private eventsPoseSubject: Subject<Event[]>;
  private eventsFilterSubject: BehaviorSubject<EventFilter>;
  private selectedEventSubject: BehaviorSubject<number>;
  private selectedEventObjectSubject: BehaviorSubject<Event>;
  private singleEventSubject: Subject<Event>;

  private liveEventTrackSubject: BehaviorSubject<boolean>;
  private liveEventTrack: boolean = false;
  private newestEvent: Event;

  private selectedPagedIndexSubject: Subject<number>;

  private currentPagedEvents: Event[];
  private currentPoseEvents: Event[];

  private currentPageUrl: string;
  private previousPageUrl: string;
  private nextPageUrl: string;
  private loadingNewPage: boolean = true;

  private eventApiAdapters = new EventApiAdapters();
  private eventPayloadApiAdapters = new EventPayloadApiAdapters();
  private sharedHelpers = new SharedHelpers();

  private eventFilter: EventFilter = this.eventApiAdapters.eventFilterAdapter({
    level: null,
    types: [],
    metadata: [],
    hasPose: false,
  });
  private filterChanged: boolean = false;

  constructor(private http: HttpClient, private _authService: AuthService, private _trialApiService: TrialApiService) {
    this.eventsPagedSubject = new Subject();
    this.eventsPoseSubject = new Subject();
    this.eventsFilterSubject = new BehaviorSubject<EventFilter>(null);
    this.selectedEventSubject = new BehaviorSubject(null);
    this.selectedEventObjectSubject = new BehaviorSubject(null);
    this.singleEventSubject = new Subject();
    this.selectedPagedIndexSubject = new Subject();
    this.liveEventTrackSubject = new BehaviorSubject<boolean>(false);

    // initialize the eventFilter subject with the default value
    this.eventsFilterSubject.next(this.eventFilter);

    // Subscribe to the Trial
    // Whenever the trial changes, this.getInitialEvents will be called
    this.subscriptions.add(this._trialApiService.getSelectedTrial().subscribe(
      data=>{
        if (!data) {
          return;
        }

        // trial-api service will detect the changes
        if(data.id) {
          this.eventsPagedSubject.next(null);
          this.eventsPoseSubject.next(null);
          this.loadingNewPage = true;
          this.selectedTrialId = data.id;
          this.selectedTrialUrl = data.url;
          this.getInitialPoseEvents(this.selectedTrialId);

          this.currentPageUrl = '/api/events?trial='+this.selectedTrialId;
          this.previousPageUrl = null;
          this.nextPageUrl = null;
          this.currentPagedEvents = [];
          this.refreshPagedEvents();

          this.setSelectedEvent(null);
        }
      },
      err => console.error(err),
      () => console.log('done loading trial')
    ));

    this.subscriptions.add(interval(this.INTERVAL_TIME).subscribe(
      x =>
        {
          this.refreshPoseEvents();
          this.refreshPagedEvents();
        }
      ));
  }

  // makes call to get the events - will pull back all events. The constructor subscription should be the only call to this
  private getInitialPoseEvents(trialId: number): void{
    this.selectedTrialId = trialId;

    let eventsRequest: Observable<EventPageResult>  = this.http.get('/api/events?ordering=-modified_datetime&page_size=50&has_no_pose=false&trial='+trialId)  // get the event array
    .pipe(
      map((data: any) => this.eventApiAdapters.pageResultAdapter(data) ),  // map each array element to an Event object
    );

    // send the data to eventsSubject, so that any subscriber to getEvents is automagically updated
    this.subscriptions.add(eventsRequest.subscribe(
      (page: EventPageResult) => {
        if(page.results.length>0) {
          this.latestEventTime = page.results[0].modifiedDatetime;
        }
        this.currentPoseEvents = page.results;
        this.eventsPoseSubject.next(page.results);
        if(page.next){
          this.getPoseNextPage(page.next);
        }

      }
    ));
  }

  // makes call to get the events - will pull back all events
  private refreshPagedEvents(): void{

    this.addFilters();

    let eventsRequest : Observable<EventPageResult> = this.http.get(this.currentPageUrl)  // get the event array
    .pipe(
      map((data: any) =>
          this.eventApiAdapters.pageResultAdapter(data)
        )
    );

    // send the data to eventsSubject, so that any subscriber to getEvents is automagically updated
    this.subscriptions.add(eventsRequest.subscribe(
      data => {

        // check if filters have changed since making the request
        if (this.filterChanged) {
          this.currentPagedEvents = [];
          this.eventsPagedSubject.next(this.currentPagedEvents);
          this.nextPageUrl = null;
          this.previousPageUrl = null;
          this.filterChanged = false;
          return;
        }
    
        if (this.loadingNewPage) {
          this.nextPageUrl = data.next;
          this.previousPageUrl = data.previous;
          this.loadingNewPage = false;
        }
        let newArray: Event[] = this.sharedHelpers.arrayUnique(data.results.concat(this.currentPagedEvents));
        // note sort isn't needed if only used for markers and not timeline
        newArray.sort((a,b) => this.sharedHelpers.compareDate(a.startDatetime, b.startDatetime) );
        this.currentPagedEvents = newArray;
        this.eventsPagedSubject.next(this.currentPagedEvents);
        
        // select latest event if tracking live
        if (this.currentPagedEvents[0]) {
          this.newestEvent = this.currentPagedEvents[0];

          if (this.liveEventTrack) {
            this.selectedEventObjectSubject.next(this.newestEvent)
            this.setSelectedEvent(this.newestEvent.id)
          }
        }
        
      }
    ));

    // reset current trial url to continue detecting new events
    this.resetCurrentPageUrl();

  }

  private resetCurrentPageUrl(): void {
    this.currentPageUrl = '/api/events?trial='+this.selectedTrialId;
  }

  getPagedEvents(): Observable<Event[]>{
    return this.eventsPagedSubject.asObservable();
  }

  getPoseEvents(): Observable<Event[]>{
    return this.eventsPoseSubject.asObservable();
  }

  // returns the current filter for component initialization
  getCurrentFilter(): EventFilter {
    return this.eventFilter;
  }

  // returns an observable to components can subscribe to updates
  filterChangedNotification(): Observable<EventFilter> {
    return this.eventsFilterSubject.asObservable();
  }

  getNextPage(): boolean {
    if(this.nextPageUrl && !this.loadingNewPage) {
      this.currentPageUrl = this.nextPageUrl;
      this.nextPageUrl = null;
      this.loadingNewPage = true;
      this.refreshPagedEvents();
    }

    return this.loadingNewPage;
  }

  getPreviousPage() {
    if(this.previousPageUrl) {
      this.currentPageUrl = this.previousPageUrl;
      this.previousPageUrl = null;
      this.refreshPagedEvents();
    }
  }

  setLiveEventTracking(isLive: boolean) {
    // console.log('setting live track to', isLive);
    this.liveEventTrack = isLive;
    this.liveEventTrackSubject.next(isLive);

    if (this.liveEventTrack && this.newestEvent) {
      this.selectedEventObjectSubject.next(this.newestEvent);
      this.setSelectedEvent(this.newestEvent.id);
    }
  }

  getIsTrackingLiveEvent(): Observable<boolean> {
    return this.liveEventTrackSubject.asObservable();
  }

  getSelectedEvent(): Observable<number>{
    return this.selectedEventSubject.asObservable();
  }

  getSelectedEventObject(): Observable<Event> {
    return this.selectedEventObjectSubject.asObservable();
  }

  getSelectedPagedEventIndex(): Observable<number> {
    return this.selectedPagedIndexSubject.asObservable();
  }

  setSelectedEvent(eventId: number){
    this.selectedEventSubject.next(eventId);

    if (eventId) {
      const pagedIndex = this.currentPagedEvents.findIndex(event => event.id == eventId);
      this.selectedPagedIndexSubject.next(pagedIndex);
    }
    else {
      this.selectedPagedIndexSubject.next(null);
    }
    
    // get the event's object for those subscribed to get that
    this.setSelectedEventObject(eventId);
  }

  setSelectedEventObject(eventId: number){
    if (!eventId) {
      this.selectedEventObjectSubject.next(null);
      return;
    }

    this.http.get(`/api/events/${eventId}`).subscribe(
      data => {
        this.selectedEventObjectSubject.next(this.eventApiAdapters.eventAdapter(data));
      }
    );
  }

  getSingleEvent(): Observable<Event> {
    return this.singleEventSubject.asObservable();
  }

  getSingleEventUpdate(event: Event) {
    this.http.get(event.url).subscribe(
      data => {
        this.singleEventSubject.next(this.eventApiAdapters.eventAdapter(data));
      }
    );
  }

  getEventsWithIds(eventIds: number[]) {
    if (eventIds.length > 0 && !this.loadingNewPage) {
      var qry = `/api/events?trial=${this.selectedTrialId}&`
      eventIds.forEach(id => {
        qry = qry.concat(`event_id=${id}&`)
      })
      // remove the last &
      qry = qry.substring(0, qry.length-1);
      this.currentPageUrl = qry;
    }
  }

  updateFilter(types: Array<EventType>, meta: Array<string>, level: number, hasPose: boolean) {

    if(level != null && this.eventFilter.level != level) {
      this.eventFilter.level = level;
      this.filterChanged = true;
    }
    // check if the has pose filter has changed
    if(hasPose != null && hasPose != this.eventFilter.hasPose) {
      this.eventFilter.hasPose = hasPose;
      this.filterChanged = true;
    }

    // check if metadata filters have added or been removed
    if(meta) {
      let metaChanged = false;
      meta.forEach(item => {
        const metaPresent = this.eventFilter.metadata.find(activeMeta => activeMeta === item);
        if(!metaPresent) {
          metaChanged = true;
        }
      });
      if(meta.length != this.eventFilter.metadata.length) {
        metaChanged = true;
      }
      if(metaChanged) {
        this.eventFilter.metadata = meta;
        this.filterChanged = true;
      }
    }
    if(types) {
      let typesChanged = false;
      // check if types types have added
      types.forEach(({name}) => {
        const typePresent = this.eventFilter.types.find(eventType => eventType.name === name);
        if(!typePresent) {
          typesChanged = true;
        }
      })
      // check if any types have been removed
      if(types.length != this.eventFilter.types.length) {
        typesChanged = true;
      }
      if(typesChanged) {
        this.eventFilter.types = types;
        this.filterChanged = true;
      }
    }

    if(this.filterChanged) {
      this.setPagedFilter(this.eventFilter);
    }
  }

  setPagedFilter(filter: EventFilter) {
    // this.eventFilter = filter;
    this.eventsFilterSubject.next(Object.assign(this.eventFilter, filter));
    this.filterChanged = true;
    this.loadingNewPage = true;
    this.refreshPagedEvents();
  }

  private addFilters(): void {
    // event level filter
    if (this.eventFilter.level) {
      this.currentPageUrl =  `${this.currentPageUrl}&event_level_gte=${this.eventFilter.level}`;
    }

    // event type filter
    if (this.eventFilter.types && this.eventFilter.types.length != 0) {
      this.eventFilter.types.forEach(type => {
        this.currentPageUrl = `${this.currentPageUrl}&event_type=${type.name.split(' ').join('+')}`;
      })
    }

    // metadata filter
    if (this.eventFilter.metadata && this.eventFilter.metadata.length != 0) {
      this.eventFilter.metadata.forEach(metadata => {
        this.currentPageUrl = `${this.currentPageUrl}&metadata_contains=${metadata}`;
      })
    }

    //has pose
    if (this.eventFilter.hasPose) {
      this.currentPageUrl = `${this.currentPageUrl}&has_no_pose=false`;
    }
  }

  getPoseNextPage(url: string) {
    let eventsRequest : Observable<EventPageResult> = this.http.get(
      url
    ).pipe(
      map( (data: any) => this.eventApiAdapters.pageResultAdapter(data)  ) // map each array element to an Event object
    );

    this.poseSubscribe(eventsRequest);
  }

  // Function to use to subscribe to events or refresh events
  // If called to refresh any subscribers will automatically get the new events
  refreshPoseEvents() : void{
    if(this.currentPoseEvents){
      var eventTimeFilter: string = '';
      if(this.latestEventTime) {
        eventTimeFilter = "&modified_since=" + this.latestEventTime.toISOString();
      }
      let eventsRequest : Observable<EventPageResult> = this.http.get(
        '/api/events?ordering=-modified_datetime&has_no_pose=false&page_size=50&trial='+this.selectedTrialId+eventTimeFilter
      ).pipe(
        map( (data: any) => this.eventApiAdapters.pageResultAdapter(data)  ) // map each array element to an Event object
      );
      this.poseSubscribe(eventsRequest);

    }

  }

  poseSubscribe(eventsRequest: Observable<EventPageResult>){
    // send the data to eventsSubject, so that any subscriber to getEvents is automagically updated
    this.subscriptions.add(eventsRequest.subscribe(
      (page: EventPageResult) =>
      {
        if(page.results.length > 0) {

          if(this.latestEventTime) {
            if(this.latestEventTime.getTime() < page.results[0].modifiedDatetime.getTime()) {
              this.latestEventTime = page.results[0].modifiedDatetime;
            }
            else if(this.latestEventTime.getTime() == page.results[0].modifiedDatetime.getTime()){
              this.latestEventTime.setMilliseconds(this.latestEventTime.getMilliseconds()+1);
            }
          }
          else {
            this.latestEventTime = page.results[0].modifiedDatetime;
          }

          // concat two arrays and remove duplicates
          let newArray: Event[] = this.sharedHelpers.arrayUnique(page.results.concat(this.currentPoseEvents));
          this.currentPoseEvents = newArray;
          this.eventsPoseSubject.next(this.currentPoseEvents);
          if(page.next) {
            this.getPoseNextPage(page.next);
          }
        }
      }
    ));
  }

  getEventObject(eventType?: EventType, startPose?: Pose): Event {
    let event: Event = {
      url: null,
      id: null,
      submittedDatetime: null,
      startDatetime: null,
      endDatetime: null,
      modifiedDatetime: null,
      startPose: null,
      weather: null,
      eventType: null,
      trigger: null,
      pointStyle: null,
      notes: [],
      images: [],
      metadata: {}
    }

    if (eventType) {
      event.eventType = eventType;
    }

    if (startPose) {
      event.startPose = startPose;
    }

    return event;
  }

  getLoadedPoseEvent(eventId: number) : Event {
    return this.currentPoseEvents.find(event => event.id == eventId);
  }

  createEvent(event: Event, notes?: Array<LocalEventNote>, images?: FileList) {
    let newEventObservable = this.createEventFromPayload(
      this.eventPayloadApiAdapters.eventPayloadAdapter(event, this.selectedTrialUrl)
    );

    newEventObservable.subscribe(event => {
      if (notes) {
        this.uploadEventNotes(event, notes);
      }
      if (images) {
        this.uploadEventImages(event, images);
      }
    });
  }


  createEventFromPayload(payload: EventPayload) : Observable<Event> {
    return new Observable((subscriber) => {
      this.http.post('/api/events/', payload).subscribe(
        data => {
          this.refreshPagedEvents();
          this.refreshPoseEvents();
          subscriber.next(this.eventApiAdapters.eventAdapter(data));
        },
        error => {
          console.log("Error creating event.");
          console.log(error);
        }
      );
    })
    
  }

  updateEvent(event: Event) {
    this.http.patch<any>(event.url, this.eventPayloadApiAdapters.eventPayloadAdapter(event)).subscribe(
      data => {
        this.refreshPagedEvents();
        console.log("in update event in event api service")
        console.log(data);
        this.getSingleEventUpdate(data);
      },
      error => {
        console.log("Error updating event.");
        console.log(error);
      }
    );
  }

  updateEventPose(eventId: number, poseUrl: string){
    this.http.patch<any>("/api/events/"+eventId+"/", {"start_pose": poseUrl}).subscribe(
      data => {
        this.refreshPagedEvents();
        console.log("in update event in event api service")
        console.log(data);
        this.getSingleEventUpdate(data);
        this.refreshPoseEvents();
      },
      error => {
        console.log("Error updating event.");
        console.log(error);
      }
    );
  }

  uploadEventNotes(event: Event, notes: Array<LocalEventNote>, index: number = 0) {
    if (index < notes.length) {
      // only send update to subscribers on last iteration
      let updateSubscribers = index == (notes.length-1);

      // only start next note upload after previous finished
      this.addEventNote(event, notes[index].note, updateSubscribers).subscribe(_ => {
        this.uploadEventNotes(event, notes, ++index);
      });
    }
  }

  addEventNote(event: Event, note: string, updateEventSubscribers: boolean = true) : Observable<EventNote> {
    return new Observable((subscriber) => {
      this.http.post('/api/notes/', {"note": note, "event": event.url}).subscribe(
        data => {
          if (updateEventSubscribers) {
            this.getSingleEventUpdate(event);
            this.refreshPagedEvents();
          }
          subscriber.next(this.eventApiAdapters.eventNoteAdapter(data));
        },
        error => {
          console.log("Error adding note to event with id "+event.id);
          console.log(error);
        }
      )
    });
  }

  updateEventNote(event: Event, note: EventNote, newValue: string) {
    this.http.patch(note.url, {"note": newValue}).subscribe(
      data => {
        this.getSingleEventUpdate(event);
      },
      error => {
        console.log("Error updating note with id "+note.id);
        console.log(error);
      }
    )
  }

  deleteEventNote(event: Event, note: EventNote) {
    this.http.delete(note.url).subscribe(
      data => {
        this.getSingleEventUpdate(event);
      },
      error => {
        console.log("Error deleting note with id "+note.id);
        console.log(error);
      }
    )
  }

  // recursive function to upload multiple images
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

  public uploadEventImage(event: Event, image: File, updateEventSubscribers: boolean = true) {

    const imgForm = new FormData();
    imgForm.append("image", image, image.name);
    imgForm.append("event", event.url);
    imgForm.append("timestamp", new Date().toISOString());

    return this.http.post('/api/images/', imgForm, {
      reportProgress: true,
      observe: 'events'
    }).pipe(map(httpEvent => {

      if (httpEvent.type == HttpEventType.UploadProgress) {
        const progress = Math.round(100 * httpEvent.loaded / httpEvent.total);
        return { status: 'progress', message: progress };
      }

      if (httpEvent.type == HttpEventType.Response) {
        if (updateEventSubscribers) {
          console.log('sending event update cause all uploads be done');
          this.getSingleEventUpdate(event);
        }
        return httpEvent.body;
      }
      // switch(httpEvent.type) {
      //   case HttpEventType.UploadProgress:
      //     const progress = Math.round(100 * httpEvent.loaded / httpEvent.total);
      //     return { status: 'progress', message: progress };

      //   case HttpEventType.Response:
      //     this.getSingleEventUpdate(event);
      //     return httpEvent.body;

      //   default:
      //     return `Unhandled event: ${httpEvent.type}`;
      // }

    }))
  }

  // clean up
  ngOnDestroy(){
    this.subscriptions.unsubscribe();
  }


}



