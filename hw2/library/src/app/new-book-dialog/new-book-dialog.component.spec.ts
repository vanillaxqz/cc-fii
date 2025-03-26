import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewBookDialogComponent } from './new-book-dialog.component';

describe('NewBookDialogComponent', () => {
  let component: NewBookDialogComponent;
  let fixture: ComponentFixture<NewBookDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewBookDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewBookDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
