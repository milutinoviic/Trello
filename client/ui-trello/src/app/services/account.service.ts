import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders, HttpResponse} from "@angular/common/http";
import {ConfigService} from "./config.service";
import {UserResponse} from "../member-addition/member-addition.component"
import {interval, Observable, switchMap} from "rxjs";
import {AccountRequest} from "../models/account-request.model";

@Injectable({
  providedIn: 'root'
})

export class AccountService {

  constructor(private http: HttpClient, private config: ConfigService) { }

  register(accountRequest: AccountRequest): Observable<any> {
    return this.http.post(this.config.register_url, accountRequest)
  }

  getAllUsers(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(this.config.users_url)
  }

  changePassword(password: string): Observable<any> {
    return this.http.post(this.config.change_password_url, password)

  }

  startTokenVerification(userId: string) {
    return interval(60000).pipe(
      switchMap(() => {
        const headers = new HttpHeaders()
          .set('X-User-ID', userId);

        return this.http.get<boolean>(this.config.verify_token_url, { headers });
      })
    ).subscribe(
      (isTokenValid) => {
        if (!isTokenValid) {
          window.location.href = '/login';
        }
      },
      (error) => {
        console.error('Error verifying token:', error);
      }
    );
  }




}
