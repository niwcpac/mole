import {NgModule} from "@angular/core";
import {DashboardComponent} from "./dashboard.component";
import {RouterModule, Routes} from "@angular/router";

const moduleRoutes: Routes = [
  { path: '', component: DashboardComponent },
];
@NgModule({
  imports: [RouterModule.forChild(moduleRoutes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule {}
