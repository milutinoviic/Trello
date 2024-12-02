export class TaskDocumentDetails {
  id: string;
  taskId: string;
  fileName: string;
  fileType: string;
  filePath: string;
  uploadedAt: Date;

  constructor(
    id: string,
    taskId: string,
    fileName: string,
    fileType: string,
    filePath: string,
    uploadedAt: Date
  ) {
    this.id = id;
    this.taskId = taskId;
    this.fileName = fileName;
    this.fileType = fileType;
    this.filePath = filePath;
    this.uploadedAt = uploadedAt;
  }
}
