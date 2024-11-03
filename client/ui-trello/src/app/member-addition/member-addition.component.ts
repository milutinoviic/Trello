import { Component, OnInit } from '@angular/core';

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

  constructor() {}

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
  }


  isUserAssigned(user: User): boolean {
    return this.projectMembers.some(member => member.id === user.id);
  }

  isFull(): boolean {
    return this.projectMembers.length >= this.maxMembers;
  }
}

