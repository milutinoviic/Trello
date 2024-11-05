import { Component } from '@angular/core';
import {ToastrService} from "ngx-toastr";
import {AccountService} from "../services/account.service";

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.css'
})
export class ChangePasswordComponent {
  oldPassword!: string;
  newPassword!: string;
  repeatNewPassword!: string;

  constructor(private toastr: ToastrService, private accountService: AccountService) {
  }

  changePassword() {
    if (this.newPassword !== this.repeatNewPassword) {
      this.toastr.error('New passwords do not match.');
      return;
    }

    this.accountService.changePassword(this.newPassword).subscribe({
      next: (response) => {
        this.toastr.success(response.message);
        this.oldPassword = '';
        this.newPassword = '';
        this.repeatNewPassword = '';
      },
      error: (error) => {
        console.log(error);
        this.toastr.error(error.error);
      },
    });
  }

}
