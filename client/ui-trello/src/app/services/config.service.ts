import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  get verify_token_url(): string {
    return this._verify_token_url;
  }

  constructor() { }

  private _api_url = 'http://localhost:8082';

  private _project_api_url = 'http://localhost:8080';


  private _register_url = this._api_url + "/register"

  private _users_url = this._api_url + "/members"

  private _password_url = this._api_url + "/password"

  private _change_password_url = this._password_url + "/change"

  private _verify_token_url = this._api_url + "/verify"



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

  get api_url(): string {
    return this._api_url;
  }

  get project_api_url(): string {
    return this._project_api_url;
  }

  get password_url(): string {
    return this._password_url;
  }

  get change_password_url(): string {
    return this._change_password_url;
  }
}
