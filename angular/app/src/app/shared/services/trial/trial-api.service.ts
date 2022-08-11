import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject, ReplaySubject, Subscription, from, interval } from "rxjs";
import { map, take } from "rxjs/operators";
import { CookieService } from 'ngx-cookie-service';
import { AuthService } from '../auth/auth.service';
import { EventPayloadApiAdapters } from '../auth/payload.adapter';
import { SharedHelpers } from '../../shared.helpers';
import { TrialEventCount, Trial, TrialId, Scenario, SystemConfiguration, Testers, TrialClockState } from "../../models";
import { TrialApiAdapters } from "./trial-api.adapter";
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})

export class TrialApiService implements OnDestroy {
  private subscriptions = new Subscription();

  private sharedHelpers = new SharedHelpers();

  private allTrialsSubject: BehaviorSubject<Trial[]>;
  private currentTrialSubject: BehaviorSubject<Trial>;
  private selectedTrialSubject: Subject<Trial>;
  private trialsWebsocketSubject: WebSocketSubject<any>;
  private eventsWebsocketSubject: WebSocketSubject<any>;
  private eventCountSubject: BehaviorSubject<TrialEventCount>;
  private clockStateSubject: BehaviorSubject<TrialClockState>;

  private allTrials: Trial[];
  private currentTrial: Trial;
  private eventCounts: TrialEventCount;
  private currentClockState: TrialClockState;
  private doPollClockState: boolean = false;
  public selectedTrial: Trial;

  private INTERVAL_TIME: number = 2000;

  public trialApiAdapters = new TrialApiAdapters();
  private eventPayloadApiAdapters = new EventPayloadApiAdapters();

  constructor(private http: HttpClient, private cookie: CookieService) {

    this.allTrialsSubject = new BehaviorSubject(null);
    this.currentTrialSubject = new BehaviorSubject(null);
    this.selectedTrialSubject = new BehaviorSubject(null);

    this.eventCountSubject = new BehaviorSubject(null);
    this.clockStateSubject = new BehaviorSubject(null);

    this.openTrialsWebsocketConnection();
    this.openEventsWebsocketConnection();
    this.initCurrentTrial();
    this.initAllTrials();
    this.subscriptions.add(this.clockStateSubject);
    this.subscriptions.add(interval(this.INTERVAL_TIME).subscribe(
      x => {
        // this.initCurrentTrial();
        // this.initAllTrials();
        // this.initEventCount();

        if (!this.currentClockState || this.doPollClockState) {
          if (this.doPollClockState) {
            console.log('Polling clock state due to websocket error.');
          }
          this.setClockStateFromApi();
        }
      }
    ));
  }

  private initCurrentTrial() {
    let currentTrialRequest = this.http.get('/api/trials/current')
      .pipe(
        map((trial: any) => this.trialApiAdapters.trialAdapter(trial))
      );

    this.subscriptions.add(currentTrialRequest.subscribe(
      result => {
        this.currentTrial = result;
        this.currentTrialSubject.next(this.currentTrial);

        // on init, no trial selected so set the current as the selected
        this.setSelectedTrial(this.currentTrial);
      }
    ));
  }

  private initAllTrials() {
    let allTrialsRequest = this.http.get('/api/trials/')
      .pipe(
        map((data: any[]) => data.map((trial: any) => this.trialApiAdapters.trialAdapter(trial)))
      );

    this.subscriptions.add(allTrialsRequest.subscribe(
      result => {
        this.allTrials = result;
        this.allTrialsSubject.next(this.allTrials);
      }
    ));
  }

  private openTrialsWebsocketConnection(err: boolean = false, callTime: number = Date.now()) {
    let subName = this.sharedHelpers.makeRandomSubName();

    this.trialsWebsocketSubject = webSocket({
      url: `ws://${window.location.hostname}:${environment.pulsarPort}/ws/v2/consumer/persistent/public/default/_trial_log/${subName}`,
    });

    // make sure to not poll from api since websocket connection is established
    if (!err) {
      console.log('Trial websocket connected after', Date.now() - callTime, "milliseconds.");
    }

    this.subscriptions.add(this.trialsWebsocketSubject.asObservable().subscribe(
      data => {
        // send ack
        this.trialsWebsocketSubject.next({"messageId": data.messageId});

        // parse data
        let parsedTrial = atob(data.payload);
        let decodedTrial = JSON.parse(parsedTrial);
        let trial = this.trialApiAdapters.trialAdapter(decodedTrial);
        console.log('Got trial from websocket:', trial);

        if (decodedTrial.update) {
          // a trial has been updated
          for (let i=0; i<this.allTrials.length; i++) {
            if (trial.id == this.allTrials[i].id) {
              this.allTrials[i] = trial;
              break;
            }
          }
        }
        else {
          // a trial has been created
          this.allTrials.push(trial);
        }

        if (trial.current) {
          // only one trial can be current, set previous current trial to current=false
          if (trial.id != this.currentTrial.id) {
            for (let i=0; i<this.allTrials.length; i++) {
              if (this.currentTrial.id == this.allTrials[i].id) {
                this.allTrials[i].current = false;
                break;
              }
            }
          }
          this.currentTrial = trial;
          this.currentTrialSubject.next(this.currentTrial);
        }

        if (trial.id == this.selectedTrial.id) {
          this.selectedTrial = trial;
          this.selectedTrialSubject.next(this.selectedTrial);
        }

        this.allTrialsSubject.next(this.allTrials);

      },
      err => {
        let errorTime = Date.now();
        console.error("Connection to trial websocket failed.", err);

        // attempt reconnect, but delay 10 seconds to not spam
        setTimeout(()=> {this.openTrialsWebsocketConnection(true, errorTime)}, 10000);
      },
      () => {
        let closeTime = Date.now();
        console.log("Connection to trial websocket closed, attempting to reconnect.");

        this.openTrialsWebsocketConnection(false, closeTime);
      }
    ));
  }

  private openEventsWebsocketConnection(err: boolean = false, callTime: number = Date.now()) {
    let subName = this.sharedHelpers.makeRandomSubName();

    this.eventsWebsocketSubject = webSocket({
      url: `ws://${window.location.hostname}:${environment.pulsarPort}/ws/v2/consumer/persistent/public/default/_event_log/${subName}`,
    });

    // make sure to not poll from api since websocket connection is established
    if (!err) {
      console.log('Event count websocket connected after', Date.now() - callTime, "milliseconds.");
    }

    this.subscriptions.add(this.eventsWebsocketSubject.asObservable().subscribe(
      data => {
        // send ack
        this.eventsWebsocketSubject.next({"messageId": data.messageId});

        // parse data
        let parsedEvent = atob(data.payload);
        let decodedEvent = JSON.parse(parsedEvent);

        if (decodedEvent.update == false && decodedEvent.trial == this.selectedTrial.id) {
          this.eventCounts.total++;
          for (let i=0; i<this.eventCounts.events.length; i++) {
            if (this.eventCounts.events[i].name == decodedEvent.event_type) {
              this.eventCounts.events[i].count++;
            }
          }

          this.eventCountSubject.next(this.eventCounts);
        }
        // if an event update occurs, we can't know if the event type has changed,
        // so we need to re-init the event count from the API
        else if (decodedEvent.update == true && decodedEvent.trial == this.selectedTrial.id){
          this.initEventCount();
        }

      },
      err => {
        let errorTime = Date.now();
        console.error("Connection to event count websocket failed.", err);

        // attempt reconnect, but delay 10 seconds to not spam
        setTimeout(()=> {this.openEventsWebsocketConnection(true, errorTime)}, 10000);
      },
      () => {
        let closeTime = Date.now();
        console.log("Connection to event count websocket closed, attempting to reconnect.");

        this.openEventsWebsocketConnection(false, closeTime);
      }
    ));
  }

  private initEventCount() {
    if (this.selectedTrial) {
      let eventCountRequest = this.http.get(`/api/trials/${this.selectedTrial.id}/event_count`)
        .pipe(
          map((data: any) => this.trialApiAdapters.eventCountAdapter(data))
        );

      this.subscriptions.add(eventCountRequest.subscribe(result => {
        this.eventCounts = result;
        this.eventCountSubject.next(this.eventCounts);
      }));
    }
  }

  // will return current array of event counts without waiting on poll.
  // used in init functions while waiting on poll to return first result
  public getCurrentEventCounts(): TrialEventCount {
    return this.eventCounts;
  }

  //ACCESSORS
  public getCurrentTrial(): Observable<Trial> {
    return this.currentTrialSubject.asObservable();
  }

  public getSelectedTrial(): Observable<Trial> {
    return this.selectedTrialSubject.asObservable();
  }

  public getAllTrials(): Observable<Trial[]> {
    return this.allTrialsSubject.asObservable();
  }

  public getEventCount(): Observable<TrialEventCount> {
    return this.eventCountSubject.asObservable();
  }

  public getAllScenarios() {
    let scenarioRequest = this.http.get(`/api/scenarios/`)
      .pipe(
        map((scenario: any[]) => scenario.map((scenario: any) => this.trialApiAdapters.scenarioAdapter(scenario)))
      );
    return scenarioRequest;
  }

  public getAllSystemConfigs() {
    let systemConfigRequest = this.http.get(`/api/system_configurations/`)
      .pipe(
        map((config: any[]) => config.map((config: any) => this.trialApiAdapters.systemConfigurationAdapter(config)))
      );
    return systemConfigRequest;
  }

  public getAllTesters() {
    let testersRequest = this.http.get(`/api/testers/`)
      .pipe(
        map((tester: any[]) => tester.map((tester: any) => this.trialApiAdapters.testersAdapter(tester)))
      );
    return testersRequest;
  }

  public getAllClockConfigs() {
    let clockConfigRequest = this.http.get(`/api/clock_configs`)
      .pipe(
        map((clockConfig: any[]) => clockConfig.map((clockConfig: any) => this.trialApiAdapters.clockConfigAdapter(clockConfig)))
      );
    return clockConfigRequest;
  }

  public getTimerState() {
    return this.clockStateSubject.asObservable();
  }

  //MUTATORS
  public setSelectedTrial(trial: Trial) {
    this.selectedTrial = trial;
    this.selectedTrialSubject.next(this.selectedTrial);
    this.initEventCount();
  }

  public createTrial(trial) {
    console.log("Attempting to post trial");
    console.log(trial);
    this.http.post<any>('/api/trials/', trial)
      .subscribe(data => {
        console.log(data)
        // auto-select created trial
        this.selectedTrial = this.trialApiAdapters.trialAdapter(data);
        this.selectedTrialSubject.next(this.selectedTrial);
        this.initEventCount();
      },
        err => {
          console.log(err)
        },
        () => console.log('Trial post complete.')
      );
  }

  public editTrial(id, trial) {
    console.log('attempting patch');
    console.log(id);
    console.log(trial);
    this.http.patch(`/api/trials/${id}/`, trial)
      .subscribe(
        data => {
          console.log(data);
        },
        err => {
          console.log(err);
        },
        () => console.log('Trial patch complete.')
      )
  }

  public setClockStateFromApi() {
    // default to current trial, but allow for specified id
    if (this.currentTrial) {

      // initial API query (clock service has websocket sub for future updates)
      let clockStateRequest = this.http.get(`/api/trials/${this.currentTrial.id}/clock_state`)
        .pipe(
          map((data: any) => this.trialApiAdapters.clockStateAdapter(data))
        );

      clockStateRequest.subscribe(result => {
        this.currentClockState = result;
        this.clockStateSubject.next(this.currentClockState);
      });
      
    }
  }

  public setPollClockState(trueFalse: boolean) {
    this.doPollClockState = trueFalse;
  }

  //HELPERS
  public getNextMajorId(): TrialId {
    var nextId = {
      idMajor: 0,
      idMinor: 0,
      idMicro: 0
    };
    this.allTrials.forEach(trial => {
      if (trial.idMajor > nextId.idMajor) {
        nextId.idMajor = trial.idMajor;
      }
    });
    nextId.idMajor++; // increment major Id to get next
    return nextId;
  }

  public getNextMinorId(): TrialId {
    var nextId = {
      idMajor: this.selectedTrial.idMajor,
      idMinor: 0,
      idMicro: 0
    };
    this.allTrials.forEach(trial => {
      if (trial.idMajor == nextId.idMajor &&
        trial.idMinor > nextId.idMinor) {
        nextId.idMinor = trial.idMinor;
      }
    });
    nextId.idMinor++; // increment minor Id to get next
    return nextId;
  }

  public getNextMicroId(): TrialId {
    var nextId = {
      idMajor: this.selectedTrial.idMajor,
      idMinor: this.selectedTrial.idMinor,
      idMicro: 0
    };
    this.allTrials.forEach(trial => {
      if (trial.idMajor == nextId.idMajor &&
        trial.idMinor == nextId.idMinor &&
        trial.idMicro > nextId.idMicro) {
        nextId.idMicro = trial.idMicro;
      }
    });
    nextId.idMicro++; // increment micro Id to get next
    return nextId;
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

}
