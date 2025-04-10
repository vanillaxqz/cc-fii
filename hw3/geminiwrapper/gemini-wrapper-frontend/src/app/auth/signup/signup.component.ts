import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule, HttpClientModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent {
  signupForm: FormGroup;
  errorMessage: string | null = null;

  private baseUrl = 'https://enhanced-cable-456111-i8.lm.r.appspot.com';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient
  ) {
    this.signupForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  signup(): void {
    if (this.signupForm.valid) {
      const { email, password } = this.signupForm.value;

      this.http.post<{ message?: string, error?: string }>(
        `${this.baseUrl}/signup`,
        { email, password },
        { observe: 'response' }
      ).subscribe({
        next: (res) => {
          if (res.status === 201 && res.body?.message === 'User created successfully') {
            this.errorMessage = null;
            this.router.navigate(['/login']);
          } else {
            this.errorMessage = res.body?.error || 'Unexpected response from server.';
          }
        },
        error: (err: HttpErrorResponse) => {
          if (err.error && err.error.error) {
            this.errorMessage = err.error.error;
          } else {
            this.errorMessage = 'An error occurred during signup. Please try again later.';
          }
          console.error('Signup error:', err);
        }
      });
    } else {
      console.error('Form is invalid');
    }
  }
}
