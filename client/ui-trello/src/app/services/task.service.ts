import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {ConfigService} from "./config.service";
import {Observable} from "rxjs";
import {Task} from "../models/task.model";

@Injectable({
  providedIn: 'root'
})
export class TaskService {

  constructor(private http: HttpClient, private config: ConfigService) {}

  getTasksByProjectId(projectId: string): Observable<Task[]> {
    return this.http.get<Task[]>(this.config.getTasksByProjectId(projectId))
  }
}
