import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookUpdateDialogComponent } from './book-update-dialog.component';

describe('BookUpdateDialogComponent', () => {
  let component: BookUpdateDialogComponent;
  let fixture: ComponentFixture<BookUpdateDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookUpdateDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookUpdateDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
