import {RouterModule, Routes} from "@angular/router";
import {NgModule} from "@angular/core";
import {OperatorComponent} from "./operator.component";
import { TrialCreatorComponent } from '../../shared/components/trial/trial-creator/trial-creator.component';

const moduleRoutes: Routes = [
  { path: '', component: OperatorComponent },
  {
    path: '',
    component: OperatorComponent,
    children: [
      { path: 'edit-trial', component: TrialCreatorComponent }
    ]
  },
];
@NgModule({
  imports: [RouterModule.forChild(moduleRoutes)],
  exports: [RouterModule]
})
export class OperatorRoutingModule {}
