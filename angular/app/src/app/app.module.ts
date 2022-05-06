import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MoleMatModule } from "./shared/molemat.module";
import { AppRoutingModule } from "./app-routing.module";
import { FlexLayoutModule } from "@angular/flex-layout";
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AuthService } from './shared/services';
import { FormsModule } from '@angular/forms';
import { APP_BASE_HREF } from '@angular/common';
import { environment } from 'src/environments/environment';

import { SharedModule } from '../app/shared/shared.module';

import { JwtInterceptor, ErrorInterceptor } from './shared/helpers/'
@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MoleMatModule,
    AppRoutingModule,
    FlexLayoutModule,
    HttpClientModule,
    FontAwesomeModule,
    FormsModule,
    SharedModule,
  ],
  providers: [
    AuthService,
    HttpClientModule,
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
    { provide: APP_BASE_HREF, useValue: environment.baseHref },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
