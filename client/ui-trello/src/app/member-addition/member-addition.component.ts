import { Component, OnInit } from '@angular/core';
import {ProjectServiceService} from "../services/project-service.service";

interface User {
  id: string;
  fullName: string;
}

@Component({
  selector: 'app-member-addition',
  templateUrl: './member-addition.component.html',
  styleUrls: ['./member-addition.component.css']
})
export class MemberAdditionComponent implements OnInit {
  allUsers: User[] = [];
  projectMembers: User[] = [];
  searchTerm: string = '';
  maxMembers: number = 5;
  filteredUsers: User[] = [];
  projectId : number = 12345;

  private dummyUsers: User[] = [
    { id: '1', fullName: 'Alice Smith' },
    { id: '2', fullName: 'Bob Johnson' },
    { id: '3', fullName: 'Charlie Brown' },
    { id: '4', fullName: 'Diana Prince' },
    { id: '5', fullName: 'Ethan Hunt' },
    { id: '6', fullName: 'Fiona Gallagher' },
    { id: '7', fullName: 'George Washington' },
    { id: '8', fullName: 'Hannah Montana' }
  ];

  constructor(private projectService:ProjectServiceService) {}

  ngOnInit() {
    this.allUsers = this.dummyUsers;
    this.filteredUsers = this.allUsers;
  }

  filterUsers() {
    this.filteredUsers = this.allUsers
      .filter(user => user.fullName.toLowerCase().includes(this.searchTerm.toLowerCase()))
      .filter(user => !this.projectMembers.some(member => member.id === user.id));
  }

  addMember(user: User) {
    if (!this.isFull() && !this.projectMembers.some(member => member.id === user.id)) {
      this.projectMembers.push(user);
      this.filterUsers();
    }
  }

  removeMember(userId: string) {
    console.log("---------------------------------------------")
    console.log(`Obrisan je user id-- ${userId}`);
    console.log("---------------------------------------------")
    this.projectMembers = this.projectMembers.filter(member => member.id !== userId);
    this.filterUsers();

    this.projectService.deleteMemberFromProject(this.projectId, +userId).subscribe({
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
}

