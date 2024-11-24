import {Component, OnInit} from '@angular/core';
import {ProjectDetails} from "../models/projectDetails";
import {ProjectServiceService} from "../services/project-service.service";
import {ActivatedRoute} from "@angular/router";
import {TaskDetails} from "../models/taskDetails";
import {TaskStatus} from "../models/task";

@Component({
  selector: 'app-project',
  templateUrl: './project.component.html',
  styleUrl: './project.component.css'
})
export class ProjectComponent implements OnInit {

  project: ProjectDetails | null = null;
  projectId: string | null = null;

  pendingTasks: TaskDetails[] = [];
  inProgressTasks: TaskDetails[] = [];
  completedTasks: TaskDetails[] = [];

  selectedTask: TaskDetails | null = null;


  constructor(private projectService: ProjectServiceService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {

      const projectId = params.get('projectId');


      if (projectId) {
        this.projectId = projectId;
        this.loadProjectDetails(projectId);
      } else {

        this.projectId = '';
        console.error('Project ID nije prisutan u URL-u!');
      }
    });
  }


  loadProjectDetails(projectId: string): void {
    this.projectService.getProjectDetailsById(projectId).subscribe({
      next: (data: ProjectDetails) => {
        this.project = data;
        console.log(this.project);
        console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");

        if (this.project && this.project.tasks) {
          this.organizeTasksByStatus(this.project.tasks);
        }
      },
      error: (err) => {
        console.error('Greška pri učitavanju podataka o projektu', err);
      }
    });
  }

  organizeTasksByStatus(tasks: TaskDetails[]): void {
    this.pendingTasks = tasks.filter(task => task.status === 'Pending');
    this.inProgressTasks = tasks.filter(task => task.status === 'In Progress');
    this.completedTasks = tasks.filter(task => task.status === 'Completed');
  }

  openTask(task: TaskDetails): void {
    this.selectedTask = task;

    console.log(this.selectedTask.users);

  }

  showAddMemberModal = false;

  openMemberAdditionModal(projectId: string | null): void {
    if (projectId) {
      this.projectId = projectId;
      this.showAddMemberModal = true;
    } else {
      console.error('Project ID is null');
    }
  }


  closeMemberAdditionModal() {
    this.showAddMemberModal = false;
  }

  closeTask(): void {
    this.selectedTask = null;
    console.log("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    console.log(this.selectedTask);

  }

  showDropdown: boolean = false;

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }



  changeStatus(newStatus: TaskStatus): void {
    if (this.selectedTask) {
      const taskId = this.selectedTask.id; // Preuzmite ID trenutnog taska
      this.projectService.updateTaskStatus(taskId, newStatus).subscribe({
        next: () => {
          this.selectedTask!.status = newStatus; // Ažurirajte status lokalno
          console.log(`Status successfully updated to: ${newStatus}`);
          this.refreshTaskLists(); // Osvežavanje taskova po statusu
        },
        error: (err) => {
          console.error('Failed to update task status:', err);
        },
      });
    }
  }

  refreshTaskLists(): void {
    if (this.project && this.project.tasks) {
      this.organizeTasksByStatus(this.project.tasks);
    }
  }






}
