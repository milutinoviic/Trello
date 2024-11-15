import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  get verify_token_url(): string {
    return this._verify_token_url;
  }

  constructor() {
  }

  private _api_url = '/api/user-server';//before /api/user-server/  will be added "http://api_gateway:8084" defined in proxy.conf.json file
  // when api-gateway recieves this path it will redirect to user-server

  private _project_api_url = '/api/project-server'; // same a below, it will be redirected to api-gateway, then to project-server

  private _notifications_api_url = '/api/notification-server';

  private _task_api_url = '/api/task-server';

  private _register_url = this._api_url + "/register"

  private _users_url = this._api_url + "/members"

  private _password_url = this._api_url + "/password"

  private _change_password_url = this._password_url + "/change"

  private _recovery_password_url = this._password_url + "/recovery"

  private _reset_password_url = this._password_url + "/reset"

  private _magic_link_url = this._api_url + "/magic"

  private _verify_magic_url = this._magic_link_url + "/verify"


  get verify_magic_url(): string {
    return this._verify_magic_url;
  }

  get magic_link_url(): string {
    return this._magic_link_url;
  }

  get reset_password_url(): string {
    return this._reset_password_url;
  }

  get recovery_password_url(): string {
    return this._recovery_password_url;
  }

  private _verify_token_url = this._api_url + "/verify"

  private _login_url = this._api_url + "/login"

  private _logout_url = this._api_url + "/logout"

  private _password_check_url = this._password_url + "/check"


  get password_check_url(): string {
    return this._password_check_url;
  }

  private _notifications_url = this._notifications_api_url + "/notifications"

  get logout_url(): string {
    return this._logout_url;
  }

  get login_url(): string {
    return this._login_url;
  }

  get notifications_url(): string {
    return this._notifications_url;
  }

  private _project_base_url = this._project_api_url;

  private _new_project_url = this._project_api_url + "/"

  addMembersUrl(projectId: string): string {
    return `${this._project_api_url}/projects/${projectId}/addUsers`;
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

  get new_project_url() {
    return this._new_project_url;
  }

  get new_task_url() {
    return this._task_api_url;
  }

  getTasksByProjectId(projectId: string): string {
    return `${this._task_api_url}/tasks/${projectId}`;
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

  private _update_status_url = this._task_api_url + "/tasks"+ "/status";


  get notifications_api_url(): string {
    return this._notifications_api_url;
  }

  get task_api_url(): string {
    return this._task_api_url;
  }

  get update_status_url(): string {
    return this._update_status_url;
  }
}

