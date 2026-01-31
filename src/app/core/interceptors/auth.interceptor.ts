import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const authToken = authService.getToken();
  const loginUrl = `${environment.apiUrl}/users/login`;

  // No añadir el token si es la petición de login
  if (req.url === loginUrl) {
    return next(req);
  }

  if (authToken) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${authToken}`)
    });
    return next(authReq);
  }

  return next(req);
};
