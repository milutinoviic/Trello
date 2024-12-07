import {Component, OnInit} from '@angular/core';
import {AnalyticsService} from "../services/analytics.service";
import {ActivatedRoute} from "@angular/router";
import {ProjectDetails} from "../models/projectDetails";
import {ProjectServiceService} from "../services/project-service.service";
import {UserDetails} from "../models/userDetails";

interface EventData {
  type: string;
  time: string;
  event: any;
}

@Component({
  selector: 'app-project-history',
  templateUrl: './project-history.component.html',
  styleUrl: './project-history.component.css'
})
export class ProjectHistoryComponent implements OnInit {
  events: any[] = [];
  projectID: string = '';
  project: ProjectDetails | null = null;
  private allUsers!: UserDetails[];


  constructor(
    private eventService: AnalyticsService,
    private projectService: ProjectServiceService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.projectID = this.route.snapshot.paramMap.get('projectId') || '';
    if (this.projectID) {
      this.loadProjectDetails(this.projectID)
      this.loadEvents();
    }
  }

  loadEvents(): void {
    this.eventService.getEvents(this.projectID).subscribe(
      (data) => (this.events = data.reverse()),
      (error) => console.error('Error fetching events:', error)
    );
  }

  generateReadableMessage(eventData: EventData): string {
    const eventDate = new Date(eventData.time);
    eventDate.setHours(eventDate.getHours() - 1); // Subtract 1 hour
    const eventTime = eventDate.toLocaleString();
    const memberName = this.getMemberName(eventData.event.memberId);
    const taskName = this.getTaskName(eventData.event.taskId);
    const changedBy = this.getMemberName(eventData.event.changedBy);


    switch (eventData.type) {
      case "MemberAdded":
        return `Member "${memberName}" was added to the project on ${eventTime}.`;
      case "TaskCreated":
        return `Task "${taskName}" was created on ${eventTime}.`;
      case "MemberAddedTask":
        return `Member "${memberName}" was assigned to task "${taskName}" on ${eventTime}.`;
      case "MemberRemovedTask":
        return `Member "${memberName}" was removed from task "${taskName}" on ${eventTime}.`;
      case "MemberRemoved":
        return `Member "${memberName}" was removed from the project on ${eventTime}.`;
      case "TaskStatusChanged":
        return `Task "${taskName}" was marked as "${eventData.event.status}" by user "${changedBy}" on ${eventTime}.`;
      default:
        return `An unknown event occurred on ${eventTime}.`;
    }
  }

  loadProjectDetails(projectId: string): void {
    this.projectService.getProjectDetailsById(projectId).subscribe({
      next: (data: ProjectDetails) => {
        this.project = data;
        const userIds = this.project.user_ids;
        if (!Array.isArray(userIds) || userIds.length === 0) {
          console.error('Invalid userIds:', userIds);
          return;
        }

        fetch('/api/user-server/users/details', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userIds: userIds })
        })
          .then(response => response.json())
          .then(data => {
            console.log("DATA: " + JSON.stringify(data));
            this.allUsers = data;
          })
          .catch(error => {
            console.error('Error:', error);
          });
      },
      error: (err) => {
        console.error('Greška pri učitavanju podataka o projektu', err);
      }
    });
  }


  getCustomEventType(eventType: string): string {
    const eventTypeMap: { [key: string]: string } = {
      MemberAdded: 'New Member Added to Project',
      TaskCreated: 'Task Created',
      MemberAddedTask: 'Member Assigned to Task',
      MemberRemovedTask: 'Member Unassigned from Task',
      MemberRemoved: 'Member Removed from Project',
      TaskStatusChanged: 'Task Status Updated',
    };

    return eventTypeMap[eventType] || 'Unknown Event';
  }



  getTaskName(taskId: string): string {
    const task = this.project?.tasks?.find(t => t.id === taskId);
    return task ? task.name : taskId;
  }

  getMemberName(memberId: string): string {
    const member = this.allUsers?.find(u => u.id === memberId);
    return member ? member.first_name : memberId;
  }
}



