import { Routes } from '@angular/router';
import { provideRouter } from '@angular/router';
import { MainPageComponent } from './main-page/main-page.component';
import { BookDetailComponent } from './book-detail/book-detail.component';

export const routes: Routes = [
    { path: '', redirectTo: '/books', pathMatch: 'full' },
    { path: 'books', component: MainPageComponent },
    { path: 'books/:id', component: BookDetailComponent },
    // Other routes...
];

export const appRouterProviders = [
    provideRouter(routes)
];
