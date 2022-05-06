import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, subscribeOn } from 'rxjs/operators';
import { User } from '../../models'

@Injectable( )
export class AuthService {
  public userSubject: BehaviorSubject<User>
  public user: Observable<User>

  // http options used for making API calls
  private httpOptions: any;

  token: string;
  tokenExpirationDate: Date;
  username: string;
  id: number;

  // error messages received from the login attempt
  public errors: any = [];

  constructor(private http: HttpClient, private router: Router) {
    this.userSubject = new BehaviorSubject<User>(JSON.parse(localStorage.getItem('user')));
    this.user = this.userSubject.asObservable();
    this.httpOptions = {
      headers: new HttpHeaders({'Content-Type': 'application/json'})
    };
  }

  public get userValue(): User {
    return this.userSubject.value;
  }

  public userLogin(username, password) {
    return this.http.post<User>('/api/token/auth/', { username, password })
      .pipe(map(data => {

        // Get token expiration & username
        this.updateData(data['access'])
        data['token_expires'] = this.tokenExpirationDate;
        data['id'] = this.id;

        this.userSubject.next(data);

        // @TODO: route based on user role
        this.router.navigateByUrl('/operator');

        return this.userSubject.value;
      }));
  }

  // Need to fix (does not work right now)
  public refreshToken() {
    this.http.post('api-token-refresh/', JSON.stringify({token: this.token}), this.httpOptions).subscribe(
      data => {
        console.log('refresh success', data);
        this.updateData(data['token']);
      },
      err => {
        console.error('refresh error', err);
        this.errors = err['error'];
      }
    );
  }

  public userLogout() {
    localStorage.removeItem('user');
    this.userSubject.next(null);
  }

  private updateData(token) {
    this.token = token;
    this.errors = [];

    // Decode the token to get username & exp
    const token_parts = this.token.split(/\./);
    const token_decoded = JSON.parse(window.atob(token_parts[1]));
    this.tokenExpirationDate = new Date(token_decoded.exp * 1000);
    this.id = token_decoded.user_id
  }

}
