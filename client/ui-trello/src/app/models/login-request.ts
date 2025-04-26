export class LoginRequest {
  email: string;
  password: string;
  recaptchaToken: string;


  constructor(email: string, password: string, recaptchaToken: string) {
    this.email = email;
    this.password = password;
    this.recaptchaToken = recaptchaToken;
  }
}
