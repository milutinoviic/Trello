import {APP_INITIALIZER, NgModule} from '@angular/core';
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
import { MagicLinkComponent } from './magic-link/magic-link.component';
import { MagicLinkRequestComponent } from './magic-link-request/magic-link-request.component';
import { RECAPTCHA_SETTINGS, RecaptchaFormsModule, RecaptchaModule, RecaptchaSettings } from 'ng-recaptcha';
import {environment} from "../environments/environment";
import { ForbiddenComponent } from './forbidden/forbidden.component';

import {AccountService} from "./services/account.service";
import { ProjectComponent } from './project/project.component';
import { ProjectHistoryComponent } from './project-history/project-history.component';
import { GraphEditorComponent } from './graph-editor/graph-editor.component';
import { AccountVerificationComponent } from './account-verification/account-verification.component';
import { AnalyticsComponent } from './analytics/analytics.component';




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
    ForbiddenComponent,
    ProjectComponent,
    ProjectHistoryComponent,
    GraphEditorComponent,
    AccountVerificationComponent,
    AnalyticsComponent,
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
    RecaptchaModule,
    RecaptchaFormsModule,
  ],
  providers: [
    {
      provide: RECAPTCHA_SETTINGS,
      useValue: {
        siteKey: environment.recaptcha.siteKey,
      } as RecaptchaSettings,
    },
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
