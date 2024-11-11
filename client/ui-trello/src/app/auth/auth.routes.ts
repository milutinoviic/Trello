import { Routes } from "@angular/router";
import { LoginGuard } from "./guards/login.guard";
import {LoginComponent} from "./login/login.component";

export const authRoutes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [LoginGuard]
  }
];
