import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subscription, Observable } from 'rxjs';
import { CampaignApiService, TrialApiService } from '../../../services';
import { Campaign, Trial, TrialId } from '../../../models';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatChipsModule} from "@angular/material/chips";
import { TrialCreatorComponent } from '../trial-creator/trial-creator.component';
import { EventPayloadApiAdapters } from '../../../services/auth/payload.adapter';
import { TrialApiAdapters } from '../../../services/trial/trial-api.adapter';

@Component({
  selector: 'mole-trial-selector',
  templateUrl: './trial-selector.component.html',
  styleUrls: ['./trial-selector.component.scss']
})
export class TrialSelectorComponent implements OnInit, OnDestroy {

  @Input() trial: Trial;
  @Input() allowEdit: boolean = true;
  @Input() visibility: boolean;
  @Input() trialVisibility: boolean;

  @Output() public shareTrial = new EventEmitter<Trial>();

  form: FormGroup;
  subscriptions = new Subscription();

  selectedCampaign: Campaign;

  allTrials: Trial[];
  currentTrial: Trial;
  selectedTrial: any = {
    name: "Loading trials...",
    idMajor: 0,
    idMinor: 0,
    idMicro: 0
  };

  private dialogRef: MatDialogRef<TrialCreatorComponent>
  private eventPayloadApiAdapters = new EventPayloadApiAdapters();
  private trialApiAdapters = new TrialApiAdapters();

  allTrialsObservable: Observable<Trial[]> = this._trialApiService.getAllTrials();
  currentTrialObservable: Observable<Trial> = this._trialApiService.getCurrentTrial();
  selectedTrialObservable: Observable<Trial> = this._trialApiService.getSelectedTrial();

  constructor(
    public dialog: MatDialog,
    private _campaignApiService: CampaignApiService,
    private _trialApiService: TrialApiService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.getCampaignIdNames();

    this.allTrialsObservable.subscribe((trials: Trial[]) => {
      this.allTrials = trials;
    });
    this.currentTrialObservable.subscribe((trial: Trial) => {
      this.currentTrial = trial;
      if (!this.selectedTrial) {
        this.selectedTrial = this.currentTrial;
        this.toParent(this.selectedTrial);
      }
    });
    this.selectedTrialObservable.subscribe((trial: Trial) => {
      this.selectedTrial = trial;
    })

    this.form = this.fb.group({
      trials: ['']
    });
  }

  public getCampaignIdNames() {
    this._campaignApiService.getSelectedCampaign()
    .subscribe(campaign => {
      this.selectedCampaign = campaign;
    })
  }

  public newMajor(): void {
    let trialId: TrialId = this._trialApiService.getNextMajorId();
    this.openTrialCreator(trialId);
  }
  public newMinor(): void {
    let trialId: TrialId = this._trialApiService.getNextMinorId();
    this.openTrialCreator(trialId);
  }
  public newMicro(): void {
    let trialId: TrialId = this._trialApiService.getNextMicroId();
    this.openTrialCreator(trialId);
  }

  public openTrialCreator(idOverride?: TrialId): void {
    var dialogData: Trial = this.selectedTrial;
    if (idOverride) {
      dialogData.url = "";
      dialogData.idMajor = idOverride.idMajor;
      dialogData.idMinor = idOverride.idMinor;
      dialogData.idMicro = idOverride.idMicro;

      // need to set defaults for a new trial
      dialogData.startDatetime = new Date();
      dialogData.startDatetime.setMilliseconds(0);
      dialogData.endDatetime = null;
      dialogData.reported = true;
    }

    this.dialogRef = this.dialog.open(TrialCreatorComponent, {
      width: '45vw',
      data: dialogData,
      autoFocus: false
    })
    this.dialogRef.afterClosed().subscribe(result => {
      if (!result) {
        // Update the selectedTrial for trial-creator
        this.allTrialsObservable.subscribe((trials: Trial[]) => {
          this.allTrials = trials;
          for(var i=0; i < this.allTrials.length; i++) {
            if (this.selectedTrial.id == this.allTrials[i].id) {
              this.selectedTrial = this.allTrials[i];
           }
          }
        })
      }
    })
  }

  public onChangeTrial = (event) => {
    if (event) {
      this._trialApiService.setSelectedTrial(event.value);
    }
  }

  public toParent(trial: Trial) {
    this.shareTrial.emit(trial);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

}
