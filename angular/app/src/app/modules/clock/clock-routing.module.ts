import { NgModule } from '@angular/core';
import { ClockComponent } from './clock.component';
import { Routes, RouterModule } from '@angular/router';


const moduleRoutes: Routes = [
  { path: '', component: ClockComponent },
];
@NgModule({
  imports: [RouterModule.forChild(moduleRoutes)],
  exports: [RouterModule]
})
export class ClockRoutingModule { }
