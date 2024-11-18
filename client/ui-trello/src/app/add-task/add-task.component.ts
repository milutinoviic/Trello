import {Component, Input, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {ActivatedRoute} from "@angular/router";
import {Task} from "../models/task";
import {TaskService} from "../services/task.service";
import {Project} from "../models/project.model";
import {HttpClient} from "@angular/common/http";

@Component({
  selector: 'app-add-task',
  templateUrl: './add-task.component.html',
  styleUrl: './add-task.component.css'
})
export class AddTaskComponent implements OnInit {

  taskForm!: FormGroup;
  @Input() projectId!:string;
  tasks: Task[] = [];

  constructor(
              private fb: FormBuilder,
              private route: ActivatedRoute,
              private taskService:TaskService,
              private http: HttpClient,
  ) {}

  ngOnInit(): void {



    this.route.params.subscribe(params=>{
      this.projectId=params['projectId'];
    });

    this.fetchTasks(this.projectId);


    this.taskForm = this.fb.group({
      taskTitle: ['', Validators.required],
      taskDescription: ['', Validators.required]
    });
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
        next: () => { console.log(`Proslo sve kako treba`);
          this.fetchTasks(this.projectId);
        },
        error: (error) => console.error('Greška prlikom .....', error)
      });
        console.log('Task Created:', taskData);
        console.log('IdProject:', this.projectId);

    }

  }}




