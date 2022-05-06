import {NgModule} from "@angular/core";
import {UserLoginComponent} from "./user-login.component";
import {RouterModule, Routes} from "@angular/router";

const moduleRoutes: Routes = [
  { path: '', component: UserLoginComponent },
];
@NgModule({
  imports: [RouterModule.forChild(moduleRoutes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule {}
