import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { NewBookDialogComponent, Book } from './../new-book-dialog/new-book-dialog.component';
import { UpdateBooksDialogComponent } from '../update-books-dialog/update-books-dialog.component';

@Component({
  selector: 'app-main-page',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class MainPageComponent implements OnInit, OnDestroy {
  books: Book[] = [];
  errorMessage: string = '';
  private refreshIntervalId: any;

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.fetchBooks();
    this.refreshIntervalId = setInterval(() => {
      this.fetchBooks();
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
    }
  }

  fetchBooks(): void {
    this.http.get<Book[]>('http://localhost:8001/books')
      .subscribe({
        next: (data) => {
          this.books = data;
          this.errorMessage = '';
        },
        error: (err: HttpErrorResponse) => {
          console.error(err);
          if (err.status === 503) {
            this.errorMessage = err.error?.error || 'Service is temporarily unavailable. Please try again later.';
          } else {
            this.errorMessage = err.error?.error || 'Failed to fetch books. Please try again later.';
          }
        }
      });
  }

  viewBook(book: Book): void {
    if (book._id) {
      this.router.navigate(['/books', book._id]);
    } else {
      console.error('Book has no _id');
      this.errorMessage = 'Book data is incomplete.';
    }
  }

  createBook(): void {
    const dialogRef = this.dialog.open(NewBookDialogComponent, {
      width: '400px'
    });
    dialogRef.afterClosed().subscribe((result: Partial<Book> | null) => {
      if (result) {
        this.http.post<{ _id: string }>('http://localhost:8001/books', result)
          .subscribe({
            next: (response) => {
              alert('Book added with id: ' + response._id);
              this.fetchBooks();
            },
            error: (err: HttpErrorResponse) => {
              console.error(err);
              if (err.status === 503) {
                this.errorMessage = err.error?.error || 'Service is temporarily unavailable. Please try again later.';
              } else {
                this.errorMessage = err.error?.error || 'Failed to create book.';
              }
            }
          });
      }
    });
  }

  updateBook(): void {
    const dialogRef = this.dialog.open(UpdateBooksDialogComponent, {
      width: '600px'
    });
    dialogRef.afterClosed().subscribe((result: Book[] | null) => {
      if (result) {
        this.http.put('http://localhost:8001/books', result, { observe: 'response' })
          .subscribe({
            next: (response) => {
              if (response.status === 204) {
                alert('Books updated successfully.');
                this.fetchBooks();
              } else {
                alert('Unexpected response status: ' + response.status);
              }
            },
            error: (err: HttpErrorResponse) => {
              console.error(err);
              if (err.status === 503) {
                this.errorMessage = err.error?.error || 'Service is temporarily unavailable. Please try again later.';
              } else {
                this.errorMessage = err.error?.error || 'Error while updating books.';
              }
            }
          });
      }
    });
  }

  deleteBook(): void {
    if (confirm('Are you sure you want to delete all books?')) {
      this.http.delete('http://localhost:8001/books')
        .subscribe({
          next: () => {
            this.fetchBooks();
          },
          error: (err: HttpErrorResponse) => {
            console.error(err);
            if (err.status === 503) {
              this.errorMessage = err.error?.error || 'Service is temporarily unavailable. Please try again later.';
            } else {
              this.errorMessage = err.error?.error || 'Failed to delete books.';
            }
          }
        });
    }
  }
}
