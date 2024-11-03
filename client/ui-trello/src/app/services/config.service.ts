import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  constructor() { }

  private _api_url = 'http://localhost:8082';

  private _project_api_url = 'http://localhost:8080';


  private _register_url = this._api_url + "/register"

  private _project_base_url = this._project_api_url;

  private _new_project_url = this._project_api_url + "/"


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
