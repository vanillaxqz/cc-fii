import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  constructor(private router: Router) { }

  logout(): void {
    localStorage.removeItem('authToken');
    this.router.navigate(['/login']);
  }
}
