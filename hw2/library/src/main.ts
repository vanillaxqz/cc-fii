import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appRouterProviders } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [appRouterProviders]
})
  .catch(err => console.error(err));
