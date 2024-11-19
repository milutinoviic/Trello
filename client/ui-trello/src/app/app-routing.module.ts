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

export const routes: Routes = [
  { path: 'register', component: RegistrationComponent, canActivate:[loginGuard]},
  { path: '', redirectTo: '/register', pathMatch: 'full' },
  { path: 'project/manageMembers/:projectId', component: MemberAdditionComponent, data:{ expectedRoles:"manager|member"}, canActivate:[roleGuard] },
  { path: 'projects', component: AddProjectComponent, data:{ expectedRoles:"manager|member"}, canActivate:[roleGuard] },
  { path: 'login', component: LoginComponent, canActivate:[loginGuard] },
  { path: 'notifications', component: NotificationsComponent },
  { path: 'changePassword', component: ChangePasswordComponent },
  { path: 'projects/:projectId/addTask', component: AddTaskComponent},
  { path:'recovery', component: PasswordRecoveryRequestComponent },
  { path: 'password/recovery/:email', component: PasswordResetComponent },
  { path: 'magic', component: MagicLinkRequestComponent },
  { path: 'magic/:email', component: MagicLinkComponent },
  { path: 'forbidden', component: ForbiddenComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
