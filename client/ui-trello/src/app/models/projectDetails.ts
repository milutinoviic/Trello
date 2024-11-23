import {UserDetails} from "./userDetails";
import {TaskDetails} from "./taskDetails";

export class ProjectDetails {
  id: string;
  name: string;
  endDate: string;
  minMembers: string;
  maxMembers: string;
  userIds: string[];
  users: UserDetails[];
  manager: string;
  tasks: TaskDetails[];

  constructor(id: string, name: string, endDate: string, minMembers: string, maxMembers: string,
              userIds: string[], users: UserDetails[], manager: string, tasks: TaskDetails[]) {
    this.id = id;
    this.name = name;
    this.endDate = endDate;
    this.minMembers = minMembers;
    this.maxMembers = maxMembers;
    this.userIds = userIds;
    this.users = users;
    this.manager = manager;
    this.tasks = tasks;
  }
}
