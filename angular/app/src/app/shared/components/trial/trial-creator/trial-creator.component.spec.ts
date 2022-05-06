import { async, ComponentFixture, TestBed, inject } from '@angular/core/testing';

import { TrialCreatorComponent } from './trial-creator.component';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {CampaignApiService, TrialApiService} from "../../../services";
import {FormBuilder} from "@angular/forms";
import {Campaign, ClockConfig, Scenario, SystemConfiguration, Tester, Trial} from "../../../models";
import {BehaviorSubject} from "rxjs";
import Spy = jasmine.Spy;
import {By} from "@angular/platform-browser";


export class MockMatDialogRef{
  constructor(){}

  close(){
    console.log("Dialogue Closed");
  }
}

class MockCampaignApiService{
  campaign_subject: BehaviorSubject<Campaign>;
  mock_campaign: Campaign;

  constructor() {
    this.mock_campaign = <Campaign>{
      trialIdMajorName: "Day",
      trialIdMinorName: "Shift",
      trialIdMicroName: "Run"
    };

    this.campaign_subject = new BehaviorSubject<Campaign>(this.mock_campaign);
  }

  getSelectedCampaign() {
    return this.campaign_subject.asObservable();
  }
}

class MockTrialApiService{
  scenario_subject: BehaviorSubject<Scenario[]>;
  config_subject: BehaviorSubject<SystemConfiguration[]>;
  tester_subject: BehaviorSubject<Tester[]>;
  clock_config_subject: BehaviorSubject<ClockConfig[]>

  mock_scenarios: Scenario[];
  mock_syscons: SystemConfiguration[];
  mock_testers: Tester[];
  mock_clock_configs: ClockConfig[];

  constructor() {
    this.mock_scenarios = [
      <Scenario>{url: 'scenario/url/1', name: 'scenario name 1'},
      <Scenario>{url: 'scenario/url/2', name: 'scenario name 2'}
    ];

    this.mock_syscons = [
      <SystemConfiguration>{id: 1, name: 'config name 1', url: 'config1/url'},
      <SystemConfiguration>{id: 2, name: 'config name 2', url: 'config2/url'}
    ];

    this.mock_testers = [
      <Tester>{id: 1, name:'tester 1', url: 'tester1/url'},
      <Tester>{id: 2, name:'tester 2', url: 'tester2/url'}
    ];

    this.mock_clock_configs = [
      <ClockConfig>{name: 'config 1', url: 'config1/url'},
      <ClockConfig>{name: 'config 2', url: 'config2/url'}
    ];

    this.scenario_subject = new BehaviorSubject<Scenario[]>(this.mock_scenarios);
    this.config_subject = new BehaviorSubject<SystemConfiguration[]>(this.mock_syscons);
    this.tester_subject = new BehaviorSubject<Tester[]>(this.mock_testers);
    this.clock_config_subject = new BehaviorSubject<ClockConfig[]>(this.mock_clock_configs);
  }

  getAllScenarios(){
    return this.scenario_subject.asObservable();
  }

  getAllSystemConfigs()
  {
    return this.config_subject.asObservable();
  }

  getAllTesters(){
    return this.tester_subject.asObservable();
  }

  getAllClockConfigs(){
    return this.clock_config_subject.asObservable();
  }

  createTrial(trialForm_value)
  {
    return null;
  }

  editTrial(trial_id, trialForm_value)
  {
    return null;
  }
}

class MockTrialCreator extends TrialCreatorComponent{
  get_campaign_spy: Spy;
  get_scenario_list_spy: Spy;
  get_sysconfig_list_spy: Spy;
  get_testers_list_spy: Spy;
  get_clock_configs_spy: Spy;

  ngOnInit() {
    this.get_campaign_spy = spyOn<any>(this, 'getCampaignIdNames').and.callFake(() => {
      this.selectedCampaign = this['_campaignApiService']['mock_campaign'];
    });

    this.get_scenario_list_spy = spyOn<any>(this, 'getScenarioList').and.callFake(() => {
      this.scenarios = this['_trialApiService']['mock_scenarios'];
    });

    this.get_sysconfig_list_spy = spyOn<any>(this, 'getSysConfigList').and.callFake(() => {
      this.systemConfigs = this['_trialApiService']['mock_syscons'];
      this.systemConfigs.map(config => {
        if (String(this.trial.systemConfiguration) == config.url) {
          this.systemConfigList.push(config.name);
        }
      });
    });

    this.get_testers_list_spy = spyOn<any>(this, 'getTestersList').and.callFake(() => {
      this.testers = this['_trialApiService']['mock_testers'];
      this.testers.map(tester => this.testerList.push(tester.name));
    });

    this.get_clock_configs_spy = spyOn<any>(this, 'getClockConfigList').and.callFake(() => {
      this.clockConfigs = this['_trialApiService']['mock_clock_configs'];
      console.log(this.clockConfigs);
      this.clockConfigs.map(config => this.clockConfigList.push(config));
    });
    super.ngOnInit();
  }
}


describe('TrialCreatorComponent', () => {
  let component: TrialCreatorComponent;
  let fixture: ComponentFixture<TrialCreatorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MockTrialCreator ]
    }).overrideComponent(MockTrialCreator, {
      set: {
        providers: [
          {provide: CampaignApiService, useFactory: () => new MockCampaignApiService()},
          {provide: TrialApiService, useFactory: () => new MockTrialApiService()},
          {provide: MatDialogRef, useFactory: () => new MockMatDialogRef()},
          {provide: MAT_DIALOG_DATA, useFactory: () => <Trial><unknown>{
              startDatetime: new Date(50000),
              idMajor: 'idMajor',
              idMinor: 'idMinor',
              idMicro: 'idMicro',
              scenario: <Scenario>{name: 'scenario name 1'},
              current: true,
              reported: true,
              campaign: 'campaign string',
              note: 'trial note',
              testers: ['tester1/url', 'tester2/url'],
              systemConfiguration: {id: 1, name: 'config name 1', url: 'config1/url'}
            }},
          {provide: FormBuilder}
        ],
      }
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MockTrialCreator);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('getCampaignIdNames() >> get selected campaign and update campaign id names', () => {
    component['get_campaign_spy'].and.callThrough();
    let get_campaign_spy = spyOn(component['_campaignApiService'], 'getSelectedCampaign').and.callThrough();
    component.getCampaignIdNames();
    expect(component.selectedCampaign).toEqual(component['_campaignApiService']['mock_campaign']);
    expect(get_campaign_spy).toHaveBeenCalled();
  });

  it('getScenarioList() >> get list of all scenarios and update scenarios attribute', () => {
    component['get_scenario_list_spy'].and.callThrough();
    let get_scenarios_spy = spyOn(component['_trialApiService'], 'getAllScenarios').and.callThrough();
    component.getScenarioList();
    expect(component.scenarios).toEqual(component['_trialApiService']['mock_scenarios']);
    expect(get_scenarios_spy).toHaveBeenCalled();
  });


  it('getSysConfigList() >> get list of all system configs and update systemConfigs attribute and set controls in formgroup for system_configuration if current trial ' +
    'systemConfiguration == one of the configs url', () => {
    component['get_sysconfig_list_spy'].and.callThrough();
    let get_syscons_spy = spyOn(component['_trialApiService'], 'getAllSystemConfigs').and.callThrough();
    component.trial.systemConfiguration = <SystemConfiguration>{id: 2, name: 'config name 2', url: 'config2/url'};

    let mock_result = ['config name 2'];

    component.getSysConfigList();

    expect(component.systemConfigs).toEqual(component['_trialApiService']['mock_syscons']);
    expect(component.trialForm.get('system_configuration').value).not.toEqual("");
    for(let i = 0; i<component.trialForm.get('system_configuration').value.length; i++)
    {
      expect(component.trialForm.get('system_configuration').value[i]).toEqual(mock_result[i]);
    }
  });


  it('getTestersList() >> get list of all testers and update testers attribute and set controls in formgroup for tester if ' +
    'current trial tester == one of the testers url', () => {
    component['get_testers_list_spy'].and.callThrough();
    let get_testers_spy = spyOn(component["_trialApiService"], 'getAllTesters').and.callThrough();
    component.trial.testers = ['tester1/url', 'tester2/url'];

    let mock_result = ['tester 1', 'tester 2'];
    component.getTestersList();

    expect(get_testers_spy).toHaveBeenCalled();
    expect(component.testers).toEqual(component['_trialApiService']['mock_testers']);
    expect(component.trialForm.get('testers').value).not.toEqual("");
    for(let i = 0; i<component.trialForm.get('testers').value.length; i++)
    {
      expect(component.trialForm.get('testers').value[i]).toEqual(mock_result[i]);
    }
  });

  it('getAllClockConfigs() >> get list of all clock configs and update clock config attribute and set controls in formgroup for clock config if ' +
    'current trial clock config == one of the clock configs url', () => {

    component.trial.clockConfig = 'config1/url';

    let mock_result = [
      'config 1', 
      'config 2'
    ];

    expect(component.clockConfigs).toEqual(component['_trialApiService']['mock_clock_configs']);
    expect(component.trialForm.get('clock_config').value).not.toEqual("");

    for(let i = 0; i<component.trialForm.get('clock_config').value.length; i++)
    {
      expect(component.trialForm.get('clock_config').value[i].name).toEqual(mock_result[i]);
    }
  });


  it('onSubmit() >> calls helper methods modifyTrialPayload, createTrial, editTrial, onNoClick', () => {
    let mod_trial_spy = spyOn(component, 'modifyTrialPayload').and.returnValue(null);
    let create_trial_spy = spyOn(component['_trialApiService'], 'createTrial').and.returnValue(null);
    let edit_trial_spy = spyOn(component['_trialApiService'], 'editTrial').and.returnValue(null);
    let on_no_click_spy = spyOn(component, 'onNoClick').and.returnValue(null);

    component.onSubmit();
    expect(mod_trial_spy).toHaveBeenCalled();
    expect(on_no_click_spy).toHaveBeenCalled();
    expect(create_trial_spy).toHaveBeenCalledWith(component.trialForm.value);

    component.trial.url = 'trial/url';
    component.onSubmit();

    expect(edit_trial_spy).toHaveBeenCalledWith(component.trial.id, component.trialForm.value);
  });


  it('modifyTrialPayload() >> updates scenario, testers, and system configuration form controls', () => {
    component.trialForm.get('testers').setValue([component['_trialApiService']['mock_testers'][0].name]);
    component.trialForm.get('system_configuration').setValue(component['_trialApiService']['mock_syscons'][0].name);
    component.trialForm.get('scenario').setValue(component.trial.scenario.name);

    component.testers = component['_trialApiService']['mock_testers'];
    component.scenarios = component['_trialApiService']['mock_scenarios'];
    component.systemConfigs = component['_trialApiService']['mock_syscons'];

    component.modifyTrialPayload();

    console.log(component.trialForm.get('testers'));
    console.log(component.trialForm.get('system_configuration'));
    console.log(component.trialForm.get('scenario'));

    expect(component.trialForm.get('scenario').value).toEqual(component['_trialApiService']['mock_scenarios'][0].url);
    expect(component.trialForm.get('testers').value).toEqual([component['_trialApiService']['mock_testers'][0].url]);
    expect(component.trialForm.get('system_configuration').value).toEqual(component['_trialApiService']['mock_syscons'][0].url);
  });


  it('onNoClick() >> calls close on dialog window', () => {
    let dialog_spy = spyOn(component.dialogRef, 'close').and.returnValue(null);
    component.onNoClick();
    expect(dialog_spy).toHaveBeenCalled();
  });


  it("mat-card-title new trial NOT NULL when there is NO trial.url, else NULL", () => {
    component.trial.url = "trial/url";
    fixture.detectChanges();

    let card_title = fixture.debugElement.query(By.css('#mat-card-title-new-trial'));
    expect(card_title).toBeNull();

    component.trial.url = null;
    fixture.detectChanges();

    card_title = fixture.debugElement.query(By.css('#mat-card-title-new-trial'));
    expect(card_title).not.toBeNull();
  });


  it("mat-card-title edit trial NOT NULL when there IS a trial.url, else NULL", () => {
    component.trial.url = "trial/url";
    fixture.detectChanges();

    let card_title = fixture.debugElement.query(By.css('#mat-card-title-edit-trial'));
    expect(card_title).not.toBeNull();

    component.trial.url = null;
    fixture.detectChanges();

    card_title = fixture.debugElement.query(By.css('#mat-card-title-edit-trial'));
    expect(card_title).toBeNull();
  });


  it("config options should be populated by each trial systemConfiguration", () => {
    let config_options = fixture.debugElement.queryAll(By.css('#mat-option-configs'));
    expect(config_options.length).toEqual(component.systemConfigs.length);

    for(let i = 0; i < config_options.length; i++){
      expect(config_options[i].properties.innerText.trim()).toEqual(component.systemConfigs[i].name);
    }
  });


  it("scenario options should be populated by each trial scenario", () => {
    let scenario_options = fixture.debugElement.queryAll(By.css('#mat-option-scenarios'));
    expect(scenario_options.length).toEqual(component.scenarios.length);

    for(let i = 0; i < scenario_options.length; i++){
      expect(scenario_options[i].properties.innerText.trim()).toEqual(component.scenarios[i].name);
    }
  });


  it("tester options should be populated by each trial tester", () => {
    let tester_options = fixture.debugElement.queryAll(By.css('#mat-option-testers'));
    expect(tester_options.length).toEqual(component.testers.length);

    for(let i = 0; i < tester_options.length; i++){
      expect(tester_options[i].properties.innerText.trim()).toEqual(component.testers[i].name);
    }
  });


  it("onNoClick is called when cancel button is clicked", () => {
    let no_click_spy = spyOn(component, 'onNoClick').and.returnValue(null);
    let cancel_button = fixture.debugElement.query(By.css('#mat-flat-button-cancel'));

    cancel_button.triggerEventHandler('click', {});
    fixture.detectChanges();

    expect(no_click_spy).toHaveBeenCalled();
  });


  it("onSubmit is called when submit button is clicked", () => {
    let on_submit_spy = spyOn(component, 'onSubmit').and.returnValue(null);
    let submit_button = fixture.debugElement.query(By.css('#mat-flat-button-submit'));

    submit_button.triggerEventHandler('click', {});
    fixture.detectChanges();

    expect(on_submit_spy).toHaveBeenCalled();
  });

});
