export class Project {
  name: string;
  end_date: Date;
  min_members: number;
  max_members: number;
  userIDs : string[];



  constructor(project_name: string, endDate: Date, minMember: number, maxMember: number,userIDs: string[] = []) {
    this.name = project_name;
    this.end_date = endDate;
    this.min_members = minMember;
    this.max_members = maxMember;
    this.userIDs = userIDs;
  }
}
