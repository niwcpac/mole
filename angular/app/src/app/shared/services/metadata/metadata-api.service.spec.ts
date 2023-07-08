import { TestBed } from '@angular/core/testing';

import { MetadataApiService } from './metadata-api.service';

describe('MetadataKeyApiService', () => {
  let service: MetadataApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MetadataApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
