export class UserDetails {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;

  constructor(id: string, email: string, first_name: string, last_name: string, role: string) {
    this.id = id;
    this.email = email;
    this.first_name = first_name;
    this.last_name = last_name;
    this.role = role;
  }
}
