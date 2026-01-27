import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AddGameToLibraryRequest, UserGame } from './library.model';

@Injectable({
  providedIn: 'root'
})
export class LibraryService {

  constructor(private readonly http: HttpClient) { }

  addGameToLibrary(userId: string, request: AddGameToLibraryRequest): Observable<UserGame> {
    const url = `${environment.apiUrl}/users/${userId}/games`;
    return this.http.post<UserGame>(url, request);
  }
}
