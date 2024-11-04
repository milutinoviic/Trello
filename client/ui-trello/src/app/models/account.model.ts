export class Account {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;

  constructor(
    id: string | undefined,
    email: string,
    firstName: string,
    lastName: string,
    password: string
  ) {
    this.id = id;
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.password = password;
  }
}
