import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  constructor() { }

  private _api_url = 'http://localhost:8080/api';

  private _register_url = this._api_url + "/register"

  get register_url() {
    return this._register_url;
  }
}
