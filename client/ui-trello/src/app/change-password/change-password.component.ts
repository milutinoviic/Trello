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

  passwordValidation = {
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    specialChar: false,
  };

  private passwordRegex = {
    length: /.{8,}/,
    uppercase: /[A-Z]/,
    lowercase: /[a-z]/,
    number: /[0-9]/,
    specialChar: /[!@#$%^&*]/,
  };

  validatePassword() {
    this.passwordValidation.length = this.passwordRegex.length.test(this.newPassword);
    this.passwordValidation.uppercase = this.passwordRegex.uppercase.test(this.newPassword);
    this.passwordValidation.lowercase = this.passwordRegex.lowercase.test(this.newPassword);
    this.passwordValidation.number = this.passwordRegex.number.test(this.newPassword);
    this.passwordValidation.specialChar = this.passwordRegex.specialChar.test(this.newPassword);
  }

  isPasswordValid(): boolean {
    return (
      this.passwordValidation.length &&
      this.passwordValidation.uppercase &&
      this.passwordValidation.lowercase &&
      this.passwordValidation.number &&
      this.passwordValidation.specialChar &&
      this.newPassword === this.repeatNewPassword
    );
  }

  changePassword() {
    if (this.newPassword !== this.repeatNewPassword) {
      this.toastr.error('New passwords do not match.');
      return;
    }
    this.accountService.checkPassword().subscribe({
      next: value => {
        if (value) {
          this.toastr.error("Password don't match.");
          return;
        }
      },
      error: err => {
        this.toastr.error('There has been an error, try again.');
        return;
      }
    })

    this.accountService.changePassword(this.newPassword).subscribe({
      next: (response) => {
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
