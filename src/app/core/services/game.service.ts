import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Game, GameFilterRequest } from '../../shared/models/game.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GameService {

  private readonly searchApiUrl = `${environment.apiUrl}/games/search`;
  private readonly filterApiUrl = `${environment.apiUrl}/games/filter`;
  private readonly gamesApiUrl = `${environment.apiUrl}/games`;

  constructor(private readonly http: HttpClient) { }

  searchGames(query: string): Observable<Game[]> {
    return this.http.get<Game[]>(`${this.searchApiUrl}?name=${query}`);
  }

  filterGames(requestBody: GameFilterRequest): Observable<any> {
    return this.http.post<any>(this.filterApiUrl, requestBody);
  }

  getGameById(id: string): Observable<Game> {
    return this.http.get<Game>(`${this.gamesApiUrl}/${id}`);
  }
}
