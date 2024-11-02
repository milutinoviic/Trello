export class AccountRequest {
  email: string;
  first_name: string;
  last_name: string;

  constructor(email: string, first_name: string, last_name: string) {
    this.email = email;
    this.first_name = first_name;
    this.last_name = last_name;
  }
}
