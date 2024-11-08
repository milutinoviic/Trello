export enum TaskStatus {
  Pending = 'Pending',
  InProgress = 'InProgress',
  Completed = 'Completed'
}

export class Task {
  id: string;
  project_id: string;
  name: string;
  description: string;
  status: TaskStatus;
  created_at: Date;
  updated_at: Date;
  user_ids : string[];
  dependencies: string[];
  blocked: boolean;


  constructor( id: string,
               project_id: string,
               name: string,
               description: string,
               status: TaskStatus = TaskStatus.Pending,
               created_at: Date = new Date(),
               updated_at: Date = new Date(),
               user_ids: string[] = [],
               dependencies: string[] = [],
               blocked: boolean = false) {

    this.id = id;
    this.project_id = project_id;
    this.name = name;
    this.description = description;
    this.status = status;
    this.created_at = created_at;
    this.updated_at = updated_at;
    this.user_ids = user_ids;
    this.dependencies = dependencies;
    this.blocked = blocked;
  }
}
