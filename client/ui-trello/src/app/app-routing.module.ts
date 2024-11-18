import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {RegistrationComponent} from "./registration/registration.component";
import {MemberAdditionComponent} from "./member-addition/member-addition.component";
import {AddProjectComponent} from "./add-project/add-project.component";
import {LoginComponent} from "./login/login.component";
import {NotificationsComponent} from "./notifications/notifications.component";
import {ChangePasswordComponent} from "./change-password/change-password.component";
import {AddTaskComponent} from "./add-task/add-task.component";
import { PasswordRecoveryRequestComponent } from './password-recovery-request/password-recovery-request.component';
import {PasswordResetComponent} from "./password-reset/password-reset.component";
import {MagicLinkRequestComponent} from "./magic-link-request/magic-link-request.component";
import {MagicLinkComponent} from "./magic-link/magic-link.component";
import {roleGuard} from "./guards/role.guard";
import {ForbiddenComponent} from "./forbidden/forbidden.component";
import {loginGuard} from "./guards/login.guard";
import {ProjectComponent} from "./project/project.component";
import {ProjectInfoComponent} from "./project-info/project-info.component";

export const routes: Routes = [
  { path: 'register', component: RegistrationComponent, canActivate:[loginGuard]},
  { path: '', redirectTo: '/register', pathMatch: 'full' },
  { path: 'project/manageMembers/:projectId', component: MemberAdditionComponent, data:{ expectedRoles:"manager"}, canActivate:[roleGuard] },
  { path: 'projects', component: AddProjectComponent, data:{ expectedRoles:"manager|member"}, canActivate:[roleGuard] },
  { path: 'login', component: LoginComponent, canActivate:[loginGuard] },
  { path: 'notifications', component: NotificationsComponent ,data:{ expectedRoles:"manager|member"}, canActivate:[roleGuard]},
  { path: 'changePassword', component: ChangePasswordComponent ,data:{ expectedRoles:"manager|member"}, canActivate:[roleGuard]},
  { path: 'projects/:projectId/addTask', component: AddTaskComponent,data:{ expectedRoles:"manager|member"}, canActivate:[roleGuard]},
  { path:'recovery', component: PasswordRecoveryRequestComponent ,data:{ expectedRoles:"manager|member"}, canActivate:[roleGuard]},
  { path: 'password/recovery/:email', component: PasswordResetComponent ,data:{ expectedRoles:"manager|member"}, canActivate:[roleGuard]},
  { path: 'magic', component: MagicLinkRequestComponent ,data:{ expectedRoles:"manager|member"}, canActivate:[roleGuard]},
  { path: 'magic/:email', component: MagicLinkComponent ,data:{ expectedRoles:"manager|member"}, canActivate:[roleGuard]},
  { path: 'forbidden', component: ForbiddenComponent },
  { path: 'project', component: ProjectComponent ,data:{ expectedRoles:"manager|member"}, canActivate:[roleGuard]},
  { path: 'projectInfo/:projectId', component: ProjectInfoComponent ,data:{ expectedRoles:"manager|member"}, canActivate:[roleGuard]},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
