import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface Book {
  _id: string;
  title: string;
  author: string;
  year_published: number;
  genre: string;
  pages: number;
  collapsed?: boolean;
}

@Component({
  selector: 'app-update-books-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <h1 mat-dialog-title>Update Books</h1>
    <div mat-dialog-content class="dialog-content">
      <div *ngFor="let book of books; let i = index" class="book-form">
        <div class="book-header" (click)="toggleCollapse(i)">
          <span>Book {{ i + 1 }}</span>
          <button mat-icon-button color="primary" (click)="toggleCollapse(i); $event.stopPropagation()">
            <mat-icon>{{ book.collapsed ? 'expand_more' : 'expand_less' }}</mat-icon>
          </button>
        </div>
        <div class="book-details" [class.collapsed]="book.collapsed">
          <div *ngIf="!book.collapsed">
            <mat-form-field appearance="fill" style="width: 100%;">
              <mat-label>ID</mat-label>
              <input matInput [(ngModel)]="book._id" name="id{{i}}" required>
            </mat-form-field>
            <mat-form-field appearance="fill" style="width: 100%;">
              <mat-label>Title</mat-label>
              <input matInput [(ngModel)]="book.title" name="title{{i}}" required>
            </mat-form-field>
            <mat-form-field appearance="fill" style="width: 100%;">
              <mat-label>Author</mat-label>
              <input matInput [(ngModel)]="book.author" name="author{{i}}" required>
            </mat-form-field>
            <mat-form-field appearance="fill" style="width: 100%;">
              <mat-label>Year Published</mat-label>
              <input matInput type="number" [(ngModel)]="book.year_published" name="year{{i}}" required>
            </mat-form-field>
            <mat-form-field appearance="fill" style="width: 100%;">
              <mat-label>Genre</mat-label>
              <input matInput [(ngModel)]="book.genre" name="genre{{i}}" required>
            </mat-form-field>
            <mat-form-field appearance="fill" style="width: 100%;">
              <mat-label>Pages</mat-label>
              <input matInput type="number" [(ngModel)]="book.pages" name="pages{{i}}" required>
            </mat-form-field>
            <button mat-icon-button color="warn" (click)="removeBook(i)" aria-label="Remove Book">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
          <div *ngIf="book.collapsed" class="collapsed-summary">
            <p><strong>{{ book.title || 'Untitled Book' }}</strong> by {{ book.author || 'Unknown' }}</p>
          </div>
        </div>
        <hr>
      </div>
      <div class="add-more">
        <button mat-button color="primary" (click)="addBook()">Add More</button>
      </div>
      <div *ngIf="errorMessage" class="error">{{ errorMessage }}</div>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="onDiscard()">Discard</button>
      <button mat-button [disabled]="!isValid()" (click)="onUpdate()">Update List</button>
    </div>
  `,
  styles: [`
    /* Scrollable dialog content */
    .dialog-content {
      max-height: 400px;
      overflow-y: auto;
      padding-right: 10px;
    }
    .book-form {
      margin-bottom: 10px;
    }
    .book-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: #f0f0f0;
      padding: 8px;
      cursor: pointer;
      border-radius: 4px;
    }
    .book-header span {
      font-weight: bold;
    }
    .book-details {
      padding: 8px;
      transition: max-height 0.3s ease;
    }
    .book-details.collapsed {
      display: none;
    }
    .collapsed-summary {
      padding: 8px;
      background-color: #e0e0e0;
      border-radius: 4px;
      font-size: 0.9rem;
    }
    h1[mat-dialog-title] {
      text-align: center;
      font-size: 1.8rem;
      margin-bottom: 20px;
    }
    hr {
      border: none;
      border-top: 1px solid #ccc;
      margin: 10px 0;
    }
    .add-more {
      text-align: center;
      margin-bottom: 10px;
    }
    .error {
      color: red;
      text-align: center;
      margin-top: 10px;
    }
  `]
})
export class UpdateBooksDialogComponent {
  books: Book[] = [
    { _id: '', title: '', author: '', year_published: 0, genre: '', pages: 0, collapsed: false }
  ];
  errorMessage: string = '';

  constructor(public dialogRef: MatDialogRef<UpdateBooksDialogComponent>) { }

  addBook(): void {
    this.books.forEach(book => book.collapsed = true);
    this.books.push({ _id: '', title: '', author: '', year_published: 0, genre: '', pages: 0, collapsed: false });
  }

  removeBook(index: number): void {
    if (this.books.length > 1) {
      this.books.splice(index, 1);
    }
  }

  toggleCollapse(index: number): void {
    this.books[index].collapsed = !this.books[index].collapsed;
  }

  isValid(): boolean {
    return this.books.every(book =>
      book._id && book.title && book.author &&
      book.year_published != null && book.genre && book.pages != null
    );
  }

  onDiscard(): void {
    this.dialogRef.close(null);
  }

  onUpdate(): void {
    if (!this.isValid()) {
      this.errorMessage = 'Please fill in all fields for each book.';
      return;
    }
    const outputBooks = this.books.map(({ collapsed, ...bookData }) => bookData);
    this.dialogRef.close(outputBooks);
  }
}
