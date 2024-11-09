export class Task {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: string = 'Pending';
  createdAt: Date;
  updatedAt: Date;
  userIds: string[];
  dependencies: string[];
  blocked: boolean;

  constructor(
    id: string,
    projectId: string,
    name: string,
    description: string,
    status: string = 'Pending',
    createdAt: Date,
    updatedAt: Date,
    userIds: string[] = [],
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
    this.userIds = userIds;
    this.dependencies = dependencies;
    this.blocked = blocked;
  }
}
