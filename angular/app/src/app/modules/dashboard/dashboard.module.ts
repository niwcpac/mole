import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './dashboard.component';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { SharedModule } from '../../shared/shared.module';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MoleMatModule } from '../../shared/molemat.module';
import { ScoreSummaryComponent } from './score-summary/score-summary.component';


@NgModule({
  declarations: [DashboardComponent, ScoreSummaryComponent],
  imports: [
    CommonModule,
    DashboardRoutingModule,
    SharedModule,
    MoleMatModule,
    FlexLayoutModule,
  ]
})
export class DashboardModule { }
