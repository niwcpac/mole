import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';
import { ClockRoutingModule } from './clock-routing.module';
import { ClockComponent } from './clock.component';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { TimerCardComponent } from './timer-card/timer-card.component';

@NgModule({
  declarations: [ClockComponent, TimerCardComponent],
  imports: [
    CommonModule,
    SharedModule,
    ClockRoutingModule,
    MatSelectModule,
    MatCardModule,
  ]
})
export class ClockModule { }
