import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {ConfigService} from "./config.service";
import {Router} from "@angular/router";
import {Observable} from "rxjs";
import {Notification} from "../notifications/notifications.component";

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  constructor(private http: HttpClient,
              private config: ConfigService,
              private router: Router) { }

  getNotificationById(id: string): Observable<Notification> {
    return this.http.get<Notification>(this.config.notifications_url);
  }

  updateNotificationStatus(id: string, status: string): Observable<void> {
    return this.http.put<void>(this.config.notifications_url + `/` + id, { status });
  }

  getNotificationByUserId(): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.config.notifications_url + '/user/' );
  }

  getAllNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.config.notifications_url );

  }
}
