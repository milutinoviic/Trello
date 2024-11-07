import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  constructor() { }

  private _api_url = '/api/user-server';//before /api/user-server/  will be added "http://api_gateway:8084" defined in proxy.conf.json file
                                               // when api-gateway recieves this path it will redirect to user-server

  private _project_api_url = '/api/project-server'; // same a below, it will be redirected to api-gateway, then to project-server
                                                            

  private _register_url = this._api_url + "/register"

  private _users_url = this._api_url + "/members"


  private _project_base_url = this._project_api_url;

  private _new_project_url = this._project_api_url + "/"

  addMembersUrl(projectId: string): string {
    return `${this._project_api_url}/projects/${projectId}/users`;
  }

  getProjectByIdUrl(projectId: string): string {
    return `${this._project_api_url}/${projectId}`;
  }

  get users_url() {
    return this._users_url;
  }

  get register_url() {
    return this._register_url;
  }

  get new_project_url(){
    return this._new_project_url;
  }

  get project_base_url() {
    return this._project_base_url;
  }
}
