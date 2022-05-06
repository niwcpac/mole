import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperatorComponent } from './operator.component';
import { OperatorRoutingModule } from './operator-routing.module';
import { EventSummaryComponent } from './components/event-summary/event-summary.component';
import { SharedModule } from '../../shared/shared.module';
import { MoleMatModule } from '../../shared/molemat.module';
import { FlexLayoutModule } from '@angular/flex-layout';
import { SummaryCardComponent } from './components/event-summary/summary-card/summary-card.component';

@NgModule({
  declarations: [OperatorComponent, EventSummaryComponent, SummaryCardComponent],
  imports: [
    CommonModule,
    OperatorRoutingModule,
    SharedModule,
    MoleMatModule,
    FlexLayoutModule,
  ],
})
export class OperatorModule { }
