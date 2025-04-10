import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule, HttpClientModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string | null = null;

  private baseUrl = 'https://enhanced-cable-456111-i8.lm.r.appspot.com';

  constructor(private fb: FormBuilder, private http: HttpClient, private router: Router) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  login(): void {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;

      this.http.post<{ message?: string; token?: string; error?: string }>(
        `${this.baseUrl}/login`,
        { email, password },
        { observe: 'response' }
      ).subscribe({
        next: (res) => {
          if (res.status === 200 && res.body?.token) {
            localStorage.setItem('authToken', res.body.token);
            this.errorMessage = null;
            this.router.navigate(['/chat']);
          } else {
            this.errorMessage = res.body?.error || 'Unexpected login response.';
          }
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 401 && err.error && err.error.error) {
            this.errorMessage = err.error.error;
          } else {
            this.errorMessage = 'An error occurred during login. Please try again later.';
          }
          console.error('Login error:', err);
        }
      });
    } else {
      console.error('Form is invalid');
    }
  }
}
