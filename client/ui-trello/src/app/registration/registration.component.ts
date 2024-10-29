import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {animate, state, style, transition, trigger} from "@angular/animations";
import {ToastrService} from "ngx-toastr";
import {AccountRequest} from "../models/account-request.model";
import {AccountService} from "../services/account.service";

@Component({
  selector: 'app-registration',
  templateUrl: './registration.component.html',
  styleUrl: './registration.component.css',
  animations: [
    trigger('flyInOut', [
      state('in', style({ opacity: 1 })),
      transition('void => *', [
        style({ opacity: 0 }),
        animate(300)
      ]),
      transition('* => void', [
        animate(300, style({ opacity: 0 }))
      ])
    ])
  ]
})
export class RegistrationComponent implements OnInit{
  registrationForm!: FormGroup;

  constructor(
    private formBuilder: FormBuilder,
    private accountService: AccountService,
    private toaster: ToastrService,
  ){}

  ngOnInit(): void {
    this.registrationForm = this.formBuilder.group({
      email: ['',
        [Validators.required, Validators.email]
      ],
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
    });
  }

  onSubmit() {
    if (this.registrationForm.valid) {
      const accountRequest: AccountRequest = {
        email: this.registrationForm.get('email')?.value,
        firstName: this.registrationForm.get('firstName')?.value,
        lastName: this.registrationForm.get('lastName')?.value,
      };
      this.accountService.register(accountRequest).subscribe( {
        next: (result) => {
          this.toaster.success(result.message);
          this.registrationForm.reset();

        },
        error: (result) => {
          this.toaster.error('Registration is not successful!');
        }
      });
    } else {
      this.toaster.error('Form is not valid!');
    }
  }
}
