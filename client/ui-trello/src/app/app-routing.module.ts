import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {RegistrationComponent} from "./registration/registration.component";
import {MemberAdditionComponent} from "./member-addition/member-addition.component";
import {AddProjectComponent} from "./add-project/add-project.component";
import {AddTaskComponent} from "./add-task/add-task.component";

export const routes: Routes = [
  { path: 'register', component: RegistrationComponent },
  { path: '', redirectTo: '/register', pathMatch: 'full' },
  { path: 'project/manageMembers/:projectId', component: MemberAdditionComponent },
  { path: 'projects', component: AddProjectComponent},
  { path: 'projects/:projectId/addTask', component: AddTaskComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
