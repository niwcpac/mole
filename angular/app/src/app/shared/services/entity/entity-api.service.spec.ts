import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TrialApiService } from '../trial/trial-api.service';


import { EntityApiService } from './entity-api.service';

describe('EntityApiService', () => {
  let service: EntityApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TrialApiService]
    });
    service = TestBed.inject(EntityApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
