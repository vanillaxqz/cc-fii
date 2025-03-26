import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { BookUpdateDialogComponent, BookUpdateData } from './../book-update-dialog/book-update-dialog.component';

export interface Book {
  _id?: string;
  title: string;
  author: string;
  year_published: number;
  genre: string;
  pages: number;
  summary?: string;
  author_info?: string;
}

@Component({
  selector: 'app-book-detail',
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterModule, MatButtonModule, MatCardModule],
  templateUrl: './book-detail.component.html',
  styleUrls: ['./book-detail.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class BookDetailComponent implements OnInit {
  book!: Book;
  errorMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'No book ID provided.';
      return;
    }
    this.http.get<Book>(`http://localhost:8001/books/${id}`).subscribe({
      next: (data) => {
        if (data && (data as any).error) {
          this.errorMessage = (data as any).error;
        } else {
          this.book = data;
          this.errorMessage = '';
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error(err);
        this.errorMessage = err.error?.error || 'Failed to fetch book details. Please try again later.';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/books']);
  }

  updateBook(): void {
    if (!this.book) return;
    const dialogRef = this.dialog.open(BookUpdateDialogComponent, {
      width: '400px',
      data: {
        title: this.book.title,
        author: this.book.author,
        year_published: this.book.year_published,
        genre: this.book.genre,
        pages: this.book.pages
      }
    });
    dialogRef.afterClosed().subscribe((result: BookUpdateData | undefined) => {
      if (result && this.book._id) {
        this.http.put(`http://localhost:8001/books/${this.book._id}`, result).subscribe({
          next: () => {
            alert('Book updated successfully.');
            this.ngOnInit(); // Refresh the book details.
          },
          error: (err: HttpErrorResponse) => {
            console.error(err);
            this.errorMessage = err.error?.error || 'Failed to update book. Please try again later.';
          }
        });
      }
    });
  }

  deleteBook(): void {
    if (confirm('Are you sure you want to delete this book?')) {
      if (this.book._id) {
        this.http.delete(`http://localhost:8001/books/${this.book._id}`).subscribe({
          next: () => {
            alert('Book deleted successfully.');
            this.router.navigate(['/books']);
          },
          error: (err: HttpErrorResponse) => {
            console.error(err);
            this.errorMessage = err.error?.error || 'Failed to delete book. Please try again later.';
          }
        });
      } else {
        this.errorMessage = 'Book has no ID.';
      }
    }
  }
}
