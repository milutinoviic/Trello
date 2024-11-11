import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ConfigService } from './config.service';
import { UserResponse } from '../member-addition/member-addition.component';
import {interval, Observable, Subscription, switchMap} from 'rxjs';
import { AccountRequest } from '../models/account-request.model';
import { LoginRequest } from '../models/login-request';
import {Router} from "@angular/router";

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private _idOfUser!: string;
  private tokenVerificationSub!: Subscription;

  constructor(private http: HttpClient, private config: ConfigService, private router: Router) {}

  // Getter for idOfUser
  get idOfUser(): string {
    return this._idOfUser;
  }

  // Setter for idOfUser
  set idOfUser(value: string) {
    this._idOfUser = value;
  }

  register(accountRequest: AccountRequest): Observable<any> {
    return this.http.post(this.config.register_url, accountRequest);
  }

  getAllUsers(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(this.config.users_url);
  }

  changePassword(newPassword: string): Observable<any> {
    const payload = {
      id: this.idOfUser,
      password: newPassword
    };
    return this.http.post(this.config.change_password_url, payload);
  }


  login(loginCredentials: LoginRequest): Observable<any> {
    return this.http.post<any>(this.config.login_url, loginCredentials);
  }

  logout(): Observable<any> {
    return this.http.post(this.config.logout_url, this.idOfUser);
  }

  startTokenVerification(userId: string) {
    console.log("Token verification started for user:", userId);

    this.idOfUser = userId;

    if (this.tokenVerificationSub) {
      this.tokenVerificationSub.unsubscribe();
    }

    this.tokenVerificationSub = interval(60000)
      .pipe(
        switchMap(() => {
          const headers = new HttpHeaders().set('X-User-ID', this.idOfUser);

          return this.http.get<boolean>(this.config.verify_token_url, { headers });
        })
      )
      .subscribe(
        (isTokenValid) => {
          if (!isTokenValid) {
            this.stopTokenVerification();
            this.router.navigate(['/login']);
          }
        },
        (error) => {
          console.error("Error verifying token:", error);
        }
      );
  }

  stopTokenVerification() {
    if (this.tokenVerificationSub) {
      this.tokenVerificationSub.unsubscribe();
    }
  }

  checkPassword(password : string): Observable<boolean> {
    const payload = {
      id: this.idOfUser,
      password: password
    };
    return this.http.post<boolean>(this.config.password_check_url, payload);
  }

  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(this.config.recovery_password_url, { email })
  }

  resetPassword(email: string, newPassword: string) {
    const payload = {
      email: email,
      password: newPassword
    }

    return this.http.post(this.config.reset_password_url, payload)
  }

  sendMagicLink(email: string) {
    return this.http.post(this.config.magic_link_url, {email})
  }

  verifyMagic(email: string): Observable<string> {
    return this.http.post<string>(this.config.verify_magic_url, {email})
  }
}
