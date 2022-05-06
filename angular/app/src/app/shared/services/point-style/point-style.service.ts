import { Injectable, OnDestroy } from '@angular/core';
import { Subject, BehaviorSubject, Subscription, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { PointStyleApiAdapters } from './point-style-api.adapter';
import { PointStyle } from '../../models';

@Injectable({
  providedIn: 'root'
})
export class PointStyleService implements OnDestroy {

  private subscriptions = new Subscription();

  private pointStylesMap: Map<string,PointStyle>;

  private pointStyleApiAdapters = new PointStyleApiAdapters();


  constructor(private http: HttpClient) {
    this.initPointStyles();
  }

  // makes call to event_types endpoint, will pull back all event types
  // the constructor subscription should be the only call to this
  private initPointStyles(): void {
    let pointStyleRequest= this.http.get('/api/point_styles/')
    .pipe(
      map((data: any) =>
        data.map( item => this.pointStyleApiAdapters.pointStyleAdapter(item) )
      )
    );

    this.subscriptions.add(pointStyleRequest.subscribe((data: PointStyle[]) => {
        let map:Map<string,PointStyle> = new Map();

        data.forEach(element => {
          element.event_types_styled.forEach(event => {
            map.set(event,element);
          });

          element.entity_types_styled.forEach(entity => {
            map.set(entity,element);
          });
        });
        this.pointStylesMap = map;
      }
    ));


  }

  getPointStyleFromTypeURL(typeURL): PointStyle {
    if(this.pointStylesMap) {
      return this.pointStylesMap.get(typeURL);
    } else {
      return null;
    }
  }


  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

}
