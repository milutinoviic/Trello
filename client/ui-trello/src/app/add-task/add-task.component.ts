import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {ActivatedRoute} from "@angular/router";
import {Task} from "../models/task";

@Component({
  selector: 'app-add-task',
  templateUrl: './add-task.component.html',
  styleUrl: './add-task.component.css'
})
export class AddTaskComponent implements OnInit {

  taskForm!: FormGroup;
  projectId!:string;

  constructor(
              private fb: FormBuilder,
              private route: ActivatedRoute
  ) {}

  ngOnInit(): void {

    this.route.params.subscribe(params=>{
      this.projectId=params['projectId'];

    });


    this.taskForm = this.fb.group({
      taskTitle: ['', Validators.required],
      taskDescription: ['', Validators.required]
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

      // if (this.taskForm.valid) {
      //   const taskData = this.taskForm.value;
        console.log('Task Created:', taskData);
        console.log('IdProject:', this.projectId);

      // }
    }

  }}
