import {Component, OnInit} from '@angular/core';
import {ProjectDetails} from "../models/projectDetails";
import {ProjectServiceService} from "../services/project-service.service";
import {ActivatedRoute, Router} from "@angular/router";
import {TaskDetails} from "../models/taskDetails";
import {Task, TaskStatus} from "../models/task";
import {TaskService} from "../services/task.service";
import {Account} from "../models/account.model";
import {UserDetails} from "../models/userDetails";
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {ToastrService} from "ngx-toastr";
import {TaskDocumentDetails} from "../models/taskDocumentDetails.model";
import {TaskNode} from "../models/task-graph";

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
  tasks: TaskDetails[] = [];


  taskDocumentDetails: TaskDocumentDetails[] = [];



  constructor(private projectService: ProjectServiceService,private router: Router ,private route: ActivatedRoute,private taskService: TaskService, private http: HttpClient, private toastr: ToastrService) {}

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
        this.tasks = this.project.tasks;

        console.log('Project:', this.project);

        // Skip fetch if userIds is empty
        const userIds = this.project.user_ids;
        if (!Array.isArray(userIds) || userIds.length === 0) {
          console.warn('No userIds provided, skipping fetch.');
          this.organizeTasksByStatus(this.project.tasks);
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
            console.log('User data:', data);
            this.allUsers = data;
          })
          .catch(error => {
            console.error('Error fetching user details:', error);
          });

        if (this.project && this.project.tasks) {
          this.organizeTasksByStatus(this.project.tasks);
        }
      },
      error: (err) => {
        console.error('Error loading project details:', err);
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
    console.log(task);

    this.selectedTask = task;
    this.getTaskDocumentsForTask();

    console.log(this.selectedTask.users);
    console.log(this.selectedTask.userIds);
    console.log(this.selectedTask.user_ids);

    this.taskMembers[task.id] = (task.user_ids || [])
      .map(userId => this.allUsers.find(user => user.id === userId))
      .filter(user => user !== undefined) as UserDetails[];

    if (!this.taskMembers[task.id]) {
      this.taskMembers[task.id] = [];
    }

    this.filteredUsers[task.id] = this.allUsers.filter(user =>
      !(this.taskMembers[task.id]?.some(member => member.id === user.id))
    );

    if (!this.filteredUsers[task.id]) {
      this.filteredUsers[task.id] = [];
    }

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
    console.log(this.selectedTask);

  }

  showDropdown: boolean = false;

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }



  changeStatus(newStatus: TaskStatus): void {
    if (this.selectedTask) {
      const dependencies = this.getAllTaskDependencies(this.selectedTask);
      console.log("All Dependencies:::" + JSON.stringify(dependencies));

      const hasPendingDependencies = dependencies.some(dep => dep.status === 'Pending');
      console.log("Has pending dependencies? " + hasPendingDependencies);

      if (hasPendingDependencies) {
        this.toastr.warning("Cannot change status: One or more dependencies are still pending.");
        return;
      }

      const taskId = this.selectedTask.id; // Get the ID of the selected task
      this.projectService.updateTaskStatus(taskId, newStatus).subscribe({
        next: () => {
          this.selectedTask!.status = newStatus; // Update the status locally
          console.log(`Status successfully updated to: ${newStatus}`);
          this.refreshTaskLists(); // Refresh tasks based on the new status
          this.toastr.success("Successfully changed the status.");
        },
        error: (err) => {
          console.error('Failed to update task status:', err);
          this.toastr.warning("You can't change the status at this time.");
        },
      });
    }
  }


  getAllTaskDependencies(task: TaskDetails): TaskDetails[] {
    console.log("Fetching dependencies for task: " + JSON.stringify(task));


    const dependencies: TaskDetails[] = this.tasks.filter(t => task.dependencies.includes(t.id));
    console.log("Direct Dependencies: " + JSON.stringify(dependencies));


    let allDependencies: TaskDetails[] = [...dependencies];
    dependencies.forEach(dep => {
      const subDependencies = this.getAllTaskDependencies(dep);
      allDependencies = [...allDependencies, ...subDependencies];
    });

    console.log("All Dependencies including nested: " + JSON.stringify(allDependencies));

    return allDependencies;
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
      console.log(task);
      // Poziv servisa sa konvertovanim objektom
      this.taskService.checkIfUserInTask(task).subscribe(
        (response: boolean) => {
          this.isUserInTask = response;
          console.log(this.isUserInTask);
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
    console.log(user)
    if (!this.taskMembers[selectedTask.id]) {
      this.taskMembers[selectedTask.id] = [];
    }
    if (this.isUserInTask) {
      this.toastr.warning("You can't add this user");
      return;
    }
    this.taskMembers[selectedTask.id].push(user);

    this.updateTaskMember(selectedTask.id, 'add', user.id);
    this.filterUsers(selectedTask.id)
  }

  addDependencyToTask(selectedTaskId: string, dependencyId: string) {
    if (this.selectedTask == null) {
      console.error("No selected task. Cannot add dependency.");
      return;
    }

    if (!Array.isArray(this.selectedTask.dependencies)) {
      this.selectedTask.dependencies = [];
    }

    this.selectedTask.dependencies.push(dependencyId); // Safe to push now
    console.log("Updated selected task:", this.selectedTask);

    this.addDependency(selectedTaskId, dependencyId);
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


  private updateTaskMember(id: string, action: string, userId: string) {
    const url = `/api/task-server/tasks/${id}/members/${action}/${userId}`;

    this.http.post(url, {}).subscribe({
      next: () => {
        console.log(`User ${action}ed successfully`);
        if (this.projectId) {
          this.loadProjectDetails(this.projectId);
        }
      },
      error: (error) => {
        console.error('Error updating task member:', error);
      }
    });

  }

  private addDependency(id: string, dependecyId: string) {
    const url = `/api/workflow-server/workflow/${id}/add/${dependecyId}`;

    if(id == dependecyId){
      this.toastr.error("Task cannot be dependent on itself.");
      return;
    }

    console.log("task id: ", id);
    console.log("dependecy id: ", dependecyId);
    console.log("URL id: ", url);
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    this.http.post(url, {}, { headers }).subscribe({
      next: () => {
        console.log(`User added dependency successfully: ${dependecyId}`);
        if (this.projectId) {
          this.loadProjectDetails(this.projectId);
          this.toastr.success("Succesfully created connection between tasks");
        }
      },
      error: (error) => {
        console.error('Error making task dependecy:', error);
        this.toastr.error("This dependecy will cause cycles.");

      }
    });
  }


  private craeteWorkflowTask(task: Task) {
    const url = `/api/workflow-server/workflow`;

    // TODO: find out why it always returns 201 when it doesnt create dependency
    this.http.post(url, task).subscribe({
      next: () => {
        console.log(`Workflow created successfully: `);
        if (this.projectId) {
          this.loadProjectDetails(this.projectId);
        }
      },
      error: (error) => {
        console.error('Error updating task member:', error);
      }
    });

  }

  navigateToHistory(projectId: string | null ) {
    this.router.navigate(['/history/' + projectId]);
  }

  // onFileSelected1(event: Event): void {
  //   const input = event.target as HTMLInputElement;
  //
  //   if (input.files && input.files.length > 0) {
  //     const file = input.files[0];
  //     console.log('Izabran fajl:', file.name);
  //
  //   }
  // }
  // onFileSelected(event: Event, taskId: string): void {
  //   const input = event.target as HTMLInputElement;
  //
  //   if (input.files && input.files.length > 0) {
  //     const file = input.files[0];
  //
  //     this.taskService.uploadTaskDocument(taskId, file).subscribe(
  //       (response) => {
  //         console.log('Upload successful:', response);
  //       },
  //       (error) => {
  //         console.error('Error uploading file:', error);
  //       }
  //     );
  //   }
  // }

  selectedFile: File | null = null;

  onFileSelected(event: Event): void {


    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      console.log('Fajl je učitan:', this.selectedFile.name);
    }
  }

  sendFile(): void {
    if (!this.selectedFile) {
      console.error('Nije izabran fajl za slanje.');
      return;
    }
    const taskId = this.selectedTask?.id!;

    this.taskService.uploadTaskDocument(taskId, this.selectedFile).subscribe(
      (response) => {
        console.log('Fajl uspešno poslat:', response);

        this.selectedFile = null; // Resetovanje fajla nakon slanja
      },
      (error) => {
        console.error('Greška prilikom slanja fajla:', error);

        this.selectedFile = null;
      }
    );
  }

  getTaskDocumentsForTask(): void {
    if (this.selectedTask) {
      this.taskService.getAllDocumentsForThisTask(this.selectedTask.id).subscribe(
        (response: TaskDocumentDetails[]) => {
          this.taskDocumentDetails = response;
          console.log('Task documents:', this.taskDocumentDetails);
        },
        (error) => {
          console.error('Error fetching task documents:', error);
        }
      );
    } else {
      console.warn('No task ID selected for fetching documents.');
    }
  }


  downloadFile1(doc: TaskDocumentDetails): void {
    const url = ''; //`${this.config.downloadTaskDocumentUrl()}/${doc.id}`;
    this.http.get(url, { responseType: 'blob' }).subscribe((blob) => {
      const a = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      a.href = objectUrl;
      a.download = doc.fileName;
      a.click();
      URL.revokeObjectURL(objectUrl);
    });
  }

  downloadFile(doc: TaskDocumentDetails): void {
    const url = `/api/task-server/tasks/download/${doc.id}`//  `${this.config.downloadTaskDocumentUrl()}/${doc.fileName}`; // Backend endpoint URL

    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const a = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = doc.fileName; // Ime fajla koji korisnik preuzima
        a.click();
        URL.revokeObjectURL(objectUrl); // Oslobađanje memorije
      },
      error: (err) => {
        console.error('Failed to download file', err);
      },
    });
  }

  getTaskNameById(depId: string): string {
    const name = this.tasks.find(t => t.id === depId)
    if (!name) {
      return ""
    }
    return name.name;

  }

  getAllTaskDependenciesRecursive(task: TaskDetails): TaskDetails[] {
    const dependencies = this.tasks.filter(t => task.dependencies.includes(t.id));
    const allDependencies = [...dependencies];

    dependencies.forEach(dep => {
      allDependencies.push(...this.getAllTaskDependenciesRecursive(dep));
    });

    return allDependencies;
  }

  getAvailableDependencies(): TaskDetails[] {
    const allDependencies = this.getAllTaskDependenciesRecursive(this.selectedTask!);

    return this.tasks.filter(task =>
      task.id !== this.selectedTask!.id && !allDependencies.some(dep => dep.id === task.id)
    );
  }
}

