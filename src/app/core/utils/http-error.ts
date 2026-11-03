import { HttpErrorResponse } from '@angular/common/http';

export function extractErrorMessage(err: HttpErrorResponse, fallback: string): string {
  if (err.status === 0) return 'No se pudo conectar con el servidor.';
  const fieldErrors = err.error?.errors;
  if (fieldErrors && typeof fieldErrors === 'object') {
    return Object.values(fieldErrors).join(' ');
  }
  return err.error?.message ?? fallback;
}
