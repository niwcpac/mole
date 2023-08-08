import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HeaderBarComponent } from './header-bar.component';
import {FormBuilder} from "@angular/forms";
import {CampaignApiService, TrialApiService} from "../../../services";
import {Campaign, Trial} from "../../../models";
import {MatDialog} from "@angular/material/dialog";
import {BehaviorSubject, of, Subject, Observable} from "rxjs";
import {MatMenuModule, MatMenuTrigger} from '@angular/material/menu';
import Spy = jasmine.Spy;
import {By} from "@angular/platform-browser";
import {TrialCreatorComponent} from "../..";
import {copyArrayItem} from "@angular/cdk/drag-drop";
import {ViewChild} from "@angular/core";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";


class MockCampaignApiService{
  private selectedCampaignSubject: BehaviorSubject<Campaign>;
  private selectedCampaign: Campaign;

  constructor() {
    this.selectedCampaignSubject = new BehaviorSubject<Campaign>(null);
  }

  private setSelectedCampaignFromUrl(campaignUrl) {
    this.selectedCampaign = <Campaign>{
      trialIdMajorName: "Day",
      trialIdMinorName: "Shift",
      trialIdMicroName: "Run"
    }
  }

  getSelectedCampaign(): Observable<Campaign> {
    return this.selectedCampaignSubject.asObservable();
  }
}


class MockTrialApiService{

  selectedTrialSub:Subject<Trial>;
  currentTrialBSub:BehaviorSubject<Trial>;
  allTrialBSub: BehaviorSubject<Trial[]>;
  all_trials: Trial[];
  curr_trial: Trial;

  constructor() {
    this.all_trials = [<Trial>{id: 1, name: 'trial 1'}, <Trial>{id: 2, name: 'trial 2'}];
    this.curr_trial = <Trial>{name: 'trial 1'};
    this.allTrialBSub = new BehaviorSubject<Trial[]>(this.all_trials);
    this.currentTrialBSub = new BehaviorSubject<Trial>(this.curr_trial);
    this.selectedTrialSub = new Subject<Trial>();
  }

  getAllTrials(){
    return this.allTrialBSub.asObservable();
  }

  getCurrentTrial(){
    return this.currentTrialBSub.asObservable();
  }

  getSelectedTrial(){
    return this.selectedTrialSub.asObservable();
  }

  getNextMajorId(){
    return {
      idMajor: 3,
      idMinor: 0,
      idMicro: 0
    };
  }

  getNextMinorId(){
    return {
      idMajor: 3,
      idMinor: 2,
      idMicro: 0
    };
  }

  getNextMicroId(){
    return {
      idMajor: 3,
      idMinor: 2,
      idMicro: 1
    };
  }

  setSelectedTrial(trial: Trial){
    return null;
  }
}

class MockMatDialog{
  result_return = null;
  dialog_ref = new BehaviorSubject<any>(this.result_return);
  after_close = {
    afterClosed: () => {
      return this.dialog_ref.asObservable();
    }
  };

  open(component, config){
    return this.after_close;
  }
}

class MockTrialSelector extends HeaderBarComponent{
  to_parent_spy: Spy;
  @ViewChild(MatMenuTrigger, {static:false}) menu: MatMenuTrigger;

  ngOnInit() {
    this.to_parent_spy = spyOn<any>(this, 'toParent').and.returnValue(null);
    super.ngOnInit();
  }
}

describe('HeaderBarComponent', () => {
  let component: HeaderBarComponent;
  let fixture: ComponentFixture<HeaderBarComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MockTrialSelector ],
      imports: [MatMenuModule, BrowserAnimationsModule],

    }).overrideComponent(MockTrialSelector, {
      set: {
        providers: [
          {provide: FormBuilder},
          {provide: MatDialog, useFactory: () => new MockMatDialog() },
          {provide: TrialApiService, useFactory: () =>  new MockTrialApiService() },
          {provide: CampaignApiService, useFactory: () => new MockCampaignApiService() }
        ],
      }
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MockTrialSelector);
    component = fixture.componentInstance;

    component.trial = <Trial>{name: 'trial name'};
    component.allowEdit = true;
    component.visibility = true;
    component.trialVisibility = true;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });


  it('newMajor() >> calls openTrialCreator with the next major id', () => {
    let open_trial_creator = spyOn(component, 'openTrialCreator').and.returnValue(null);
    let result = {
      idMajor: 3,
      idMinor: 0,
      idMicro: 0
    };
    component.newMajor();
    expect(open_trial_creator).toHaveBeenCalledWith(result);
  });


  it('newMinor() >> calls openTrialCreator with the next minor id', () => {
    let open_trial_creator = spyOn(component, 'openTrialCreator').and.returnValue(null);
    let result = {
      idMajor: 3,
      idMinor: 2,
      idMicro: 0
    };
    component.newMinor();
    expect(open_trial_creator).toHaveBeenCalledWith(result);
  });


  it('newMicro() >> calls openTrialCreator with the next micro id', () => {
    let open_trial_creator = spyOn(component, 'openTrialCreator').and.returnValue(null);
    let result = {
      idMajor: 3,
      idMinor: 2,
      idMicro: 1
    };
    component.newMicro();
    expect(open_trial_creator).toHaveBeenCalledWith(result);
  });


  it('openTrialCreator(idOverride?: TrialId) >> if idOverride is passed, override selected trial by new ids. ' +
    'Then open a dialog window for selected trial.' +
    'Once window is closed update selectedTrial.', () => {

    let trial_start_datetime = new Date();
    trial_start_datetime.setMilliseconds(0);
    let original_trial = <Trial>{id: 1, url: 'selected/trial/url', idMajor: 5, idMinor: 5, idMicro: 5};
    let overwritten_trial = <Trial>{id: 1, url: "", idMajor: 3, idMinor: 2, idMicro: 0, startDatetime: trial_start_datetime, endDatetime: null, reported: true};
    let result_trial_overwritten = <Trial>{id: 1, name: 'trial 1'};

    let mock_override_id = {
      idMajor: 3,
      idMinor: 2,
      idMicro: 0
    };

    let open_config_overridden = {width: '45vw', data: overwritten_trial, autoFocus: false};
    let open_config_not_overridden = {width: '45vw', data: original_trial, autoFocus: false};

    let dialog_open_spy = spyOn(component.dialog, 'open').and.callThrough();

    component.selectedTrial = original_trial;

    //When trial will be overwritten
    component.openTrialCreator(mock_override_id);
    expect(dialog_open_spy).toHaveBeenCalledWith(TrialCreatorComponent, open_config_overridden);
    expect(component.allTrials).toEqual(component['_trialApiService']['all_trials']);
    expect(component.selectedTrial).toEqual(result_trial_overwritten);

    //When trial WONT be overwritten
    component.openTrialCreator();
    expect(dialog_open_spy).toHaveBeenCalledWith(TrialCreatorComponent, open_config_not_overridden);
  });


  it('onChangeTrial(triggered event) >> when a selection change event occurs updates selected trial to new selection value', () => {
    let selected_trial_spy = spyOn(component['_trialApiService'], 'setSelectedTrial').and.callThrough();
    let on_change_trial_spy = spyOn(component, 'onChangeTrial').and.callThrough();
    let mock_trial = <Trial>{id: 1, name: 'trial name'};
    let mock_event_obj = {value: mock_trial};

    let change_trial_element = fixture.debugElement.query(By.css('#mat-select-trials'));

    change_trial_element.triggerEventHandler('selectionChange', mock_event_obj);
    fixture.detectChanges();

    expect(on_change_trial_spy).toHaveBeenCalledWith(mock_event_obj);
    expect(selected_trial_spy).toHaveBeenCalledWith(mock_trial);
  });


  it('toParent(trial: Trial) >> emits passed in trial to parent component', () => {
    component['to_parent_spy'].and.callThrough();
    let emit_spy = spyOn(component.shareTrial, 'emit').and.returnValue(null);
    let mock_trial = <Trial>{id:1, name: 'trial name'};

    component.toParent(mock_trial);
    expect(emit_spy).toHaveBeenCalledWith(mock_trial);
  });


  it("div div-selected-trial should NOT BE NULL when there IS a selectedTrial, else NULL", () => {
    component.selectedTrial = <Trial>{id:1, name: 'trial name'};
    fixture.detectChanges();

    let div = fixture.debugElement.query(By.css('#div-selected-trial'));
    expect(div).not.toBeNull();

    component.selectedTrial = null;
    fixture.detectChanges();

    div = fixture.debugElement.query(By.css('#div-selected-trial'));
    expect(div).toBeNull();
  });


  it("mat-card-header mat-card-header-selected-trial should NOT BE NULL when trialVisibility is TRUE, else NULL", () => {
    component.trialVisibility = true;
    fixture.detectChanges();

    let mat_card = fixture.debugElement.query(By.css('#mat-card-header-selected-trial'));
    expect(mat_card).not.toBeNull();

    component.trialVisibility = false;
    fixture.detectChanges();

    mat_card = fixture.debugElement.query(By.css('#mat-card-header-selected-trial'));
    expect(mat_card).toBeNull();
  });


  it("mat-label mat-label-selected-trial-name innerText should be selectedTrial's name", () => {
    component.trialVisibility = true;
    fixture.detectChanges();

    let mat_option = fixture.debugElement.query(By.css('#mat-label-selected-trial-name'));
    expect(mat_option.properties.innerText.trim()).toEqual(component.selectedTrial.name);
  });


  it("mat-option mat-option-trial should each be populated by all available trials where each option's innerText is set to trials name", () => {
    let options = fixture.debugElement.queryAll(By.css('#mat-option-trial'));
    expect(options.length).toEqual(component.allTrials.length);

    for(let i = 0; i < options.length; i++){
      expect(options[i].properties.innerText.trim()).toEqual(component.allTrials[i].name);
    }
  });


  it("mat-chip mat-chip-edit should NOT BE NULL if allowEdit is TRUE, else NULL.", () => {
    component.allowEdit = true;
    fixture.detectChanges();

    let chip = fixture.debugElement.query(By.css('#mat-chip-edit'));
    expect(chip).not.toBeNull();

    component.allowEdit = false;
    fixture.detectChanges();

    chip = fixture.debugElement.query(By.css('#mat-chip-edit'));
    expect(chip).toBeNull();
  });


  it("when mat-chip mat-chip-edit is clicked openTrialCreator should be called", () => {
    component.allowEdit = true;
    fixture.detectChanges();

    let open_trial_spy = spyOn(component, 'openTrialCreator').and.returnValue(null);
    let chip = fixture.debugElement.query(By.css('#mat-chip-edit'));
    chip.triggerEventHandler('click', {});
    fixture.detectChanges();

    expect(open_trial_spy).toHaveBeenCalled();
  });


  it("mat-chip mat-chip-add should NOT BE NULL when allowEdit is TRUE, else NULL", () => {
    component.allowEdit = true;
    fixture.detectChanges();

    let chip = fixture.debugElement.query(By.css('#mat-chip-add'));
    expect(chip).not.toBeNull();

    component.allowEdit = false;
    fixture.detectChanges();

    chip = fixture.debugElement.query(By.css('#mat-chip-add'));
    expect(chip).toBeNull();
  });


  it("when button button-day is clicked newMajor is called", () => {
    component['menu'].openMenu();
    fixture.detectChanges();
    let button = fixture.debugElement.query(By.css('#button-day'));

    let new_major_spy = spyOn(component, 'newMajor').and.returnValue(null);
    button.triggerEventHandler('click', {});

    fixture.detectChanges();
    expect(new_major_spy).toHaveBeenCalled();
  });


  it("when button button-shift is clicked newMinor is called", () => {
    component['menu'].openMenu();
    fixture.detectChanges();

    let button = fixture.debugElement.query(By.css('#button-shift'));
    let new_minor_spy = spyOn(component, 'newMinor').and.returnValue(null);

    button.triggerEventHandler('click', {});
    fixture.detectChanges();

    expect(new_minor_spy).toHaveBeenCalled();
  });


  it("when button button-run is clicked newMicro is called", () => {
    component['menu'].openMenu();
    fixture.detectChanges();

    let trigger_menu = fixture.debugElement.query(By.css('#mat-chip-add'));
    trigger_menu.triggerEventHandler('matMenuTriggerFor', {});
    fixture.detectChanges();

    let button = fixture.debugElement.query(By.css('#button-run'));
    let new_micro_spy = spyOn(component, 'newMicro').and.returnValue(null);

    button.triggerEventHandler('click', {});
    fixture.detectChanges();

    expect(new_micro_spy).toHaveBeenCalled();
  });


  it("mat-chip mat-chip-current should NOT BE NULL when selectedTrial's current is TRUE, else NULL", () => {
    component.selectedTrial.current = true;
    fixture.detectChanges();

    let chip = fixture.debugElement.query(By.css('#mat-chip-current'));
    expect(chip).not.toBeNull();

    component.selectedTrial.current = false;
    fixture.detectChanges();

    chip = fixture.debugElement.query(By.css('#mat-chip-current'));
    expect(chip).toBeNull();
  });


  it("mat-chip mat-chip-reported should NOT BE NULL when selectedTrial's reported is TRUE, else NULL", () => {
    component.selectedTrial.reported = true;
    fixture.detectChanges();

    let chip = fixture.debugElement.query(By.css('#mat-chip-reported'));
    expect(chip).not.toBeNull();

    component.selectedTrial.reported = false;
    fixture.detectChanges();

    chip = fixture.debugElement.query(By.css('#mat-chip-reported'));
    expect(chip).toBeNull();
  });

});
