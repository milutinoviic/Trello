import { Component } from '@angular/core';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {ToastrService} from "ngx-toastr";
import {Project} from "../models/project.model";
import {ProjectServiceService} from "../services/project-service.service";
import { ReactiveFormsModule } from '@angular/forms';
import {HttpClient} from "@angular/common/http";
import {animate, state, style, transition, trigger} from "@angular/animations";
import { CommonModule } from '@angular/common';
import {Route, Router} from "@angular/router";
import {dateValidator} from "../validator/date-validator";

@Component({
  selector: 'app-add-project',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './add-project.component.html',
  styleUrl: './add-project.component.scss',
  animations: [
    trigger('flyInOut', [
      state('in', style({ opacity: 1 })),
      transition('void => *', [
        style({ opacity: 0 }),
        animate(300)
      ]),
      transition('* => void', [
        animate(300, style({ opacity: 0 }))
      ])
    ])
  ]
})
export class AddProjectComponent {

  newProjectForm!: FormGroup;
  projects: any;
  managers: any;


  constructor(
    private formBuilder: FormBuilder,
    private projectService: ProjectServiceService,
    private toaster: ToastrService,
    private http: HttpClient,
    private router: Router
  ) {
  }

  ngOnInit(): void {
    this.fetchData();
    this.fetchManagers();
    this.newProjectForm = this.formBuilder.group({
      project_name: ['', [Validators.required, Validators.minLength(3)]],
      end_date: ['', [Validators.required, dateValidator()]],
      min_members: ['', [Validators.required]],
      max_members: ['', [Validators.required]],
      manager: ['', [Validators.required]],

    });
  }


  onSubmit() {

    if (this.newProjectForm.valid) {

      const newProjectRequest: Project = {
        name: this.newProjectForm.get('project_name')?.value,
        end_date: new Date(this.newProjectForm.get('end_date')?.value),
        min_members: this.newProjectForm.get('min_members')?.value.toString(),
        max_members: this.newProjectForm.get('max_members')?.value.toString(),
        manager: this.newProjectForm.get('manager')?.value,
        user_ids: [],
      };
      console.log(newProjectRequest);
      this.projectService.addProject(newProjectRequest).subscribe({
        next: (result) => {
          this.toaster.success("Ok");
          this.newProjectForm.reset();
          this.fetchData();
          console.log(result);

        },
        error: (error) => {
          console.log(newProjectRequest)
          this.toaster.error('Adding project failed');
          console.error('Error:', error.message || error);        }
      });
    } else {
      console.log(this.newProjectForm)
      // this.toaster.error('Input field can not be empty!');
      this.newProjectForm.markAllAsTouched();
    }
  }


  fetchData() { // fetch projects to display them
    this.http.get<Project[]>('http://localhost:8080/')
      .subscribe({
        next: (response) => {
          this.projects = response.reverse();
          console.log('Data fetched successfully:', this.projects);
        },
        error: (error) => {
          console.error('Error fetching data:', error);
        }
      });
  }
  fetchManagers() { // fetch managers to display them in combobox
    this.http.get('http://localhost:8082/managers')
      .subscribe({
        next: (response) => {
          this.managers = response;
          console.log('Data fetched successfully:', this.managers);
        },
        error: (error) => {
          console.error('Error fetching data:', error);
        }
      });
  }


  manageMembersToProject(id: string) {
    this.router.navigate(['/project/manageMembers/', id]);
  }

  navigateToRegistration() {
    this.router.navigate(['/register']);
  }
}
