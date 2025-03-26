import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

// Define the Book interface without the id (id will be generated on the backend)
export interface Book {
  _id?: string;
  title: string;
  author: string;
  year_published: number;
  genre: string;
  pages: number;
}

@Component({
  selector: 'app-new-book-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  template: `
    <h1 mat-dialog-title>New Book</h1>
    <div mat-dialog-content>
      <form #newBookForm="ngForm">
        <mat-form-field appearance="fill">
          <mat-label>Title</mat-label>
          <input matInput [(ngModel)]="book.title" name="title" required>
        </mat-form-field>
        <mat-form-field appearance="fill">
          <mat-label>Author</mat-label>
          <input matInput [(ngModel)]="book.author" name="author" required>
        </mat-form-field>
        <mat-form-field appearance="fill">
          <mat-label>Year Published</mat-label>
          <input matInput type="number" [(ngModel)]="book.year_published" name="year_published" required>
        </mat-form-field>
        <mat-form-field appearance="fill">
          <mat-label>Genre</mat-label>
          <input matInput [(ngModel)]="book.genre" name="genre" required>
        </mat-form-field>
        <mat-form-field appearance="fill">
          <mat-label>Pages</mat-label>
          <input matInput type="number" [(ngModel)]="book.pages" name="pages" required>
        </mat-form-field>
      </form>
      <div *ngIf="errorMessage" class="error">{{ errorMessage }}</div>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="onDiscard()">Discard</button>
      <button mat-button [disabled]="!newBookForm.form.valid || submitting" (click)="onAdd()">Add</button>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      padding: 20px;
    }
    h1[mat-dialog-title] {
      text-align: center;
      font-size: 1.8rem;
      margin-bottom: 20px;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    mat-form-field {
      width: 100%;
    }
    .error {
      color: red;
      text-align: center;
      margin-top: 10px;
    }
    [mat-dialog-actions] {
      margin-top: 20px;
    }
  `]
})
export class NewBookDialogComponent {
  book: Partial<Book> = {};
  errorMessage: string = '';
  submitting: boolean = false;

  constructor(public dialogRef: MatDialogRef<NewBookDialogComponent>) { }

  onDiscard(): void {
    this.dialogRef.close(null);
  }

  onAdd(): void {
    this.submitting = true;
    if (!this.book.title || !this.book.author || !this.book.year_published || !this.book.genre || !this.book.pages) {
      this.errorMessage = 'Please fill in all fields.';
      this.submitting = false;
      return;
    }
    this.dialogRef.close(this.book);
  }
}
