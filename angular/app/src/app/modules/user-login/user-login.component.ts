import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../shared/services';
import { FormGroup, FormBuilder } from '@angular/forms';
import { first } from 'rxjs/operators';
import { environment } from '../../../environments/environment'

@Component({
  selector: 'mole-user-login',
  templateUrl: './user-login.component.html',
  styleUrls: ['./user-login.component.scss']
})
export class UserLoginComponent implements OnInit {
    public user: any;

    form: FormGroup;
    loading = false;
    submitted = true;
    gearURL = environment.staticURL + '/assets/gear.gif';

    constructor(
      public _authService: AuthService,
      private fb: FormBuilder
    ) { }

    ngOnInit() {
      this.form = this.fb.group({
        username: [''],
        password: ['']
      })

    }

    get f() { return this.form.controls; }

    public refreshToken() {
      this._authService.refreshToken();
    }

    public logout() {
      this._authService.userLogout();
    }

    public onSubmit() {
      this.submitted = true;
      this._authService.userLogin(this.f.username.value, this.f.password.value)
        .pipe(first())
        .subscribe( data => {
          data['username'] = this.f.username.value;
          localStorage.setItem('user', JSON.stringify(data));
        },
        error => { console.log(error) }
      )
    }

  }
