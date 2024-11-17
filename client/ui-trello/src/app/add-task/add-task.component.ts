import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {ActivatedRoute} from "@angular/router";
import {Task} from "../models/task";
import {TaskService} from "../services/task.service";
import {HttpClient} from "@angular/common/http";
import {ToastrService} from "ngx-toastr";
import {AccountService} from "../services/account.service";
import {firstValueFrom} from "rxjs";

@Component({
  selector: 'app-add-task',
  templateUrl: './add-task.component.html',
  styleUrls: ['./add-task.component.css']
})
export class AddTaskComponent implements OnInit {

  taskForm!: FormGroup;
  projectId!: string;
  tasks: Task[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private taskService: TaskService,
    private http: HttpClient,
    private toastr: ToastrService,
    private accountService: AccountService,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.projectId = params['projectId'];
    });

    this.fetchTasks(this.projectId);

    this.taskForm = this.fb.group({
      taskTitle: ['', Validators.required],
      taskDescription: ['', Validators.required]
    });
  }

  fetchTasks(projectId: string) {
    this.tasks = [];
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

  onSubmit(): void {
    if (this.taskForm.valid) {
      const taskData: Task = new Task(
        '',
        this.projectId,
        this.taskForm.value.taskTitle,
        this.taskForm.value.taskDescription,
        'Pending',
        new Date(),
        new Date(),
        [],
        [],
        false
      );

      this.taskService.addTask(taskData).subscribe({
        next: () => {
          console.log('Task created successfully');
          this.fetchTasks(this.projectId);
          this.toastr.success("Task successfully created");
        },
        error: (error) => {
          console.error('Error creating task:', error)
          this.toastr.error(error || error.err() || "Something went wrong");
        }
      });

      console.log('Task Created:', taskData);
      console.log('Project ID:', this.projectId);
    }
  }

  getTaskDependencies(task: Task): Task[] {
    return this.tasks.filter(t => task.dependencies.includes(t.id));
  }


  async changeTaskStatus(task: Task): Promise<void> {
    const dependencies = this.getTaskDependencies(task);

    const hasPendingDependencies = dependencies.some(dep => dep.status === 'Pending');

    if (hasPendingDependencies) {
      this.toastr.warning("Cannot change status: One or more dependencies are still pending.");
      return;
    }
    const isUserAssigned = await this.checkIfUserIsAssigned(task);
    if (!isUserAssigned) {
      this.toastr.warning("Cannot change status: You are not assigned to this task.");
      return;
    }

    this.taskService.updateTaskStatus(task).subscribe({
      next: () => {
        console.log('Task status updated to:', task.status);
        this.fetchTasks(this.projectId);
        this.toastr.success("Task status successfully updated");
      },
      error: (error) => {
        console.error('Error updating task status:', error);
        this.toastr.error(error || error.err() || "There has been a problem");
      }
    });
  }

  async checkIfUserIsAssigned(task: Task): Promise<boolean> {
    try {
      const value = await firstValueFrom(this.taskService.checkIfUserInTask(task));
      // DELETE THE COMMENT WHEN ASSIGNING TASKS IS DONE
      // return value;
      return true;
    } catch (error) {
      console.error('Error checking if user is assigned', error);
      return false;
    }
  }

}
