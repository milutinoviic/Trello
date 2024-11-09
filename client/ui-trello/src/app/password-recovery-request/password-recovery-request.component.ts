import { Component } from '@angular/core';
import {AccountService} from "../services/account.service";
import {ToastrService} from "ngx-toastr";

@Component({
  selector: 'app-password-recovery-request',
  templateUrl: './password-recovery-request.component.html',
  styleUrl: './password-recovery-request.component.css'
})
export class PasswordRecoveryRequestComponent {
  email: string = '';

  constructor(private accountService: AccountService, private toastr: ToastrService) {}

  requestPasswordReset() {
    this.accountService.requestPasswordReset(this.email).subscribe({
      next: () => {
        this.toastr.success('Recovery email sent. Please check your inbox.');
      },
      error: (err) => {
        this.toastr.error(err.error.message || 'Failed to send recovery email');
      }
    });
  }
}
