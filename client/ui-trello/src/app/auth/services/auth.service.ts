

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  getUserRole(): string {
    const token = localStorage.getItem('token');
    if (token) {
      const payloadPart = token.split('.')[1];
      const decodedPayload = JSON.parse(atob(payloadPart));
      return decodedPayload.role;

    }
    return '';
  }
}

