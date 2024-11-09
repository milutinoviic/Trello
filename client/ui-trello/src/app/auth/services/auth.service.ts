import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthCredentials } from '../../types/AuthCredentials';
import { Token } from '@angular/compiler';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private headers = new HttpHeaders({ "Content-Type": "application/json" });
  constructor(private http: HttpClient) { }

  login(auth: AuthCredentials):Observable<HttpResponse<Token>>{

    return this.http.post<HttpResponse<Token>>("api/auth/login", auth, {
      headers: this.headers,
      responseType: "json",
    });
  }

  isLoggedIn():boolean {
    if(!localStorage.getItem("user")){
      return false;
    }

    return true;
  }
}
