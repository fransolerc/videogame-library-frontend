import { HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const authToken = authService.getToken();

  if (authToken) {
    // Clonar la petición para añadir la nueva cabecera.
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${authToken}`)
    });

    // Enviar la petición clonada con la cabecera de autorización.
    return next(authReq);
  }

  // Enviar la petición original si no hay token.
  return next(req);
};
