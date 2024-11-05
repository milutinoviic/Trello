import { Injectable } from '@angular/core';
import {HttpClient, HttpResponse} from "@angular/common/http";
import {ConfigService} from "./config.service";
import {UserResponse} from "../member-addition/member-addition.component"
import {Observable} from "rxjs";
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


}
