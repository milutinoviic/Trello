import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {ConfigService} from "./config.service";
import {AccountRequest} from "../models/account-request.model";
import {Observable} from "rxjs";
import {Project} from "../models/project.model";

@Injectable({
  providedIn: 'root'
})
export class ProjectServiceService {

  constructor(private http: HttpClient, private config: ConfigService) { }

  addProject(newProjectRequest: Project): Observable<any> {
    return this.http.post<Project>(this.config.new_project_url, newProjectRequest)
  }
  deleteMemberFromProject(projectId: number, memberId: number): Observable<any> {
    const url = `${this.config.project_base_url}projects/${projectId}/users/${memberId}`;
    return this.http.delete(url);
  }





}
