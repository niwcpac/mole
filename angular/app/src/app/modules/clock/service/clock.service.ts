import { BaseCdkCell } from '@angular/cdk/table';
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, interval, Observable, Subscription } from 'rxjs';
import {webSocket, WebSocketSubject} from "rxjs/webSocket";
import { TrialClockState } from 'src/app/shared/models';
import { environment } from 'src/environments/environment';
import { TrialApiService } from '../../../shared/services';
import { ClockStream, ClockConstants } from './clock.model';

@Injectable({
  providedIn: 'root'
})
export class ClockService implements OnDestroy {

  private subscriptions = new Subscription();
  private clockStateSubscription = new Subscription();
  private clockStateWebsocketSubject: WebSocketSubject<any>;

  private clockStreamSubject: BehaviorSubject<string>;
  private currentClockStream: string = "";

  private timerStreamSubject: BehaviorSubject<ClockStream>;
  private currentTimerStream: ClockStream = {
    message: "Clock state not configured",
    messageOnly: true,
    seconds: 0
  };

  private clockState: TrialClockState;
  private cc: ClockConstants;

  private msUntilNextUpdate: number = null;
  private nextUpdateTimeout: any;

  private oneDay = 1000 * 60 * 60 * 24;

  // we need to sync the interval time for every system
  // we can assume an NTP server is in use
  private INTERVAL_TIME: number = 1000;
  private intervalOffset: number = 0;
  private expectedInterval: number = 0;

  private clockStateAPIRequestReceived: boolean = false;

  constructor(
    private _trialApiService: TrialApiService
  ) {

    this.cc = new ClockConstants();
    this.clockStreamSubject = new BehaviorSubject(this.currentClockStream);
    this.timerStreamSubject = new BehaviorSubject(this.currentTimerStream);

    // get initial timer state from API
    this.clockStateSubscription = this._trialApiService.getTimerState().subscribe(
      state => {
        if (state) {
          this.clockStateAPIRequestReceived = true;
          this.clockState = state;
          console.log('Got clock state from API:', this.clockState);
        }
      }
    );
    this.subscriptions.add(this.clockStateSubscription);
    // subscribe to websocket for future updates
    this.openWebsocketConnection();

    // the time of page load may offset clock, a timeout will sync it
    this.expectedInterval = Date.now() + this.INTERVAL_TIME
    this.intervalOffset = this.getIntervalOffset()
    this.timeout(this.intervalOffset).then(
      _ => {
        this.subscriptions.add(
          interval(this.INTERVAL_TIME - this.intervalOffset).subscribe(
            x => {
              this.expectedInterval = Date.now() + this.INTERVAL_TIME
              if (this.clockState) {
                this.streamTimer();

                // there currently aren't websocket messages for trial start or end times
                // so we need to manually get the clock state from the API at time of trial
                // start/end times
                if (!this.nextUpdateTimeout) {
                  this.setNextManualRequest(this.clockState);
                }
              }
              this.streamClock();
              this.intervalOffset = this.getIntervalOffset();
            }
          )
        );
      }
    );
  }

  // recursive function that maintains connection to websocket
  // if websocket fails, it sets flag in trial api service to poll the clock state
  // api for periodic updates
  private openWebsocketConnection(err: boolean = false, callTime: number = Date.now()) {
    let subName = this.makeRandomSubName();

    this.clockStateWebsocketSubject = webSocket({
      url: `ws://${window.location.hostname}:${environment.pulsarPort}/ws/v2/consumer/persistent/public/default/game_clock/${subName}`,
    });

    // make sure to not poll from api since websocket connection is established
    if (!err) {
      console.log('Clock state websocket connected after', Date.now() - callTime, "milliseconds.");
      this._trialApiService.setPollClockState(false);
    }

    this.subscriptions.add(this.clockStateWebsocketSubject.asObservable().subscribe(
      data => {
        // send ack
        this.clockStateWebsocketSubject.next({"messageId": data.messageId});

        // parse data
        let parsedState = atob(data.payload);
        let decodedState = JSON.parse(parsedState);
        this.clockState = this._trialApiService.trialApiAdapters.clockStateAdapter(decodedState);
        console.log('Got clock state from websocket:', this.clockState);

        if (decodedState["calltime"]) {
          console.log('Game clock transition latency:', Date.now() - decodedState["calltime"],"ms");
        }

        // new clock state may effect when we manually request the state again,
        // clear the schedule and generate a new one
        this.clearNextClockSchedule();
        this.setNextManualRequest(this.clockState);

      },
      err => {
        let errorTime = Date.now();
        console.error("Connection to clock state websocket failed.", err);
        
        // poll clock state API in case where websocket doesn't work
        this._trialApiService.setPollClockState(true);

        // attempt reconnect, but delay 10 seconds to not spam
        setTimeout(()=> {this.openWebsocketConnection(true, errorTime)}, 10000);
      },
      () => {
        let closeTime = Date.now();
        console.log("Connection to clock state websocket closed, attempting to reconnect.");

        // connection closed, set poll and attempt reconnect
        this._trialApiService.setPollClockState(true);
        this.openWebsocketConnection(false, closeTime);
      }
    ));
  }

  // this function looks at the trial start and end times that the clock is tracking,
  // then it selects the soonest and requests to schedule an api request at that time
  private setNextManualRequest(clockState: TrialClockState) {
    if (clockState) {
      // get trial start in ms
      if (this.clockState.trialId && this.clockState.timezone) {

        // get current time in timezone specified by the clock state
        // let nowMs = this.convertTZ(new Date(), clockState.timezone).getTime();
        let nowDate = this.convertTZ(new Date(), clockState.timezone);
        let nextCall = 0;

        // schedule the next manual clock state call on trial start or end times
        [clockState.nextTime, clockState.trialStartTime, clockState.trialEndTime].forEach(
          date => {
            if (date) {
              // let dateMs = this.convertTZ(date, clockState.timezone).getTime();
              let dateObj = this.convertTZ(date, clockState.timezone);

              // verify time is in the future
              if (nowDate < dateObj) {
                let diff = dateObj.getTime() - nowDate.getTime();

                if (nextCall == 0) {
                  nextCall = diff;
                }
                else if (diff < nextCall) {
                  nextCall = diff;
                }
                
              }
            }
          }
        );

        // only schedule the call if within a day
        if ((nextCall > 0) && (nextCall < this.oneDay)) {
          this.scheduleManualUpdate(nextCall);
        }

      }

      // recursive call if minor and/or major states are specified
      if (clockState.minor) {
        this.setNextManualRequest(clockState.minor);
      }
      if (clockState.major) {
        this.setNextManualRequest(clockState.major);
      }
      if (clockState.reported) {
        this.setNextManualRequest(clockState.reported);
      }

    }
  }

  // this function compares the requested update schedule with the current
  // if the requested is sooner than the current, it clears the current and
  // schedules the requested
  private scheduleManualUpdate(ms) {
    console.log("Attempting to schedule manual update");
    if (this.msUntilNextUpdate == null) {
      this.msUntilNextUpdate = ms;
      this.setUpdateTimeout(ms);
    }
    else {
      if (ms < this.msUntilNextUpdate) {
        this.clearNextClockSchedule();
        this.setUpdateTimeout(ms);
      }
    }
  }

  // this function sets the scheduled api request
  private setUpdateTimeout(ms) {
    // add a little delay to not hit API too early
    this.msUntilNextUpdate = ms;
    console.log('Next scheduled request in', ms/1000, 'seconds');
    this.nextUpdateTimeout = this.timeout(this.msUntilNextUpdate).then(_ => {
      console.log('Scheduled update called.');
      this.clearNextClockSchedule();
      this.getClockStateFromAPI();
    }); 
  }

  // this function handles the schedule clearing when a new one is required
  private clearNextClockSchedule() {
    console.log('Clearing clock schedule');
    clearTimeout(this.nextUpdateTimeout);
    this.nextUpdateTimeout = null;
    this.msUntilNextUpdate = null;
  }

  private getIntervalOffset() {
    var dt = Date.now() - this.expectedInterval;
    return this.INTERVAL_TIME - dt;
  }

  private timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getTimerStream(): Observable<ClockStream> {
    return this.timerStreamSubject.asObservable();
  }

  public getClockStream(): Observable<string> {
    return this.clockStreamSubject.asObservable();
  }

  private getClockStateFromAPI() {
    if (this.clockStateAPIRequestReceived) {
      this._trialApiService.setClockStateFromApi();
      this.clockStateAPIRequestReceived = false;
    }
  }

  private streamClock() {
    this.formatClockStream();
    this.clockStreamSubject.next(this.currentClockStream);
  }

  // this function is called every second if there is a clock state, it controls the 
  // timer tick
  streamTimer() {
    this.currentTimerStream = this.setTimerStream();
          
    // check for minor and major timers
    if (this.clockState.minor) {
      this.currentTimerStream.minor = this.setTimerStream(this.clockState.minor);
    }
    if (this.clockState.major) {
      this.currentTimerStream.major = this.setTimerStream(this.clockState.major);
    }
    if (this.clockState.reported) {
      this.currentTimerStream.reported = this.setTimerStream(this.clockState.reported);
    }
    this.timerStreamSubject.next(this.currentTimerStream);
  }


  // this function translates the clock state into a message and time string
  setTimerStream(clockState=this.clockState): ClockStream {
    var tempTimerStream: ClockStream = {
      message: "Clock state not configured",
      messageOnly: true,
      seconds: 0
    };

    // set the timer message
    if (clockState.message) {
      tempTimerStream.message = clockState.message;
    }

    // set boolean to hide or show the timer string
    if (clockState.messageOnly) {
      tempTimerStream.messageOnly = clockState.messageOnly;
    }
    else {
      tempTimerStream.messageOnly = false;
    }

    // set the current time
    let nowSeconds = new Date().getTime() / 1000;
    if (clockState.timezone) {
      nowSeconds = this.convertTZ(new Date(), clockState.timezone).getTime() / 1000;
    }
    
    // set the base seconds
    let baseSeconds = 0;
    if (clockState.baseTime) {
      baseSeconds = new Date(clockState.baseTime).getTime() / 1000;

      if (clockState.timezone) {
        baseSeconds = this.convertTZ(new Date(clockState.baseTime), clockState.timezone).getTime() / 1000;
      }
    }
    else {
      return tempTimerStream;
    }

    // set the time string given the current time and counting direction
    if (clockState.countdown) {
      // verify counting down to future time
      if (baseSeconds > nowSeconds) {
        tempTimerStream.seconds = baseSeconds - nowSeconds;
      }
      else {
        tempTimerStream.seconds = 0;
        // manual request next state after countdown ends
        this.getClockStateFromAPI(); 
      }
    }
    else {
      // verify counting up from past time
      if (nowSeconds > baseSeconds) {
        tempTimerStream.seconds = nowSeconds - baseSeconds;
      }
      else {
        tempTimerStream.seconds = 0;
        // manual request next state if count up hasn't started yet (shouldn't happen)
        this.getClockStateFromAPI(); 
      }
    }

    return tempTimerStream;
  }

  private convertTZ(date, tzString) {
    return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", {timeZone: tzString}));   
  }

  // clock stream can be formatted in two different ways:
  // Military: 03 0630U MAR 21
  // Standard: Wednesday, 03 Mar 21 06:30:00 AM
  formatClockStream(milFormat=false) {
    let now = new Date();
    if (this.clockState && this.clockState.timezone) {
      now = this.convertTZ(now, this.clockState.timezone)
    }

    let year = now.getFullYear();
    let month = now.getMonth();
    let date = now.getDate();
    let day = now.getDay();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();
    let tzOffset = now.getTimezoneOffset();

    if (milFormat) {
      this.currentClockStream =
      (date < 10 ? "0" + date : date) + " " +
      (hours < 10 ? "0" + hours : hours) + 
      (minutes < 10 ? "0" + minutes : minutes) + 
      this.cc.tzOffsetToMilTimecodeDict[tzOffset/-60] + " " +
      this.cc.monthArray[month].toUpperCase() + " " +
      year % 100;
    }
    else {
      this.currentClockStream = 
        this.cc.weekdayArray[day] + ", " +
        (date < 10 ? "0" + date : date) + " " +
        this.cc.monthArray[month] + " " +
        year % 100 + " " +
        (hours < 10 ? ("0" + hours) : (hours > 12 ? ((hours-12) < 10 ? ("0"+(hours-12)) : (hours-12)) : hours)) + ":" + 
        (minutes < 10 ? "0" + minutes : minutes) + ":" + 
        (seconds < 10 ? "0" + seconds : seconds) + " " +
        ((hours < 12 || hours == 24) ? "AM" : "PM");
    }

    return this.currentClockStream;
  }

  // random sub names are necessary to not conflict the websocket with multiple clients
  makeRandomSubName() {
    let text = "";
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
    const lengthOfCode = 12;
    for (let i = 0; i < lengthOfCode; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  ngOnDestroy() {
    this.clockStateWebsocketSubject.complete();
    this.subscriptions.unsubscribe();
  }
}
