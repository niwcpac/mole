import { TestBed } from '@angular/core/testing';

import { PoseApiService } from './pose-api.service';

describe('PoseApiService', () => {
  let service: PoseApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PoseApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
