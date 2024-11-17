import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup} from "@angular/forms";
import {ToastrService} from "ngx-toastr";
import {HttpClient} from "@angular/common/http";
import {Router} from "@angular/router";
import {AccountService} from "../services/account.service";
import {ProjectServiceService} from "../services/project-service.service";
import {Project} from "../models/project.model";

@Component({
  selector: 'app-project',
  templateUrl: './project.component.html',
  styleUrl: './project.component.css'
})
export class ProjectComponent implements OnInit {
  showAddProject: boolean = false;
  newProjectForm!: FormGroup;
  projects: any[] = [];  // Svi projekti
  manager: any;  // Menadžer koji je odgovoran za projekte

  constructor(
    private formBuilder: FormBuilder,
    private projectService: ProjectServiceService,
    private toaster: ToastrService,
    private http: HttpClient,
    private router: Router,
    private accService: AccountService
  ) { }


  ngOnInit(): void {
    this.fetchManager();
    this.fetchData();
  }




  openAddProjectModal() {
    this.showAddProject = true;
  }


  closeAddProjectModal() {
    this.showAddProject = false;
    this.router.navigateByUrl('/project');

  }


  fetchData() {
    this.http.get<Project[]>('/api/project-server/projects').subscribe({
      next: (response) => {
        this.projects = response.reverse();
        console.log('Projects fetched successfully:', this.projects);
      },
      error: (error) => {
        console.error('Error fetching data:', error);
        if (error.status === 401) {
          this.router.navigate(['login']);
        } else {
          this.projects = [];
        }
      }
    });
  }


  fetchManager() {
    this.http.get('/api/user-server/manager')
      .subscribe({
        next: (response) => {
          this.manager = response;
          console.log('Manager:', this.manager);
          this.fetchData();
        },
        error: (error) => {
          console.error('Error fetching manager data:', error);
        }
      });
  }

  manageMembersToProject(id: string) {
    this.router.navigate(['/project/manageMembers/', id]);
  }

}
