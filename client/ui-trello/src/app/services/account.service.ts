import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ConfigService } from './config.service';
import { UserResponse } from '../member-addition/member-addition.component';
import {BehaviorSubject, interval, Observable, Subscription, switchMap} from 'rxjs';
import { AccountRequest } from '../models/account-request.model';
import { LoginRequest } from '../models/login-request';
import {Router} from "@angular/router";

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private userIdSource = new BehaviorSubject<string | null>(null);
  userId$ = this.userIdSource.asObservable();

  private tokenVerificationSub!: Subscription;

  constructor(private http: HttpClient, private config: ConfigService, private router: Router) {}

  // Getter for idOfUser
  setUserId(userId: string) {
    this.userIdSource.next(userId);
  }

  // Get the userId directly
  getUserId(): string | null {
    return this.userIdSource.getValue();
  }

  register(accountRequest: AccountRequest): Observable<any> {
    return this.http.post(this.config.register_url, accountRequest);
  }

  getAllUsers(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(this.config.users_url);
  }

  changePassword(newPassword: string): Observable<any> {
    const payload = {
      password: newPassword
    };
    return this.http.post(this.config.change_password_url, payload);
  }


  login(loginCredentials: LoginRequest): Observable<any> {
    return this.http.post<any>(this.config.login_url, loginCredentials);
  }

  logout(): Observable<any> {
    this.stopTokenVerification();
    return this.http.post(this.config.logout_url, null);
  }

  startTokenVerification(userId: string) {
    console.log("Token verification started for user:", userId);

    this.setUserId(userId);
    const key = this.getUserId();



    if (this.tokenVerificationSub) {
      this.tokenVerificationSub.unsubscribe();
    }

    this.tokenVerificationSub = interval(300000)// set it to 5 minutes
      .pipe(
        switchMap(() => {
          console.log(`[Verification] Checking token for user: ${key} at ${new Date().toLocaleTimeString()}`);
          const headers = new HttpHeaders().set('X-User-ID', key!);
          return this.http.get<boolean>(this.config.verify_token_url, { headers });
        })
      )
      .subscribe(
        (isTokenValid) => {
          console.log(`[Response] Token valid: ${isTokenValid} for user: ${key}`);
          if (!isTokenValid) {
            this.stopTokenVerification();
            this.router.navigate(['/login']);
          }
        },
        (error) => {
          console.error("[Error] Error verifying token:", error);
        },
        () => {
          console.log(`[Complete] Token verification stopped for user: ${key}`);
        }
      );
  }



  stopTokenVerification() {
    if (this.tokenVerificationSub) {
      this.tokenVerificationSub.unsubscribe();
    }
  }

  checkPassword(password : string): Observable<boolean> {
    const key = this.getUserId();
    const payload = {
      id: key,
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
