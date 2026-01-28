import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AddGameToLibraryRequest, UserGame } from './library.model';

@Injectable({
  providedIn: 'root'
})
export class LibraryService {

  constructor(private readonly http: HttpClient) { }

  addOrUpdateGameInLibrary(userId: string, request: AddGameToLibraryRequest): Observable<UserGame> {
    const url = `${environment.apiUrl}/users/${userId}/games/${request.gameId}`;
    return this.http.put<UserGame>(url, { status: request.status });
  }

  getGameFromLibrary(userId: string, gameId: string): Observable<UserGame | null> {
    const url = `${environment.apiUrl}/users/${userId}/games/${gameId}`;
    return this.http.get<UserGame>(url).pipe(
      catchError(error => {
        if (error.status === 404) {
          // Si el juego no está en la biblioteca, devuelve null
          return of(null);
        }
        // Para otros errores, relanza el error
        throw error;
      })
    );
  }

  removeGameFromLibrary(userId: string, gameId: string): Observable<void> {
    const url = `${environment.apiUrl}/users/${userId}/games/${gameId}`;
    return this.http.delete<void>(url);
  }
}
