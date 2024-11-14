import { Component } from '@angular/core';
import {AccountService} from "../services/account.service";
import {ToastrService} from "ngx-toastr";
import {Router} from "@angular/router";
import {DeleteService} from "../services/delete.service";
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  standalone: true,
  styleUrl: './menu.component.css',
  imports: [CommonModule]
})
export class MenuComponent {

  constructor(private accountService: AccountService, private toastrService: ToastrService, private router: Router, private deleteService: DeleteService,) {

  }
  visible: boolean = false;
  userId: string | null = ""
  message: string = "Are you sure you want to delete your account?"

  logout() {
    this.accountService.logout().subscribe({
      next: () => {
        this.toastrService.success("Logged out!");
        this.router.navigate(['/login'])
      },
      error: () => {
        this.toastrService.error('Logout failed');
    }
    })
  }


  deleteAccount() {
      this.deleteService.deleteAccount().subscribe({
        next: () => {
          this.accountService.logout().subscribe({
            next: () => {
              console.log("Account deleted and logged out successfully!");

              this.router.navigate(['/login']);
            },
            error: () => {
              console.log("Account deleted, but logout failed.");

            }
          });
          this.router.navigate(['/login']);
          alert("Successfully deleted profile.");
        },
        error: (error) => {
          console.log("Deleting account failed.");
          console.log("Response Body:", error.error);
          alert(error.error)
        }
      })

    this.cancel();


  }
  cancel() {
    this.visible = !this.visible;
  }

  navigateToChangePassword() {
    this.router.navigate(['/changePassword']);
  }
  notifications(){
    this.router.navigate(['/notifications']);

  }
}
