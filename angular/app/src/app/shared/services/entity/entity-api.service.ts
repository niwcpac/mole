import { Injectable, OnDestroy } from '@angular/core';
import { TrialApiService } from '../trial/trial-api.service';
import { EntityApiAdapters } from './entity-api.adapter';
import { Subscription, BehaviorSubject, Observable } from 'rxjs';
import { map } from "rxjs/operators";
import { Entity, EntityPageResult } from '../../models';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class EntityApiService implements OnDestroy {

  private subscriptions = new Subscription();
  private selectedScenarioEntitiesSubject: BehaviorSubject<Entity[]>;
  private selectedScenarioEntities: Entity[];

  private currrentPageUrl: string;

  private entityApiAdapters = new EntityApiAdapters();


  constructor(
    private http: HttpClient,
    private _trialApiService: TrialApiService
  ) {
    
    this.selectedScenarioEntitiesSubject = new BehaviorSubject<Entity[]>([]);
    this.selectedScenarioEntities = [];
    
    this.subscriptions.add(this._trialApiService.getSelectedTrial().subscribe(
      data=>{
        if (!data) {
          return;
        }
        
        if (data.scenario) {
          // build query string
          this.currrentPageUrl = '/api/entities?group__in=';

          // get all entity group ids in selected trial to build query
          if (data.scenario.entityGroups) {
            data.scenario.entityGroups.forEach(group => {
              // extract group ids from urls
              var split = group.split('/');
              var groupId = split[split.length-2];
              this.currrentPageUrl = this.currrentPageUrl + groupId + ',';
            });
          }
          
          // remove remaining comma
          this.currrentPageUrl = this.currrentPageUrl.substr(0, this.currrentPageUrl.length-1);

          this.loadSelectedTrialEntities();
        }
      },
      err => console.log(err),
      () => console.log('done loading trial')
    ))

  }

  private loadSelectedTrialEntities() {
    let entitiesRequest: Observable<EntityPageResult> = this.http.get(this.currrentPageUrl)
    .pipe(
      map((data: any) => this.entityApiAdapters.entityPageResultAdapter(data))
    )

    this.subscriptions.add(entitiesRequest.subscribe(
      data => {
        this.selectedScenarioEntities = this.selectedScenarioEntities.concat(data.results);
        this.selectedScenarioEntitiesSubject.next(this.selectedScenarioEntities);
        if (data.next) {
          this.currrentPageUrl = data.next;
          this.loadSelectedTrialEntities();
        }
      }
    ))
  }

  getSelectedTrialEntities(): Observable<Entity[]> {
    return this.selectedScenarioEntitiesSubject.asObservable();
  }

  // clean up
  ngOnDestroy(){
    this.subscriptions.unsubscribe();
  }
}