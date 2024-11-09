import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {AccountRequest} from "../models/account-request.model";
import {LoginRequest} from "../models/login-request";
import {AccountService} from "../services/account.service";
import {ToastrService} from "ngx-toastr";
import {Router} from "@angular/router";


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css', '../registration/registration.component.css']
})
export class LoginComponent implements OnInit {

  loginForm!: FormGroup;
  private isSubmitting: boolean = false;

  constructor(
    private formBuilder: FormBuilder,
    private accountService: AccountService,
    private toastr: ToastrService,
    private router: Router,
  ){}

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      email: ['',
        [Validators.required, Validators.email]
      ],
      password: ['', [Validators.required]],
    });
  }

  onSubmit() {
    if (this.loginForm.valid && !this.isSubmitting) {
      this.isSubmitting = true; // Set loading state
      const accountRequest: LoginRequest = {
        email: this.loginForm.get('email')?.value,
        password: this.loginForm.get('password')?.value,
      };

      this.accountService.login(accountRequest).subscribe({
        next: (result) => {
          const userId = result.id;

          this.accountService.startTokenVerification(userId);

          this.router.navigate(['/projects']);
        },
        error: (error) => {
          console.error("Login error:", error);
          this.toastr.error(error.message || error);
        }
      });
    } else {
      console.log('Form is not valid!');
    }
  }





}
