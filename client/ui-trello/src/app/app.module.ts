import { NgModule } from '@angular/core';
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
import {AddTaskComponent} from "./add-task/add-task.component";


@NgModule({
  declarations: [
    AppComponent,
    RegistrationComponent,
    MemberAdditionComponent,
    AddTaskComponent
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
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
