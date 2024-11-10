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
import {AppModule} from "../app.module";
import {MenuComponent} from "../menu/menu.component";
import {AccountService} from "../services/account.service";


@Component({
  selector: 'app-add-project',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, MenuComponent],
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
  manager: any;
  managerId: string = "";



  constructor(
    private formBuilder: FormBuilder,
    private projectService: ProjectServiceService,
    private toaster: ToastrService,
    private http: HttpClient,
    private router: Router,
    private accService: AccountService
  ) {
  }

  ngOnInit(): void {
    this.fetchData();
    this.managerId = this.accService.idOfUser;
    this.fetchManager(this.managerId);

    this.newProjectForm = this.formBuilder.group({
      project_name: ['', [Validators.required, Validators.minLength(3)]],
      end_date: ['', [Validators.required, dateValidator()]],
      min_members: ['', [Validators.required]],
      max_members: ['', [Validators.required]],
    });
  }


  onSubmit() {

    if (this.newProjectForm.valid) {

      const newProjectRequest: Project = {
        name: this.newProjectForm.get('project_name')?.value,
        end_date: new Date(this.newProjectForm.get('end_date')?.value),
        min_members: this.newProjectForm.get('min_members')?.value.toString(),
        max_members: this.newProjectForm.get('max_members')?.value.toString(),
        manager: this.manager.email,
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
    this.http.get<Project[]>('/api/project-server/') // added /project-servise/ to test apigateway
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
  fetchManager(userId: string) { // fetch managers to display them in combobox
    this.http.get(`/api/user-server/manager/${userId}`) //before /api/user-server/  will be added "https://api_gateway:443" defined in proxy.conf.json file
      .subscribe({                   // when api-gateway recieves this path it will redirect to user-server
        next: (response) => {
          this.manager = response;
          console.log('Manager:', this.manager);
          console.log('ROle:', this.manager.role);
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
