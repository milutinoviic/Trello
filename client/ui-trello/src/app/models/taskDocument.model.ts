export class TaskDocument {
  taskId: string;
  document: File;

  constructor(taskId: string, document: File) {
    this.taskId = taskId;
    this.document = document;
  }
}
