import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {Subscription, Subject, interval, Observable, BehaviorSubject, ReplaySubject} from 'rxjs';
import { map, expand } from "rxjs/operators";

import { TrialApiService } from '../trial/trial-api.service';
import { PosePageResult } from '../../models/map.model';
import { Pose } from "../../models";
import { PoseAdapters } from './pose.adapter'

@Injectable({
  providedIn: 'root'
})
export class PoseApiService implements OnDestroy {
  private subscriptions = new Subscription();
  
  private posesByPoseSourceSubject: Subject<Object>;


  private selectedTrialId: number;
  private INTERVAL_TIME: number = 2000; // 2 second

  constructor(private http: HttpClient, private _trialApiService: TrialApiService) { 
    this.posesByPoseSourceSubject = new Subject();


    // Subscribe to the Trial
    // Whenever the trial changes, this.getInitialEvents will be called
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

    this.subscriptions.add(interval(this.INTERVAL_TIME).subscribe(
      x =>
        {
          console.log("nothing here");
          // some way to refresh poses
        }
      ));
  }

  private getPosesInitial(): void {
    let posesRequest: Observable<PosePageResult> = this.performSearch('/api/poses/', this.selectedTrialId)
    this.subscriptions.add(posesRequest.subscribe(this.catagorizePoses.bind(this)));
  }

  private getPosesContinued(url: string) {
    let posesRequest: Observable<PosePageResult> = this.performSearch(url)
    this.subscriptions.add(posesRequest.subscribe(this.catagorizePoses.bind(this)));
  }

  getPoses(): Observable<Object>{
    return this.posesByPoseSourceSubject.asObservable();
  }

  // break this out to clean up functions
  performSearch = (url, some_id?) => {
    const options = { 
      params: some_id ? new HttpParams().set('trial', some_id) : {}
    };
    return this.http.get(url, options).pipe(
      map((data: any) => PoseAdapters.posePageResultAdapter(data) ),
    );
  }
  catagorizePoses(page: PosePageResult) {
    let main_object = Object();
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
    })

    this.posesByPoseSourceSubject.next(main_object);

    if(page.next){
      this.getPosesContinued(page.next);
    }
  }

  // clean up
  ngOnDestroy(){
    this.subscriptions.unsubscribe();
  }
}
