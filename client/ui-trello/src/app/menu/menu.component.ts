import { Component } from '@angular/core';
import {AccountService} from "../services/account.service";
import {ToastrService} from "ngx-toastr";
import {Router} from "@angular/router";
import {DeleteService} from "../services/delete.service";

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  standalone: true,
  styleUrl: './menu.component.css'
})
export class MenuComponent {

  constructor(private accountService: AccountService, private toastrService: ToastrService, private router: Router, private deleteService: DeleteService,) {

  }

  userId: string | null = ""

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
          console.log("Status Code:", error.status);
          console.log("Message:", error.message);
          console.log("Response Body:", error.error);
          alert(error.error)
        }
      })


  }

  navigateToChangePassword() {
    this.router.navigate(['/changePassword']);
  }
  notifications(){
    this.router.navigate(['/notifications']);

  }
}
