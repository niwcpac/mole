import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TrialApiService } from "../../../shared/services";


import { ClockService } from './clock.service';

describe('ClockService', () => {
  let service: ClockService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [TrialApiService]
    });
    service = TestBed.inject(ClockService);
    jasmine.clock().install();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should make timer stream from clock state', () => {
    let current_time = new Date("2021-03-03 6:30:00.000000");
    jasmine.clock().mockDate(current_time);

    let clock_state_tests = [
      {
        trialId: 1, // counting down to future time, should return 30 minutes in seconds
        timezone: "America/Los_Angeles",
        message: "test",
        messageOnly: false,
        countdown: true,
        baseTime: new Date("2021-03-03 7:00:00.000000"),
        _expected: {
          message: "test",
          messageOnly: false,
          seconds: 1800
        }
      },
      {
        trialId: 2, // counting up from past time, should return 60 minutes in seconds
        timezone: "America/Los_Angeles",
        message: "minor",
        messageOnly: true,
        countdown: false,
        baseTime: new Date("2021-03-03 5:30:00.000000"),
        _expected: {
          message: "minor",
          messageOnly: true,
          seconds: 3600
        }
      },
      {
        trialId: 3, // counting down to past time, should return 0 seconds
        timezone: "America/Los_Angeles",
        message: "major",
        messageOnly: false,
        countdown: true,
        baseTime: new Date("2021-03-03 4:00:00.000000"),
        _expected: {
          message: "major",
          messageOnly: false,
          seconds: 0
        }
      },
      {
        trialId: 4, // counting up to future time, should return 0 seconds
        timezone: "America/Los_Angeles",
        message: "test2",
        messageOnly: true,
        countdown: false,
        baseTime: new Date("2021-03-03 11:00:00.000000"),
        _expected: {
          message: "test2",
          messageOnly: true,
          seconds: 0
        }
      }
    ];
    
    clock_state_tests.forEach(state => {
      let stream_in_test = service.setTimerStream(state);
      expect(stream_in_test).toEqual(state._expected);
    });

  });

  it('should format current time clock stream', () => {
    let current_time = new Date("2021-03-03 6:30:00.000000");
    jasmine.clock().mockDate(current_time);

    let expected_standard = "Wednesday, 03 Mar 21 06:30:00 AM";
    let expected_mil = "03 0630. MAR 21";

    let actual_standard = service.formatClockStream(false);
    let actual_mil = service.formatClockStream(true);

    expect(actual_standard).toEqual(expected_standard);
    expect(actual_mil).toMatch(expected_mil);
  });

  afterEach(function() {
    jasmine.clock().uninstall();
  });
});
