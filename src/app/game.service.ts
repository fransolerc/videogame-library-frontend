import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Game, GameFilterRequest } from './game.model';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GameService {

  private searchApiUrl = `${environment.apiUrl}/games/search`;
  private filterApiUrl = `${environment.apiUrl}/games/filter`;

  constructor(private http: HttpClient) { }

  /**
   * Realiza una búsqueda simple por nombre.
   * @param query El término de búsqueda.
   */
  searchGames(query: string): Observable<Game[]> {
    return this.http.get<Game[]>(`${this.searchApiUrl}?name=${query}`);
  }

  /**
   * Realiza una búsqueda avanzada de videojuegos.
   * @param requestBody El cuerpo de la petición con los filtros.
   */
  filterGames(requestBody: GameFilterRequest): Observable<Game[]> {
    return this.http.post<Game[]>(this.filterApiUrl, requestBody);
  }
}
