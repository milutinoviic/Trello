import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, Router } from "@angular/router";
import { JwtHelperService } from "@auth0/angular-jwt";
import { jwtDecode } from "jwt-decode";

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor( public router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const expectedRoles: string = route.data['expectedRoles'];
    const token = localStorage.getItem("user");
    const jwt: JwtHelperService = new JwtHelperService();
    if (!token) {
      this.router.navigate(["/auth/login"]);
      return false;
    }
    console.log("USLO");

    console.log(expectedRoles)
    const info = jwt.decodeToken(token);
    console.log(info)
    console.log(info.role[0].name);
    console.log("STEFASN");
    console.log(info.role);
    const roles: string[] = expectedRoles.split("|");
    console.log(roles);
    console.log(info.role);
    if (roles.indexOf(info.role[0].name) === -1) {
      this.router.navigate(["/auth/forbidden"]);
      return false;
    }
    return true;
  }

}
