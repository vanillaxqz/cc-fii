import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

export interface BookUpdateData {
  title: string;
  author: string;
  year_published: number;
  genre: string;
  pages: number;
}

@Component({
  selector: 'app-book-update-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './book-update-dialog.component.html',
  styleUrls: ['./book-update-dialog.component.css']
})
export class BookUpdateDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<BookUpdateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BookUpdateData
  ) { }

  onDiscard(): void {
    this.dialogRef.close();
  }

  onUpdate(): void {
    this.dialogRef.close(this.data);
  }
}
