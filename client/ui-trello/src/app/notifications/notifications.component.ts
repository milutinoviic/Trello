import { Component } from '@angular/core';
import {NotificationService} from "../services/notification-service.service";
import {AccountService} from "../services/account.service";

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  status: 'unread' | 'read';
}

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css'
})
export class NotificationsComponent {
  notifications: Notification[] = [];
  errorMessage: string = '';
  userId: string = '';

  constructor(private notificationService: NotificationService, private accService: AccountService) {}

  ngOnInit(): void {
    this.userId = this.accService.idOfUser;
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.notificationService.getAllNotifications(this.userId).subscribe({
      next: (notifications) => {
        this.notifications = notifications;
        console.log(this.notifications);
      },
      error: (err) => {
        this.errorMessage = 'Failed to load notifications';
        console.error(err);
      },
    });
  }

  toggleStatus(notification: Notification): void {
    const newStatus = notification.status === 'read' ? 'unread' : 'read';
    this.notificationService.updateNotificationStatus(notification.id, newStatus).subscribe({
      next: () => {
        notification.status = newStatus;
      },
      error: (err) => {
        this.errorMessage = 'Failed to update notification status';
        console.error(err);
      },
    });
  }
}
