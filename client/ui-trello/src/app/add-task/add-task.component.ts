import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { Task } from "../models/task";
import { TaskService } from "../services/task.service";
import { HttpClient } from "@angular/common/http";
import {ToastrService} from "ngx-toastr";

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


  changeTaskStatus(task: Task): void {
    console.log(task);
    this.taskService.updateTaskStatus(task).subscribe({
      next: () => {
        console.log('Task status updated to:', task.status);
        this.fetchTasks(this.projectId);
        this.toastr.success("Task successfully updated");
      },
      error: (error) => {
        console.error('Error updating task status:', error);
        this.toastr.error(error || error.err() || "There has been a problem");
      }
    });
  }
}
