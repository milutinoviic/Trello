import {Component, OnInit} from '@angular/core';
import {ProjectDetails} from "../models/projectDetails";
import {ProjectServiceService} from "../services/project-service.service";
import {ActivatedRoute} from "@angular/router";
import {TaskDetails} from "../models/taskDetails";
import {Task, TaskStatus} from "../models/task";
import {TaskService} from "../services/task.service";

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

  isUserInTask: boolean = false;

  showAddTaskModal: boolean = false;


  constructor(private projectService: ProjectServiceService, private route: ActivatedRoute,private taskService: TaskService) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {

      const projectId = params.get('projectId');


      if (projectId) {
        this.projectId = projectId;
        this.loadProjectDetails(projectId);
        this.checkIfUserInTask();
      } else {

        this.projectId = '';
        console.error('Project ID nije prisutan u URL-u!');
      }
    });
  }

  isManager(): boolean {
    const role = localStorage.getItem('role');
    return role === 'manager';
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

  checkIfUserInTask(): void {
    if (this.selectedTask) {
      const task: Task = {
        id: this.selectedTask.id,
        projectId: this.selectedTask.projectId,
        name: this.selectedTask.name,
        description: this.selectedTask.description,
        status: this.selectedTask.status,
        createdAt: this.selectedTask.createdAt,
        updatedAt: this.selectedTask.updatedAt,
        user_ids: this.selectedTask.userIds,
        dependencies: this.selectedTask.dependencies,
        blocked: this.selectedTask.blocked
      };

      // Poziv servisa sa konvertovanim objektom
      this.taskService.checkIfUserInTask(task).subscribe(
        (response: boolean) => {
          this.isUserInTask = response;
          console.log("----------------------------------------------------------------");
          console.log("aAAAAAAAAAAAAAAAAAAAAAA KKKKKKK CCCC BBBBB 12343245654654");
          console.log(this.isUserInTask);
          console.log("RAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
          console.log('User is in task:', response);
        },
        (error) => {
          console.error('Error checking user in task:', error);
        }
      );
    } else {
      console.warn('No task selected for user check.');
      this.isUserInTask = false;
    }
  }


  openAddTaskModal (projectId: string | null): void{
    if (projectId) {
      this.projectId = projectId;
      this.showAddTaskModal = true;
    } else {
      console.error('Project ID is null');
    }

  }




  closeTaskAdditionModal(): void {
    this.showAddTaskModal = false;
  }










}
