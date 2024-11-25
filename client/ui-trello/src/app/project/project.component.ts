import {Component, OnInit} from '@angular/core';
import {ProjectDetails} from "../models/projectDetails";
import {ProjectServiceService} from "../services/project-service.service";
import {ActivatedRoute} from "@angular/router";
import {TaskDetails} from "../models/taskDetails";
import {Task, TaskStatus} from "../models/task";
import {TaskService} from "../services/task.service";
import {Account} from "../models/account.model";
import {UserDetails} from "../models/userDetails";
import {HttpClient} from "@angular/common/http";
import {ToastrService} from "ngx-toastr";

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
  searchTerm: string = '';
  private allUsers!: UserDetails[];
  filteredUsers: { [taskId: string]: UserDetails[] } = {};
  taskMembers: { [taskId: string]: UserDetails[] } = {};



  constructor(private projectService: ProjectServiceService, private route: ActivatedRoute,private taskService: TaskService, private http: HttpClient, private toastr: ToastrService) {}

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

        if (this.project && this.project.tasks) {

          this.organizeTasksByStatus(this.project.tasks);
        }
      },
      error: (err) => {
        console.error('Greška pri učitavanju podataka o projektu', err);
      }
    });
  }

  filterUsers(taskId: string) {
    this.filteredUsers[taskId] = this.allUsers
      .filter(user => user.email.toLowerCase().includes(this.searchTerm.toLowerCase()))
      .filter(user => {
        return !this.taskMembers[taskId]?.some(member => member.id === user.id);
      });
  }

  organizeTasksByStatus(tasks: TaskDetails[]): void {
    this.pendingTasks = tasks.filter(task => task.status === 'Pending');
    this.inProgressTasks = tasks.filter(task => task.status === 'In Progress');
    this.completedTasks = tasks.filter(task => task.status === 'Completed');
  }

  openTask(task: TaskDetails): void {
    console.log("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    console.log(task);
    console.log("kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk");
    this.selectedTask = task;


    console.log("kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk");
    console.log(this.selectedTask.users);
    console.log("kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk");

    console.log(this.selectedTask.userIds);
    console.log(this.selectedTask.user_ids)

    this.taskMembers[task.id] = task.user_ids.map(userId =>
      this.allUsers.find(user => user.id === userId)
    ).filter(user => user !== undefined) as UserDetails[];

    this.filteredUsers[task.id] = this.allUsers.filter(user =>
      !this.taskMembers[task.id].some(member => member.id === user.id)
    );



    this.checkIfUserInTask();

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
        user_ids: this.selectedTask.user_ids,
        dependencies: this.selectedTask.dependencies,
        blocked: this.selectedTask.blocked
      };
      console.log("Taskkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk");
      console.log(task);
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


  addUserToTask(selectedTask: TaskDetails, user: UserDetails) {
    if (!this.taskMembers[selectedTask.id]) {
      this.taskMembers[selectedTask.id] = [];
    }
    this.taskMembers[selectedTask.id].push(user);

    this.updateTaskMember(selectedTask.id, 'add', user.id);
    this.filterUsers(selectedTask.id)
  }

  removeUserFromTask(selectedTask: TaskDetails, member: UserDetails) {
    const assignedMembers = this.taskMembers[selectedTask.id] || [];

    if (selectedTask.status === 'In Progress' && assignedMembers.length === 1) {
      this.toastr.warning("Cannot remove the last assigned person from an in-progress task.");
      return;
    }

    const index = assignedMembers.findIndex(member => member.id === member.id);
    if (index !== -1) {
      assignedMembers.splice(index, 1);
      this.taskMembers[selectedTask.id] = assignedMembers;

      this.updateTaskMember(selectedTask.id, 'remove', member.id);

      this.filterUsers(selectedTask.id);
    }
  }


  private updateTaskMember(id: string, method: string, id2: string) {
    const url = `/api/task-server/tasks/${id}/members/${method}/${id2}`;

    this.http.post(url, {}).subscribe({
      next: () => {
        console.log(`User ${method}ed successfully`);
        if (this.projectId) {
          this.loadProjectDetails(this.projectId);
        }
      },
      error: (error) => {
        console.error('Error updating task member:', error);
      }
    });

  }
}
