import {ApplicationConfig, provideZonelessChangeDetection} from '@angular/core';
import {provideRouter, withComponentInputBinding, withViewTransitions} from '@angular/router';
import {provideHttpClient, withInterceptors, withXhr} from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withViewTransitions(), withComponentInputBinding()),
    provideHttpClient(withXhr(),
      withInterceptors([authInterceptor])
    ),
    provideZonelessChangeDetection(),
  ]
};
