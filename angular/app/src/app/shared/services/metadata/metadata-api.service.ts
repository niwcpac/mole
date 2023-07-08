import { Injectable, OnDestroy, OnInit } from '@angular/core';
import { Subscription, Subject, Observable, BehaviorSubject } from 'rxjs';
import { map } from "rxjs/operators";
import { HttpClient } from '@angular/common/http';


import { MetadataKey, MetadataValue } from '../../models';
import { MetadataApiAdapters } from './metadata-api.adapter';

@Injectable({
  providedIn: 'root'
})
export class MetadataApiService implements OnDestroy {
  private subscriptions = new Subscription();

  private metadataKeysSubject: Subject<MetadataKey>;
  private mKeys: Map<string, MetadataKey>;
  private mValues: Map<string, MetadataValue>;

  private MetadataApiAdapters = new MetadataApiAdapters();

  constructor(private http: HttpClient) {
    this.metadataKeysSubject = new Subject<MetadataKey>();
    this.mKeys = new Map<string, MetadataKey>();
    this.mValues = new Map<string, MetadataValue>();
    this.initKeys();
    this.initValues();
  }

  private retrieveKey(urlString: string): void {
    if (this.mKeys.has(urlString)) {
      this.metadataKeysSubject.next(this.mKeys.get(urlString));
    }
    else {
      // Make API call to retrieve the metadata key
      let metadataKeyRequest = this.http.get(urlString)
        .pipe(
          map((data: any) => this.MetadataApiAdapters.MetadataKeyAdapter(data))
        );
      this.subscriptions.add(metadataKeyRequest.subscribe(data => {
        this.mKeys.set(urlString, data);
        this.metadataKeysSubject.next(this.mKeys.get(urlString));
      }));
    }
  }

  private initKeys(): void {
    let metadataKeyRequest = this.http.get('/api/metadata_keys/')
      .pipe(
        map((data: any[]) => data.map(item => this.MetadataApiAdapters.MetadataKeyAdapter(item)))
      );
    this.subscriptions.add(metadataKeyRequest.subscribe(data => {
      data.forEach(function (singleKey: MetadataKey) {
        this.mKeys.set(singleKey.url, singleKey);
      }, this);
    }));
  }

  private initValues(): void {
    let myRequest = this.http.get('/api/metadata_values/')
      .pipe(
        map((data: any) => data.map(item => this.MetadataApiAdapters.MetadataValueAdapter(item)))
      );
    this.subscriptions.add(myRequest.subscribe(data => {
      data.forEach(function (singleValue) {
        this.mValues.set(singleValue.name, singleValue);
      }, this);
    }));
  }

  private retrieveValueDescription(name: string): string {
    return this.mValues.get(name).description;
  }

  getMetadataKeys(): Observable<MetadataKey> {
    return this.metadataKeysSubject.asObservable();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
