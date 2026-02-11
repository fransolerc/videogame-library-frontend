import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Game, GameFilterRequest, GameSummary } from '../../shared/models/game.model';
import { PaginatedResponse } from '../../shared/models/pagination.model';
import { environment } from '../../../environments/environment';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class GameService {

  private readonly apiUrl = environment.apiUrl + '/games';

  constructor(private readonly http: HttpClient) { }

  getGameById(id: number): Observable<Game> {
    return this.http.get<Game>(`${this.apiUrl}/${id}`);
  }

  getGamesByIds(ids: number[]): Observable<Game[]> {
    return this.http.post<Game[]>(`${this.apiUrl}/batch`, ids);
  }

  searchGames(name: string): Observable<GameSummary[]> {
    return this.http.get<GameSummary[]>(`${this.apiUrl}/search?name=${name}`);
  }

  filterGames(request: GameFilterRequest): Observable<GameSummary[]> {
    return this.http.post<any>(`${this.apiUrl}/filter`, request).pipe(
      map(response => response?.content ? response.content : response)
    );
  }

  filterGamesPaginated(request: GameFilterRequest): Observable<PaginatedResponse<GameSummary>> {
    return this.http.post<PaginatedResponse<GameSummary>>(`${this.apiUrl}/filter`, request);
  }
}
