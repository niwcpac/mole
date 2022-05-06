import {AuthService } from './auth.service';
import { User } from '../../models';
import { routes } from '../../../app-routing.module'

import { TestBed, fakeAsync } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import {Router} from "@angular/router";
import {Location} from "@angular/common";

describe('AuthService', () => {
  let auth_service: AuthService;
  let http_testing_client: HttpTestingController;
  let auth_router: Router;
  //let auth_location: Location;
  let user_mock: User;
  let user_login_navigateUrl: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService],
      imports: [HttpClientTestingModule, RouterTestingModule.withRoutes(routes)],
    });

    auth_service = TestBed.inject<any>(AuthService);
    http_testing_client = TestBed.inject<any>(HttpTestingController);
    auth_router = TestBed.inject<any>(Router);
    //auth_location = TestBed.inject<any>(Location);

    auth_router.initialNavigation();

    user_mock = {
      username: "randy",
      id: 1,
      access: "." + window.btoa('{"exp":12, "user_id":1}'),
      token_expires: new Date(12000)
    }

    user_login_navigateUrl = '/operator';

  }); // end of beforeEach()

  /*
    run after every single test to make sure that our httpMock expectations are met
   */
  afterEach(() => {
    http_testing_client.verify();
  }); //end of afterEach()


  it('create an instance', () => {
    expect(auth_service).toBeTruthy();
  });

  it('userValue(), Return updated Subject Value of User', () => {
    auth_service.userSubject.next(user_mock);

    expect(auth_service.userValue).toBe(user_mock);
  });

  it('userLogin(username, password), Returned User Object gets built and user Observable updated', fakeAsync(() => {

    // Call The Service
    auth_service.userLogin("randy", "randyIsNumberOne").subscribe(data => {
      expect(data.username).toBe(user_mock.username);
      expect(data.access).toBe(user_mock.access);
      expect(data.id).toBe(user_mock.id);
      expect(data.token_expires).toBe(user_mock.token_expires);

      expect(auth_service.userSubject.value).toBe(user_mock);
    });

    // We set the expectations for the HttpClient mock
    const req = http_testing_client.expectOne('/api/token/auth/');
    expect(req.request.method).toEqual('POST');

    //Create spy for the router to watch when service method calls navigateByUrl and capture the 'to be navigated to' path.
    const spy = spyOn(auth_router, 'navigateByUrl');

    // Then we set the fake data to be returned by the mock
    req.flush(user_mock);

    //Check that the path was navigated to (remember service is only truly called after flushing)
    const url = spy.calls.first().args[0];
    expect(url).toBe(user_login_navigateUrl);

  }));

  it('refreshToken(), !!!!!!!!!!!!!!!!!!! CURRENTLY DOES NOT WORK SAYS COMMENTS !!!!!!!!!!!!!!!', () => {

  });


  it("userLogout(), User object should be reset to empty (null'd out)", () => {
    auth_service.userSubject.next(user_mock);
    //console.log(auth_service.userSubject.value);
    auth_service.userLogout();
    //console.log(auth_service.userSubject.value);

    expect(auth_service.userSubject.value).toBe(null);
  });

  it('updateData(token), Assign expiration date on token for a user', () => {

    expect(auth_service['tokenExpirationDate']).toEqual(undefined);
    expect(auth_service['id']).toEqual(undefined);

    auth_service['updateData'](user_mock['access']);

    expect(auth_service['tokenExpirationDate']).toEqual(user_mock['token_expires']);
    expect(auth_service['id']).toEqual(user_mock['id']);
  });

});
