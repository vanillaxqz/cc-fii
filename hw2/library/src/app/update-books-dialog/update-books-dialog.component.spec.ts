import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateBooksDialogComponent } from './update-books-dialog.component';

describe('UpdateBooksDialogComponent', () => {
  let component: UpdateBooksDialogComponent;
  let fixture: ComponentFixture<UpdateBooksDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateBooksDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateBooksDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
