import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {RegistrationComponent} from "./registration/registration.component";
import {MemberAdditionComponent} from "./member-addition/member-addition.component";
import {AddProjectComponent} from "./add-project/add-project.component";
import {DeleteMemberComponent} from "./delete-member/delete-member.component";

export const routes: Routes = [
  { path: 'register', component: RegistrationComponent },
  { path: '', redirectTo: '/register', pathMatch: 'full' },
  { path: 'project/addMembers', component: MemberAdditionComponent },
  { path: 'projects', component: AddProjectComponent},
  {path:'projects/deleteMember/{id}',component: DeleteMemberComponent},];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
