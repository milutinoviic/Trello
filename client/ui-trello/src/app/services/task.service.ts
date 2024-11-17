import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {ConfigService} from "./config.service";
import {Observable} from "rxjs";
import {Task} from "../models/task";

@Injectable({
  providedIn: 'root'
})
export class TaskService {

  constructor(private http: HttpClient, private config: ConfigService) { }

  getTasksByProjectId(projectId: string): Observable<Task[]> {
    return this.http.get<Task[]>(this.config.getTasksByProjectId(projectId)) }

  addTask(newTask: Task): Observable<Task> {
    return this.http.post<Task>(`${this.config.new_task_url}/tasks`, newTask);
  }


  updateTaskStatus(task: Task) {
    const headers = { 'Content-Type': 'application/json' };
    return this.http.post(this.config.update_status_url, task, { headers });
  }

  checkIfUserInTask(task: Task): Observable<boolean> {
    const headers = { 'Content-Type': 'application/json' };
    return this.http.post<boolean>(this.config.check_task_url, task, { headers });
  }

}
