export class Project {
  name: string;
  end_date: Date;
  min_members: number;
  max_members: number;
  manager: string;
  user_ids : string[];



  constructor(project_name: string, endDate: Date, minMember: number, maxMember: number, user_ids: string[] = [], manager: string) {
    this.name = project_name;
    this.end_date = endDate;
    this.min_members = minMember;
    this.max_members = maxMember;
    this.user_ids = user_ids;
    this.manager = manager;
  }
}
