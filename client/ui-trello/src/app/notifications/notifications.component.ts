import { Component } from '@angular/core';
import {NotificationService} from "../services/notification-service.service";

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

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.notificationService.getAllNotifications().subscribe({
      next: (notifications) => {
        this.notifications = notifications;
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
