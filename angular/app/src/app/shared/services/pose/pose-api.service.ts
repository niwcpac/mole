import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {Subscription, Subject, interval, timer, Observable, BehaviorSubject, ReplaySubject} from 'rxjs';

import { TrialApiService } from '../trial/trial-api.service';
import { Pose } from "../../models";
import { PoseAdapters } from './pose.adapter'

@Injectable({
  providedIn: 'root'
})
export class PoseApiService implements OnDestroy {
  private subscriptions: Subscription;
  private trialPoses: Subject<Pose[]>;
  private selectedTrialId: number;
  private INTERVAL_TIME: number;

  // This will hold the recursive calls for the pose API 
  // or a timer for the next call
  private recursiveSubscription: Subscription;

  constructor(private http: HttpClient, private _trialApiService: TrialApiService) { 
    this.subscriptions = new Subscription();
    this.trialPoses = new Subject();
    this.INTERVAL_TIME = 2000 // 2 seconds

    // Subscribe to the Trial
    // Whenever the trial changes, retrieve new poses
    this.subscriptions.add(this._trialApiService.getSelectedTrial().subscribe(
      data=>{
        if (!data) {
          return;
        }

        // trial-api service will detect the changes
        if(data.id) {
          this.selectedTrialId = data.id;
          if (this.recursiveSubscription) {
            this.recursiveSubscription.unsubscribe();
          }
          
          // some way to retrieve initial poses
          this.getPosesBase();

        }
      },
      err => console.error(err),
    ));
  }
  // break this out to clean up functions
  private performSearch = (url , some_id?:number) => {
    let myParams = new HttpParams();
    if (some_id) {
      myParams = myParams.set('trial', some_id);
    }
    // exclude map_marker entity from list of poses
    myParams = myParams.set('excluding', 'map_marker');
      const options = { 
      params: myParams
    };
    return this.http.get(url, options);
  }

  // retrieve poses using trial id
  private getPosesBase(): void {
    let posesRequest: Observable<Object> = this.performSearch('/api/poses/latest/', this.selectedTrialId)
    this.subscriptions.add(
      posesRequest.subscribe({
        next: (val:Pose[]) => {
          // Apply pose adapter to clean up from django GET response
          let newArray:Pose[] = []
          val.forEach(child => {
            newArray = [...newArray, PoseAdapters.poseAdapter(child)];
          });
          this.trialPoses.next(newArray);
        },
        error: (e) => console.error(e),
      })
    );
    // set timer for next API call
    this.subscriptions.add(timer(this.INTERVAL_TIME).subscribe(
      x => {
        this.getPosesBase();
      }
    ));
  }

  getPoses(): Observable<Object>{
    return this.trialPoses.asObservable();
  }

  // clean up
  ngOnDestroy(){
    this.subscriptions.unsubscribe();
  }
}