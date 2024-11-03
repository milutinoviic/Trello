import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  constructor() { }

  private _api_url = 'http://localhost:8082';

  private _project_api_url = 'http://localhost:8080';


  private _register_url = this._api_url + "/register"

  private _new_project_url = this._project_api_url + "/"

  addMembersUrl(projectId: string): string {
    return `${this._project_api_url}/projects/${projectId}/users`;
  }

  get register_url() {
    return this._register_url;
  }

  get new_project_url(){
    return this._new_project_url;
  }
}
