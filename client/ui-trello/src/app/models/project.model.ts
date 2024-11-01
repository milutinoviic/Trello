export class Project {
  name: string;
  end_date: Date;
  min_members: number;
  max_members: number;


  constructor(project_name: string, endDate: Date, minMember: number, maxMember: number) {
    this.name = project_name;
    this.end_date = endDate;
    this.min_members = minMember;
    this.max_members = maxMember;
  }
}
