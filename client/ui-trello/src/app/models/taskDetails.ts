import {UserDetails} from "./userDetails";

export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';

export class TaskDetails {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
  userIds: string[];
  users: UserDetails[];
  dependencies: string[];
  blocked: boolean;

  constructor(id: string, projectId: string, name: string, description: string, status: TaskStatus,
              createdAt: Date, updatedAt: Date, userIds: string[], users: UserDetails[],
              dependencies: string[], blocked: boolean) {
    this.id = id;
    this.projectId = projectId;
    this.name = name;
    this.description = description;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.userIds = userIds;
    this.users = users;
    this.dependencies = dependencies;
    this.blocked = blocked;
  }
}
