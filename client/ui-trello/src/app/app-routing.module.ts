import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {RegistrationComponent} from "./registration/registration.component";
import {MemberAdditionComponent} from "./member-addition/member-addition.component";
import {AddProjectComponent} from "./add-project/add-project.component";
import {LoginComponent} from "./auth/login/login.component";
import {ChangePasswordComponent} from "./change-password/change-password.component";
import {RoleGuard} from "./auth/guards/role.guard";

export const routes: Routes = [
  { path: 'register', component: RegistrationComponent },
  { path: '', redirectTo: '/register', pathMatch: 'full' },
  { path: 'project/manageMembers/:projectId', component: MemberAdditionComponent },
  { path: 'projects',
    component: AddProjectComponent,
    canActivate:[RoleGuard],
    data:{expectedRoles:"MANAGER"}},
  { path: 'changePassword', component: ChangePasswordComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
