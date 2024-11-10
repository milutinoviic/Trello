import { Component } from '@angular/core';
import {AccountService} from "../services/account.service";
import {ToastrService} from "ngx-toastr";
import {Router} from "@angular/router";
import {error} from "@angular/compiler-cli/src/transformers/util";

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  standalone: true,
  styleUrl: './menu.component.css'
})
export class MenuComponent {

  constructor(private accountService: AccountService, private toastrService: ToastrService, private router: Router) {

  }

  logout() {
    this.accountService.logout().subscribe({
      next: () => {
        this.toastrService.success("Logged out!");
        this.router.navigate(['/login'])
      },
      error: () => {
        this.toastrService.error('Logout failed');
    }
    })
  }

  navigateToChangePassword() {
    this.router.navigate(['/changePassword']);
  }


}
