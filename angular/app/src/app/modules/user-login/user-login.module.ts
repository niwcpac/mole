import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserLoginComponent } from './user-login.component';
import { DashboardRoutingModule } from './user-login-routing.module';
import { SharedModule } from '../../shared/shared.module';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MoleMatModule } from '../../shared/molemat.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';


@NgModule({
  declarations: [UserLoginComponent],
  imports: [
    CommonModule,
    DashboardRoutingModule,
    SharedModule,
    MoleMatModule,
    FlexLayoutModule,
    FormsModule,
    ReactiveFormsModule
  ]
})
export class UserLoginModule { }
