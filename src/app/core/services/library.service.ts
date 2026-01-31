import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AddGameToLibraryRequest, UserGame } from '../../shared/models/library.model';

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
          return of(null);
        }
        throw error;
      })
    );
  }

  removeGameFromLibrary(userId: string, gameId: string): Observable<void> {
    const url = `${environment.apiUrl}/users/${userId}/games/${gameId}`;
    return this.http.delete<void>(url);
  }

  getLibrary(userId: string): Observable<UserGame[]> {
    const url = `${environment.apiUrl}/users/${userId}/games`;
    return this.http.get<any>(url).pipe(
      map(response => Array.isArray(response) ? response : (response.content || []))
    );
  }

  getFavorites(userId: string): Observable<UserGame[]> {
    const url = `${environment.apiUrl}/users/${userId}/favorites`;
    return this.http.get<any>(url).pipe(
      map(response => response.content || [])
    );
  }

  addFavorite(userId: string, gameId: string): Observable<void> {
    const url = `${environment.apiUrl}/users/${userId}/games/${gameId}/favorite`;
    return this.http.post<void>(url, {});
  }

  removeFavorite(userId: string, gameId: string): Observable<void> {
    const url = `${environment.apiUrl}/users/${userId}/games/${gameId}/favorite`;
    return this.http.delete<void>(url);
  }
}
