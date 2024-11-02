export class Project {
  name: string;
  endDate: Date;
  minMember: bigint;
  maxMember: bigint;


  constructor(name: string, endDate: Date, minMember: bigint, maxMember: bigint) {
    this.name = name;
    this.endDate = endDate;
    this.minMember = minMember;
    this.maxMember = maxMember;
  }
}
