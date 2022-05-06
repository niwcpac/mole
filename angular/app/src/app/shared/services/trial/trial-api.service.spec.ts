import {TestBed, fakeAsync} from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { TrialApiService } from "./trial-api.service";
import { RouterTestingModule } from '@angular/router/testing';
import {Router} from "@angular/router";

import {Observable, Subject} from "rxjs";
import {Scenario, SystemConfiguration, Tester, Trial, TrialClockState, TrialEventCount} from "../../models";
import Spy = jasmine.Spy;


describe('TrialApiService', () => {
  let trial_service: TrialApiService;
  let http_testing_client: HttpTestingController;
  let auth_router: Router;
  let trial_api_service_spy: Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [TrialApiService]
    });
    /*
    * Must use spy on TrialApiService since its constructor uses a method that uses a get request.
    * If not mocked for initialization then all tests with http requests will fail since the HttpTestingController
    * will think there are unresolved http requests.
    * */
    trial_api_service_spy = spyOn<any>(TrialApiService.prototype, 'initCurrentTrial').and.returnValue(null);
    trial_service = TestBed.inject(TrialApiService);
    auth_router = TestBed.inject<any>(Router);
    auth_router.initialNavigation();
    http_testing_client = TestBed.inject<any>(HttpTestingController);
  });

  /*
    run after every single test to make sure that our httpMock expectations are met
   */
  afterEach(() => {
    http_testing_client.verify();
  }); //end of afterEach()


  it('should be created ', fakeAsync(() => {
    expect(trial_service).toBeTruthy();
  }));


  it('initCurrentTrial() No Selected Trial >> expect trial object returned from get request and update Trial Api with current Trial', fakeAsync(() => {

    let mock_trial_obj = <Trial>{
      url: 'trial/url'
    };

    let mock_trial_obj2 = <Trial>{
      url: 'trial/url/2'
    };

    trial_api_service_spy.and.callThrough(); //Make sure to call original initCurrentTrial function
    trial_service['initCurrentTrial']();

    let trial_adapter_spy = spyOn(trial_service['trialApiAdapters'], 'trialAdapter').and.returnValue(mock_trial_obj);
    let init_event_count_spy = spyOn<any>(trial_service, 'initEventCount').and.returnValue(null);

    const req = http_testing_client.expectOne('/api/trials/current');
    expect(req.request.method).toEqual('GET');

    req.flush(mock_trial_obj);

    expect(trial_adapter_spy).toHaveBeenCalledWith(mock_trial_obj);
    expect(trial_service['currentTrial']).toEqual(mock_trial_obj);
    trial_service['currentTrialSubject'].subscribe(data => {
      expect(data).toEqual(mock_trial_obj);
    });
    expect(trial_service['selectedTrial']).toEqual(mock_trial_obj);
    trial_service['selectedTrialSubject'].subscribe(data => {
      expect(data).toEqual(mock_trial_obj);
    });
    expect(init_event_count_spy).toHaveBeenCalled();
  }));


  it('initCurrentTrial() Already Selected Trial >> expect trial object returned from get request and update Trial Api with current Trial', fakeAsync(() => {

    let mock_trial_obj = <Trial>{
      url: 'trial/url'
    };
    let mock_trial_obj2 = <Trial>{
      url: 'trial/url/2'
    };

    trial_api_service_spy.and.callThrough(); //Make sure to call original initCurrentTrial function
    trial_service['initCurrentTrial']();

    spyOn(trial_service['trialApiAdapters'], 'trialAdapter').and.returnValue(mock_trial_obj2);
    let init_event_count_spy = spyOn<any>(trial_service, 'initEventCount').and.returnValue(null);

    const req = http_testing_client.expectOne('/api/trials/current');
    expect(req.request.method).toEqual('GET');

    trial_service['selectedTrial'] = mock_trial_obj

    req.flush(mock_trial_obj2);

    expect(trial_service['selectedTrial']).not.toEqual(mock_trial_obj2);
    expect(init_event_count_spy).not.toHaveBeenCalled();
  }));


  it('initAllTrials() >> emit all trial objects', fakeAsync(() => {
    let mock_get_obj = <Trial[]>[
      <Trial>{url: 'trial/url/1'},
      <Trial>{url: 'trial/url/2'}
    ];

    let trial_adapter_spy = spyOn(trial_service['trialApiAdapters'], 'trialAdapter').and.callFake(data => {
      return data;
    });

    trial_service['initAllTrials']();

    const req = http_testing_client.expectOne('/api/trials/');
    expect(req.request.method).toEqual('GET');

    req.flush(mock_get_obj);

    expect(trial_adapter_spy).toHaveBeenCalledWith(mock_get_obj[0]);
    expect(trial_adapter_spy).toHaveBeenCalledWith(mock_get_obj[1]);
    expect(trial_service['allTrials']).toEqual(mock_get_obj);
    trial_service['allTrialsSubject'].subscribe(data => {
      expect(data).toEqual(mock_get_obj);
    });

  }));


  it('initEventCount() >> initializes event count for Trial and emits on eventCountSubject.', fakeAsync(() => {
    let mock_trial_obj = <TrialEventCount>{
      total: 1,
      events: null
    };

    let mock_trial = <Trial>{
      id: 1
    };

    let event_count_adapter_apy = spyOn(trial_service['trialApiAdapters'], 'eventCountAdapter').and.returnValue(mock_trial_obj);

    trial_service['currentTrial'] = mock_trial;
    trial_service['selectedTrial'] = mock_trial;
    trial_service['initEventCount']();

    const req = http_testing_client.expectOne('/api/trials/1/event_count');
    expect(req.request.method).toEqual('GET');
    req.flush(mock_trial_obj);

    expect(event_count_adapter_apy).toHaveBeenCalledWith(mock_trial_obj);
    trial_service['eventCountSubject'].subscribe(data => {
      expect(data).toEqual(mock_trial_obj);
    });

  }));


  it('setClockStateFromApi() >> initializes clock state from api/trials/{id}/clock_state.', fakeAsync(() => {
    let date = new Date();

    let mock_clock_state_obj = <TrialClockState>{
      message: "Test clock message",
      baseTime: date
    }
    let mock_trial = <Trial>{
      id: 1
    };
    let clock_state_adapter_spy = spyOn(trial_service['trialApiAdapters'], 'clockStateAdapter').and.returnValue(mock_clock_state_obj);

    trial_service['currentTrial'] = mock_trial;
    trial_service['setClockStateFromApi']();

    const req = http_testing_client.expectOne('/api/trials/1/clock_state');
    expect(req.request.method).toEqual('GET');
    req.flush(mock_clock_state_obj);

    expect(clock_state_adapter_spy).toHaveBeenCalledWith(mock_clock_state_obj);
    trial_service['clockStateSubject'].subscribe(data => {
      expect(data).toEqual(mock_clock_state_obj);
    })
  }));


  it('getCurrentEventCounts() >> returns current array of event counts without waiting on poll', () => {
    let mock_event_counts = {
      total: 3,
      events: [{name:'event 1', count: 2}]
    };
    trial_service['eventCounts'] = mock_event_counts;

    let event_counts = trial_service.getCurrentEventCounts();
    expect(event_counts).toEqual(mock_event_counts);
  });


  it('getCurrentTrial() >> Get reference to currentTrialSubject BehaviorSubject as observable object', () => {
    expect(trial_service.getCurrentTrial()).toBeInstanceOf(Observable);
  });


  it('getSelectedTrial() >> Get reference to selectedTrialSubject Subject as observable object', () => {
    expect(trial_service.getSelectedTrial()).toBeInstanceOf(Observable);
  });


  it('getAllTrials() >> Get reference to allTrialsSubject BehaviorSubject as observable object', () => {
    expect(trial_service.getAllTrials()).toBeInstanceOf(Observable);
  });


  it('getEventCount() >> Get reference to eventCountSubject BehaviorSubject as observable object', () => {
    expect(trial_service.getEventCount()).toBeInstanceOf(Observable);
  });


  it('getAllScenarios() >> returns an Observable of type Scenario[]', fakeAsync(() => {
    let mock_scenario_obj = <Scenario[]>[
      <Scenario>{url: 'scenario/url/1'},
      <Scenario>{url: 'scenario/url/2'}
    ];

    let trial_scen_adapt_spy = spyOn(trial_service['trialApiAdapters'], 'scenarioAdapter').and.callFake(data => {
      return data;
    });

    let func_results = trial_service.getAllScenarios();
    func_results.subscribe(data => {});

    const req = http_testing_client.expectOne("/api/scenarios/");
    expect(req.request.method).toEqual('GET');
    req.flush(mock_scenario_obj);

    expect(trial_scen_adapt_spy).toHaveBeenCalledWith(mock_scenario_obj[0]);
    expect(trial_scen_adapt_spy).toHaveBeenCalledWith(mock_scenario_obj[1]);
    expect(func_results).toBeInstanceOf(Observable);
  }));


  it('getAllSystemConfigs() >> returns an Observable of type SystemConfiguration[]', fakeAsync(() => {
    let mock_syscon_obj = <SystemConfiguration[]>[
      <SystemConfiguration>{id: 1},
      <SystemConfiguration>{id: 2}
    ];

    let trial_syscon_adapt_spy = spyOn(trial_service['trialApiAdapters'], 'systemConfigurationAdapter').and.callFake(data => {
      return data;
    });

    let func_results = trial_service.getAllSystemConfigs();
    func_results.subscribe(data => {});

    const req = http_testing_client.expectOne('/api/system_configurations/');
    expect(req.request.method).toEqual('GET');
    req.flush(mock_syscon_obj);

    expect(trial_syscon_adapt_spy).toHaveBeenCalledWith(mock_syscon_obj[0]);
    expect(trial_syscon_adapt_spy).toHaveBeenCalledWith(mock_syscon_obj[1]);
    expect(func_results).toBeInstanceOf(Observable);
  }));


  it('getAllTesters() >> returns an Observable of type Testers[]', fakeAsync(() => {
    let mock_tester_obj = <Tester[]>[
      <Tester>{id: 1},
      <Tester>{id: 2}
    ];

    let trial_tester_adapt_spy = spyOn(trial_service['trialApiAdapters'], 'testersAdapter').and.callFake(data => {
      return data;
    });

    let func_results = trial_service.getAllTesters();
    func_results.subscribe(data => {});

    const req = http_testing_client.expectOne('/api/testers/');
    expect(req.request.method).toEqual('GET');
    req.flush(mock_tester_obj);

    expect(trial_tester_adapt_spy).toHaveBeenCalledWith(mock_tester_obj[0]);
    expect(trial_tester_adapt_spy).toHaveBeenCalledWith(mock_tester_obj[1]);
    expect(func_results).toBeInstanceOf(Observable);
  }));


  it('setSelectedTrial(trial: Trial) >> sets selected trial and emits new value', fakeAsync(() => {
    let mock_trial_obj = <Trial>{url: 'trial/url'};
    let init_event_count_spy = spyOn<any>(trial_service, 'initEventCount').and.returnValue(null);

    trial_service.setSelectedTrial(mock_trial_obj);
    expect(trial_service['selectedTrial']).toEqual(mock_trial_obj);
    trial_service['selectedTrialSubject'].subscribe(data => {
      expect(data).toEqual(mock_trial_obj);
    })
    expect(init_event_count_spy).toHaveBeenCalled();
  }));


  it('createTrial(trial) >> creates new trial and emits new trial data', fakeAsync(() => {
    let mock_trial_obj = <Trial>{url: 'trial/url'};
    let trial_adapter_spy = spyOn<any>(trial_service['trialApiAdapters'], 'trialAdapter').and.returnValue(mock_trial_obj);

    trial_service.createTrial(mock_trial_obj);

    const req = http_testing_client.expectOne('api/trials/');
    expect(req.request.method).toEqual('POST');
    req.flush(mock_trial_obj);

    expect(trial_adapter_spy).toHaveBeenCalledWith(mock_trial_obj);
    expect(trial_service['selectedTrial']).toEqual(mock_trial_obj);
    trial_service['selectedTrialSubject'].subscribe(data => {
      expect(data).toEqual(mock_trial_obj);
    });
  }));


  it("editTrial(id, trial) >> patches trial with passed in trial at trial id that was passed", fakeAsync(() => {
    let id = 2;
    let trial = <Trial>{id: 2, name: 'trial 2'};

    trial_service.editTrial(id, trial);

    const req = http_testing_client.expectOne('api/trials/2/');
    expect(req.request.method).toEqual('PATCH');
    req.flush(trial);
  }));


  it("getNextMajorId() >> sets nextMajorId to next id after the largest seen", () => {
    trial_service['allTrials'] = [
      <Trial>{idMajor: 1, idMinor: 1, idMicro: 1},
      <Trial>{idMajor:4, idMinor: 4, idMicro: 4},
      <Trial>{idMajor: 2, idMinor:2, idMicro:2}
    ];

    let expected = {idMajor: 5, idMinor: 0, idMicro: 0};

    expect(trial_service.getNextMajorId()).toEqual(expected);
  });


  it("getNextMinorId() >> sets nextMinorId to next id after largest seen", () => {
    trial_service['selectedTrial'] = <Trial>{idMajor: 5, idMinor: 0, idMicro: 0}
    trial_service['allTrials'] = [
      <Trial>{idMajor: 5, idMinor: 1, idMicro: 1},
      <Trial>{idMajor:4, idMinor: 4, idMicro: 4},
      <Trial>{idMajor: 5, idMinor:2, idMicro:2}
    ];

    let expected = {idMajor: 5, idMinor: 3, idMicro: 0};

    expect(trial_service.getNextMinorId()).toEqual(expected);
  });


  it("getNextMicroId() >> sets nextMicroId to next id after largest seen", () => {
    trial_service['selectedTrial'] = <Trial>{idMajor: 5, idMinor: 3, idMicro: 0}
    trial_service['allTrials'] = [
      <Trial>{idMajor: 5, idMinor: 3, idMicro: 0},
      <Trial>{idMajor:4, idMinor: 4, idMicro: 4},
      <Trial>{idMajor: 5, idMinor:2, idMicro:2}
    ];

    let expected = {idMajor: 5, idMinor: 3, idMicro: 1};

    expect(trial_service.getNextMicroId()).toEqual(expected);
  });

}); //end of describe test suite
