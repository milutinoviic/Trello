import {Component, OnInit} from '@angular/core';
import {AccountService} from "../services/account.service";
import {ToastrService} from "ngx-toastr";
import {Router} from "@angular/router";
import {DeleteService} from "../services/delete.service";
import { CommonModule } from '@angular/common';
import {error} from "@angular/compiler-cli/src/transformers/util";
import {HttpClient} from "@angular/common/http";
import {NotificationService} from "../services/notification-service.service";

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  standalone: true,
  styleUrl: './menu.component.css',
  imports: [CommonModule]
})
export class MenuComponent implements OnInit {

  constructor(private accountService: AccountService, private toastrService: ToastrService, private router: Router, private deleteService: DeleteService, private notificationService: NotificationService) {

  }
  visible: boolean = false;
  userId: string | null = ""
  message: string = "Are you sure you want to delete your account?"
  unreadNotifications = 0;


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

  fetchUnreadNotificationCount(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (response: { unreadCount: number }) => {
        this.unreadNotifications = response.unreadCount;
        console.log('Unread notifications count:', this.unreadNotifications);
      },
      error: (err) => {
        console.log('Error fetching notifications:', err);
      }
    });
  }

  ngOnInit(): void {
    this.fetchUnreadNotificationCount();
  }
}
