import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {Subscription, Subject, interval, timer, Observable, BehaviorSubject, ReplaySubject} from 'rxjs';
import { map, expand } from "rxjs/operators";

import { TrialApiService } from '../trial/trial-api.service';
import { PosePageResult } from '../../models/map.model';
import { Pose } from "../../models";
import { PoseAdapters } from './pose.adapter'

@Injectable({
  providedIn: 'root'
})
export class PoseApiService implements OnDestroy {
  private subscriptions: Subscription;
  private posesByPoseSourceSubject: Subject<Object>;
  private selectedTrialId: number;
  private INTERVAL_TIME: number;
  private mostRecentPoseID: number;

  constructor(private http: HttpClient, private _trialApiService: TrialApiService) { 
    this.subscriptions = new Subscription();
    this.posesByPoseSourceSubject = new Subject();
    this.INTERVAL_TIME = 2000 // 2 seconds
    this.mostRecentPoseID = 0;

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
          
          // some way to retrieve initial poses
          this.getPosesInitial();

        }
      },
      err => console.error(err),
    ));
  }
  // break this out to clean up functions
  private performSearch = (url, poseID?:number , some_id?:number) => {
    let myParams = new HttpParams();
    if (some_id) {
      myParams = myParams.set('trial', some_id);
    }
    if (poseID) {
      myParams = myParams.set('id_gt', poseID);
    }
    const options = { 
      params: myParams
    };
    return this.http.get(url, options).pipe(
      map((data: any) => PoseAdapters.posePageResultAdapter(data) ),
    );
  }

  // retrieve poses using trial id
  private getPosesInitial(): void {
    let posesRequest: Observable<PosePageResult> = this.performSearch('/api/poses/', this.mostRecentPoseID, this.selectedTrialId)
    this.subscriptions.add(posesRequest.subscribe(this.catagorizePoses.bind(this)));
  }

  // retrieve poses using django cursor pagination url
  private getPosesContinued(url: string) {
    let posesRequest: Observable<PosePageResult> = this.performSearch(url)
    this.subscriptions.add(posesRequest.subscribe(this.catagorizePoses.bind(this)));
  }

  // sort poses by pose source, then by entity
  catagorizePoses(page: PosePageResult) {
    let main_object = {};
    page.results.forEach((pose) => {
      if (pose.pose_source && pose.pose_source.name) {
        if (!main_object.hasOwnProperty(pose.pose_source.name)) {
          main_object[pose.pose_source.name] = {};
        }
        if(!main_object[pose.pose_source.name].hasOwnProperty(pose.entity.name)) {
          main_object[pose.pose_source.name][pose.entity.name] = [];
        }
        main_object[pose.pose_source.name][pose.entity.name] = [...main_object[pose.pose_source.name][pose.entity.name], pose];
      }
      // TODO potential for missing data since pose api is ordered by descending id
      // if there's an error in the middle of processing
      this.mostRecentPoseID = pose.id > this.mostRecentPoseID ? pose.id : this.mostRecentPoseID;
    })

    this.posesByPoseSourceSubject.next(main_object);
    if(page.next){
      this.getPosesContinued(page.next);
    }
    else {
      // set timer for next API call
      this.subscriptions.add(timer(this.INTERVAL_TIME).subscribe(
        x => {
          this.getPosesInitial();
        }
      ));
    }
  }

  getPoses(): Observable<Object>{
    return this.posesByPoseSourceSubject.asObservable();
  }

  // clean up
  ngOnDestroy(){
    this.subscriptions.unsubscribe();
  }
}
