import { Route, RouterModule } from '@angular/router';
import { NgModule } from "@angular/core";
import { AuthGuard } from "./shared/helpers/auth.guard";

export const routes: Route[] = [
  { path: '', redirectTo: '/operator', pathMatch: 'full', },
  { path: 'angular', redirectTo: '/operator', pathMatch: 'prefix', },
  {
    path: 'operator',
    canActivate: [AuthGuard],
    data: {
      'title': 'Operator',
      'icon': 'security',
    },
    loadChildren: () => import('./modules/operator/operator.module').then(m => m.OperatorModule)
  },
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    data: {
      'title': 'Dashboard',
      'icon': 'dashboard',
    },
    loadChildren: () => import('./modules/dashboard/dashboard.module').then(m => m.DashboardModule)
  },
  {
    path: 'clock',
    data: {
      'title': 'Clock',
      'icon': 'alarm',
    },
    loadChildren: () => import('./modules/clock/clock.module').then(m => m.ClockModule)
  },
  {
    path: 'login',
    // the data object creates a link on the side nav
    // data: {
    //   'title': 'Login',
    //   'icon': 'login',
    // },
    loadChildren: () => import('./modules/user-login/user-login.module').then(m => m.UserLoginModule)
  },
];

export const moleLinks: any = [
  {
    url: `http://${window.location.hostname}/docs`,
    data: {
      'title': 'Docs',
      'icon': 'history_edu'
    }
  },
  {
    url: `http://${window.location.hostname}/report`,
    data: {
      'title': 'Report',
      'icon': 'analytics'
    }
  },
  {
    url: `http://${window.location.hostname}/maps`,
    data: {
      'title': 'Map Server',
      'icon': 'public'
    }
  },
  {
    url: `http://${window.location.hostname}:8080`,
    data: {
      'title': 'Traefik',
      'icon': 'router'
    }
  },
  {
    url: `http://${window.location.hostname}/portainer`,
    data: {
      'title': 'Portainer',
      'icon': 'widgets'
    }
  },
  {
    url: `http://${window.location.hostname}/api`,
    data: {
      'title': 'API',
      'icon': 'api'
    }
  }
]

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
