import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UserLoginComponent } from './user-login.component';
import {AuthService} from "../../shared/services";
import {FormBuilder} from "@angular/forms";
import {BehaviorSubject} from "rxjs";
import {compareNumbers} from "@angular/compiler-cli/src/diagnostics/typescript_version";
import Spy = jasmine.Spy;
import {By} from "@angular/platform-browser";

class MockAuth {

  user_login_subject: BehaviorSubject<any>;
  value = {username: 'gradu'};

  constructor() {
  }

  userLogin(user: string, pass: string){
    this.user_login_subject = new BehaviorSubject<any>({username: ''});
    return this.user_login_subject.asObservable();
  }

  refreshToken(){
    return null;
  }

  userLogout(){
    console.log("SLAPPIN");
    return null;
  }

  get userValue(){
    console.log("CALLED");
    return this.value;
  }
}

class MockUserLogin extends UserLoginComponent{
  ngOnInit() {
    super.ngOnInit();
  }
}

describe('UserLoginComponent', () => {
  let component: UserLoginComponent;
  let fixture: ComponentFixture<UserLoginComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MockUserLogin ],
    }).overrideComponent(MockUserLogin, {
      set: {
        providers: [
          {provide: AuthService, useFactory: () => new MockAuth()},
          {provide: FormBuilder}
        ],
      }
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MockUserLogin);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });


  it("ngOnInit() >> sets form to be a form builder group with username and password controls", () => {
    expect(component.form).toBeDefined();
    expect(component.form.get('username').value).toEqual('');
    expect(component.form.get('password').value).toEqual('');
  });


  it("refreshToken() >> calls auth service's refreshToken method", () => {
    let refresh_token_spy = spyOn(component['_authService'], 'refreshToken').and.returnValue(null);
    component.refreshToken();
    expect(refresh_token_spy).toHaveBeenCalled();
  });


  it("logout() >> calls auth service's userLogout method", () => {
    let user_logout_spy = spyOn(component['_authService'], 'userLogout').and.returnValue(null);
    component.logout();
    expect(user_logout_spy).toHaveBeenCalled();
  });


  it("onSubmit() >> sets submitted to true and sends username and password controls as params to userLogin which then returns users info that gets saved to localStorage for page session", () => {
    let user_login_spy = spyOn(component['_authService'], 'userLogin').and.callThrough();
    let user = "greasepot32";
    let pass = "password";
    let result_localstorage = '{"username":"' + user + '"}'
    component.form.get('username').setValue(user);
    component.form.get('password').setValue(pass);

    component.onSubmit();
    expect(component.submitted).toBeTrue();
    expect(user_login_spy).toHaveBeenCalledWith(user, pass);
    expect(localStorage.getItem('user')).toEqual(result_localstorage);
  });


  it("mat-card-content is NOT NULL when authService's user is null, else NULL", () => {
    component['_authService']['value'] = null;
    fixture.detectChanges();
    let mat_card_content = fixture.debugElement.query(By.css('mat-card-content'));
    expect(mat_card_content).not.toBeNull();

    component['_authService']['value'] = {username: 'gradu'};
    fixture.detectChanges();
    mat_card_content = fixture.debugElement.query(By.css('mat-card-content'));
    expect(mat_card_content).toBeNull();
  });


  it("div outer-form-div NOT NULL when authService's user is NOT null, else NULL", () => {
    component['_authService']['value'] = null;
    fixture.detectChanges();
    let outer_div = fixture.debugElement.query(By.css('#outer-form-div'));
    expect(outer_div).toBeNull();

    component['_authService']['value'] = {username: 'gradu'};
    fixture.detectChanges();
    outer_div = fixture.debugElement.query(By.css('#outer-form-div'));
    expect(outer_div).not.toBeNull();
  });


  it("when logout-button is clicked logout gets called", () => {
    let logout_spy = spyOn(component, 'logout').and.returnValue(null);
    let button = fixture.debugElement.query(By.css('#logout-button'));
    button.triggerEventHandler('click', {});
    fixture.detectChanges();
    expect(logout_spy).toHaveBeenCalled();
  });


  it("when user is logged in inner form div's innerText should print users name", () => {
    component['_authService']['value'] = {username: 'gradu'};
    fixture.detectChanges();
    let inner_div = fixture.debugElement.query(By.css('#inner-form-div'));
    expect(inner_div.properties.innerText.trim()).toContain("gradu");
  });

});
