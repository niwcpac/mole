import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { Trial, Campaign, ClockConfig } from '../../../models';
import { TrialApiService, AuthService, CampaignApiService } from '../../../services';

@Component({
  selector: 'mole-trial-creator',
  templateUrl: './trial-creator.component.html',
  styleUrls: ['./trial-creator.component.scss'],
})
export class TrialCreatorComponent implements OnInit {

  scenarios: any;
  systemConfigs: any;
  systemConfigList: Array<string> = [];
  testers: any;
  testerName: string;
  testerList: Array<string> = [];
  clockConfigs: any;
  clockConfigList: Array<ClockConfig> = [];
  temp: any;

  selectedCampaign: Campaign;

  min: number = 0;
  max: number = Infinity;
  step: number = 1;
  value: number = 0;
  wrap: boolean = false;


  trialForm: FormGroup;
  updatedTrial: Trial;
  startDatetime: any;
  endDatetime: any;

  constructor(
    private _trialApiService: TrialApiService,
    private _campaignApiService: CampaignApiService,
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<TrialCreatorComponent>,
    @Inject(MAT_DIALOG_DATA) public trial: Trial) { }

  ngOnInit() {

    this.getCampaignIdNames();
    this.getScenarioList();
    this.getSysConfigList();
    this.getTestersList();
    this.getClockConfigList();

    this.trialForm = this.fb.group({
      id_major: [''],
      id_minor: [''],
      id_micro: [''],
      campaign: [''],
      start_datetime: [''],
      end_datetime: [''],
      testers: [''],
      clock_config: [''],
      scenario: [''],
      system_configuration: [''],
      reported: [''],
      current: [''],
      note: ['']
    });

    this.startDatetime = new Date(this.trial.startDatetime);

    if (this.trial.endDatetime) {
      this.endDatetime = new Date(this.trial.endDatetime);
    }

    this.trialForm.get('testers').setValue(this.testerList);
    this.trialForm.get('clock_config').setValue(this.clockConfigList);
    this.trialForm.get('system_configuration').setValue(this.systemConfigList);
    this.trialForm.get('start_datetime').setValue(this.startDatetime);
    this.trialForm.get('end_datetime').setValue(this.endDatetime);
    this.trialForm.get('id_major').setValue(Number(this.trial.idMajor));
    this.trialForm.get('id_minor').setValue(Number(this.trial.idMinor));
    this.trialForm.get('id_micro').setValue(Number(this.trial.idMicro));
    this.trialForm.get('scenario').setValue(this.trial.scenario.name);
    this.trialForm.get('current').setValue(this.trial.current);
    this.trialForm.get('reported').setValue(this.trial.reported);
    this.trialForm.get('campaign').setValue(this.trial.campaign);
    this.trialForm.get('note').setValue(this.trial.note);
  }

  public getCampaignIdNames() {
    this._campaignApiService.getSelectedCampaign()
    .subscribe(campaign => {
      this.selectedCampaign = campaign;
    })
  }

  public getScenarioList() {
    this._trialApiService.getAllScenarios()
    .subscribe(scenarios => {
        this.scenarios = scenarios;
    })
  }

  public getSysConfigList() {
    this._trialApiService.getAllSystemConfigs()
    .subscribe(configData => {
      this.systemConfigs = configData;
      this.systemConfigs.map(config => {
        if (String(this.trial.systemConfiguration) == config.url) {
          this.systemConfigList.push(config.name)
          this.trialForm.get('system_configuration').setValue(config.name)
        }
      });
    });
  }

  public getTestersList() {
    this._trialApiService.getAllTesters().subscribe(testerData => {
      this.testers = testerData;
      this.testers.map(tester => {
        if (String(this.trial.testers) == tester.url) {
          this.testerList.push(tester.name);
        } 
      });
    });
  }

  public getClockConfigList() {
    this._trialApiService.getAllClockConfigs().subscribe(clockConfigData => {
      this.clockConfigs = clockConfigData;
      clockConfigData.map(clockConfig => {
        this.clockConfigList.push(clockConfig);
        if (clockConfig.url.endsWith(String(this.trial.clockConfig))) {
          this.trialForm.get('clock_config').setValue(clockConfig.name);
        }
      });
    });
  }

  get f() { return this.trialForm.controls; }

  public onSubmit() {
    this.modifyTrialPayload();
    if (!this.trial.url) {
      this._trialApiService.createTrial(this.trialForm.value)
    }
    else {
      this._trialApiService.editTrial(this.trial.id, this.trialForm.value)
    }
    this.onNoClick();
  }

  public modifyTrialPayload() {

    // set trial start and end time seconds to 0
    var trialStartDatetime = this.trialForm.get('start_datetime');
    if (trialStartDatetime) {
      var startDate = new Date(trialStartDatetime.value);
      startDate.setSeconds(0);
      this.trialForm.get('start_datetime').setValue(startDate);
    }

    var trialEndDatetime = this.trialForm.get('end_datetime');
    if (trialEndDatetime) {
      var endDate = new Date(trialEndDatetime.value);
      endDate.setSeconds(0);
      this.trialForm.get('end_datetime').setValue(endDate);
    }

    var testersUrl = [];
    this.temp = this.trialForm.get('testers')
    this.temp = this.temp.value
    for (var i=0; i < this.testers.length; i++) {
      for (var j=0; j < this.temp.length; j++) {
        if(this.temp[j] == this.testers[i].name) {
          testersUrl.push(this.testers[i].url)
        }
      }
      this.trialForm.controls['testers'].reset()
      this.trialForm.controls['testers'].setValue(testersUrl)
    }

    var scenarioUrl = this.trialForm.get('scenario')
    scenarioUrl = scenarioUrl.value
    for (var j=0; j < this.scenarios.length; j++) {
      if (this.scenarios[j].name == scenarioUrl) {
        scenarioUrl = this.scenarios[j].url
      }
      this.trialForm.controls['scenario'].reset()
      this.trialForm.controls['scenario'].setValue(scenarioUrl)
    }

    var configUrl = this.trialForm.get('system_configuration')
    configUrl = configUrl.value
    for (var k=0; k < this.systemConfigs.length; k++) {
      if (this.systemConfigs[k].name == configUrl) {
        configUrl = this.systemConfigs[k].url
      }
      this.trialForm.controls['system_configuration'].reset()
      this.trialForm.controls['system_configuration'].setValue(configUrl)
    }

    var selectedClockConfig = this.trialForm.get('clock_config')
    selectedClockConfig = selectedClockConfig.value;
    for (var k=0; k < this.clockConfigs.length; k++) {
      if (this.clockConfigs[k].name == selectedClockConfig) {
        selectedClockConfig = this.clockConfigs[k].url
        console.log(selectedClockConfig);
      }
      this.trialForm.controls['clock_config'].reset()
      this.trialForm.controls['clock_config'].setValue(selectedClockConfig)
    }
    // In cases where no clock config exists, 'clock_config' value is '[]' which is an invalid payload 
    if (Array.isArray(this.trialForm.controls['clock_config'].value)) {
      this.trialForm.controls['clock_config'].setValue(null);
    }

  }

  onNoClick(): void {
    this.dialogRef.close();
  }

}
