import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GenrePreference, PlatformPreference, ReleaseYearPreference, UserStatistics } from '../../shared/models/statistics.model';

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {

  // Replace the backend port with the analytics port
  private readonly analyticsUrl = environment.apiUrl.replace(':8080', ':8081') + '/analytics';

  constructor(private readonly http: HttpClient) { }

  getUserStatistics(userId: string): Observable<Pick<UserStatistics, 'favoriteGenres' | 'favoritePlatforms' | 'favoriteReleaseYears'>> {
    const genres$ = this.http.get<GenrePreference[]>(`${this.analyticsUrl}/${userId}/genres`);
    const platforms$ = this.http.get<PlatformPreference[]>(`${this.analyticsUrl}/${userId}/platforms`);
    const releaseYears$ = this.http.get<ReleaseYearPreference[]>(`${this.analyticsUrl}/${userId}/release`);

    return forkJoin({
      favoriteGenres: genres$,
      favoritePlatforms: platforms$,
      favoriteReleaseYears: releaseYears$
    });
  }
}
