export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';

export class Task {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: TaskStatus = 'Pending';
  createdAt: Date;
  updatedAt: Date;
  user_ids: string[];
  dependencies: string[];
  blocked: boolean;

  constructor(
    id: string,
    projectId: string,
    name: string,
    description: string,
    status: TaskStatus = 'Pending',
    createdAt: Date,
    updatedAt: Date,
    user_ids: string[] = [],
    dependencies: string[] = [],
    blocked: boolean = false
  ) {
    this.id = id;
    this.projectId = projectId;
    this.name = name;
    this.description = description;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.user_ids = user_ids;
    this.dependencies = dependencies;
    this.blocked = blocked;
  }
}
