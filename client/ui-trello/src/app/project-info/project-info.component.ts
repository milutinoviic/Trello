import {Component, OnInit} from '@angular/core';
import {Project} from "../models/project.model";
import {ProjectServiceService} from "../services/project-service.service";
import {ActivatedRoute, Router} from "@angular/router";
import {AccountService} from "../services/account.service";
import {Task} from "../models/task";
import {HttpClient} from "@angular/common/http";




export interface UserResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role: string;
}

interface User {
  id: string;
  email: string;
}



@Component({
  selector: 'app-project-info',
  templateUrl: './project-info.component.html',
  styleUrl: './project-info.component.css'
})
export class ProjectInfoComponent implements OnInit {

  allUsers: User[] = [];
  projectMembers: any[] = [];
  searchTerm: string = '';
  minMembers: number = 0;
  maxMembers: number = 0;
  filteredUsers: User[] = [];
  projectId: string = '';
  project: Project | null = null;
  managerId: string = "";
  tasks: Task[] = [];

  constructor(
    private projectService: ProjectServiceService,
    private route: ActivatedRoute,
    private accountService: AccountService,
    private router: Router,
    private http: HttpClient,
  ) {}

  ngOnInit() {
    this.managerId = this.accountService.getUserId()!;
    console.log("userId: " + this.managerId);

    this.route.paramMap.subscribe(params => {
      this.projectId = params.get('projectId')!;

      this.fetchTasks(this.projectId);

      this.accountService.getAllUsers().subscribe({
        next: (users: UserResponse[]) => {
          this.allUsers = users.map(user => ({
            id: user.id,
            email: user.email
          }));

          this.projectService.getProjectById(this.projectId).subscribe({
            next: (project: Project) => {
              console.log('Project:', project);

              const userIds = project.user_ids || [];

              this.projectMembers = this.allUsers.filter(user =>
                userIds.includes(user.id)
              );
              this.project = project;

              this.minMembers = project.min_members;
              this.maxMembers = project.max_members;

              this.filteredUsers = this.allUsers.filter(user =>
                !this.projectMembers.some(member => member.id === user.id)
              );
            },
            error: (err) => {
              console.error('Error retrieving project:', err);
            }
          });
        },
        error: (err) => {
          console.error('Error retrieving users:', err);
        }
      });
    });
  }


  filterUsers() {
    this.filteredUsers = this.allUsers
      .filter(user => user.email.toLowerCase().includes(this.searchTerm.toLowerCase()))
      .filter(user => !this.projectMembers.some(member => member.id === user.id));
  }

  addMember(user: User) {
    if (!this.isFull() && !this.projectMembers.some(member => member.id === user.id)) {
      this.projectMembers.push(user);

      const memberIds = this.projectMembers.map(member => member.id);

      this.projectService.addMembersToProject(this.projectId, memberIds).subscribe({
        next: () => {
          console.log('Members added successfully:', memberIds);
        },
        error: (err) => {
          console.error('Error adding members:', err);
        }
      });

      this.filterUsers();
    }
  }

  removeMember(userId: string) {

    if (this.projectMembers.length <= this.minMembers) {
      alert("Cannot remove member: Minimum number of members required.")
      return;
    }
    console.log("---------------------------------------------")
    console.log(`Obrisan je user id-- ${userId}`);
    console.log("---------------------------------------------")
    this.projectMembers = this.projectMembers.filter(member => member.id !== userId);
    this.filterUsers();
    console.log(`Project id-- ${this.projectId}`);

    this.projectService.deleteMemberFromProject(this.projectId,userId).subscribe({
      next: () => console.log(`User sa ID ${userId} je uspesoo obrisan.`),
      error: (error) => console.error('Greška prlikom .....', error)
    });

  }


  isUserAssigned(user: User): boolean {
    return this.projectMembers.some(member => member.id === user.id);
  }

  isFull(): boolean {
    return this.projectMembers.length >= this.maxMembers;
  }


  addNewTask(projectId: string) {
    this.router.navigate([`/projects/${projectId}/addTask`]);

  }

  addNewProject() {
    this.router.navigate(['/projects']);
  }


  showAddTask: boolean = false;
  openAddTaskModal() {
    this.showAddTask = true;
  }

  closeAddTaskModal() {
    this.showAddTask = false;
  }


  fetchTasks(projectId: string) {
    this.http.get<Task[]>(`/api/task-server/tasks/${projectId}`)
      .subscribe({
        next: (response) => {
          this.tasks = response.reverse();
          console.log('Data fetched successfully:', this.tasks);
        },
        error: (error) => {
          console.error('Error fetching data:', error);
        }
      });
  }


  selectedTask: any = null;

  selectTask(task: any): void {
    this.selectedTask = task;
  }

  closeTaskDetails(): void {
    this.selectedTask = null;
  }


}
