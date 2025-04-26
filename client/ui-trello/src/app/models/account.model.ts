export class Account {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: string;

  constructor(
    id: string | undefined,
    email: string,
    firstName: string,
    lastName: string,
    password: string,
    role: string,
  ) {
    this.id = id;
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.password = password;
    this.role = role;
  }
}
