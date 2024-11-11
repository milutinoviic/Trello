import {APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { RegistrationComponent } from './registration/registration.component';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {HttpClientModule} from "@angular/common/http";
import {ToastrModule} from "ngx-toastr";
import { MemberAdditionComponent } from './member-addition/member-addition.component';
import {CdkDrag, CdkDropList, DragDropModule} from "@angular/cdk/drag-drop";
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LoginComponent } from './login/login.component';
import { ChangePasswordComponent } from './change-password/change-password.component';
import { MenuComponent } from './menu/menu.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NotificationsComponent } from './notifications/notifications.component';
import {AddTaskComponent} from "./add-task/add-task.component";
import { PasswordRecoveryRequestComponent } from './password-recovery-request/password-recovery-request.component';
import { PasswordResetComponent } from './password-reset/password-reset.component';
import { AccountService } from './services/account.service';
import { MagicLinkComponent } from './magic-link/magic-link.component';
import { MagicLinkRequestComponent } from './magic-link-request/magic-link-request.component';


function initTokenVerification(accountService: AccountService) {
  return () => {
    const userId = accountService.getUserId();
    if (userId) {
      accountService.startTokenVerification(userId);
    }
  };
}

@NgModule({
  declarations: [
    AppComponent,
    RegistrationComponent,
    MemberAdditionComponent,
    LoginComponent,
    ChangePasswordComponent,
    NotificationsComponent,
    ChangePasswordComponent,
    AddTaskComponent,
    PasswordRecoveryRequestComponent,
    PasswordResetComponent,
    MagicLinkRequestComponent,
    MagicLinkComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    HttpClientModule,
    ToastrModule.forRoot(),
    CdkDropList,
    FormsModule,
    CdkDrag,
    DragDropModule,
    NgbModule,
    MenuComponent,
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: initTokenVerification,
      deps: [AccountService],
      multi: true
    }
  ],
  exports: [
    MenuComponent
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
