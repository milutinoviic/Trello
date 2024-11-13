import {CanActivateFn, Router} from '@angular/router';
import {inject} from "@angular/core";
import {JwtHelperService} from '@auth0/angular-jwt';

export const roleGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const expectedRoles: string = route.data['expectedRoles'];
  const token = localStorage.getItem("user");
  const jwt = new JwtHelperService();

  if (!token) {
    router.navigate(["login"]);
    return false;
  }

  const info = jwt.decodeToken(token);
  const roles: string[] = expectedRoles.split("|");

  if (roles.indexOf(info.role) === -1) {
    router.navigate(["/auth/forbidden"]); // generisati forbidden stranicu
    return false;
  }

  return true;
};
