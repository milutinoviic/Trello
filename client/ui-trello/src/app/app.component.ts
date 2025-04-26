import {Component, OnDestroy} from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnDestroy{
  title = 'ui-trello';

  ngOnDestroy(): void {
    if (localStorage.getItem("role")) {
      localStorage.removeItem("role");
    }

  }
}
