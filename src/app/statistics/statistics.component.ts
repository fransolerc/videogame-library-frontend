import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { StatisticsService } from '../core/services/statistics.service';
import { UserStatistics, GenrePreference, PlatformPreference } from '../shared/models/statistics.model';
import { AuthService } from '../core/services/auth.service';
import { LibraryService } from '../core/services/library.service';
import { GameService } from '../core/services/game.service';
import { UserGame, Game } from '../shared/models/game.model';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule, NgxChartsModule],
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.css']
})
export class StatisticsComponent implements OnInit {

  statistics: UserStatistics | null = null;
  loading = true;
  error: string | null = null;

  releaseYearData: { name: string; value: number }[] = [];

  colorScheme: Color = {
    name: 'vivid',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: [
      '#38bdf8', '#fbbf24', '#34d399', '#f87171', '#a78bfa',
    ]
  };

  constructor(
    private readonly statisticsService: StatisticsService,
    private readonly authService: AuthService,
    private readonly libraryService: LibraryService,
    private readonly gameService: GameService,
    private readonly cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const userId = this.authService.getUserId();
    if (!userId) {
      this.error = 'No se ha podido obtener el ID de usuario.';
      this.loading = false;
      return;
    }

    const analytics$ = this.statisticsService.getUserStatistics(userId);
    const libraryGames$ = this.libraryService.getLibrary(userId).pipe(
      switchMap((userGames: UserGame[]) => {
        const favoriteUserGames = userGames.filter(ug => ug.isFavorite);
        if (favoriteUserGames.length === 0) {
          return of({ games: [], userGames: [] });
        }
        const gameIds = favoriteUserGames.map(ug => ug.gameId);
        return this.gameService.getGamesByIds(gameIds).pipe(
          map(games => ({ games, userGames: favoriteUserGames }))
        );
      })
    );

    forkJoin({ analytics: analytics$, library: libraryGames$ }).subscribe({
      next: ({ analytics, library }) => {
        const historicalGenres = this.calculateGenreStats(library.games);
        const historicalPlatforms = this.calculatePlatformStats(library.games);
        const historicalYears = this.calculateYearStats(library.games);

        const combinedGenres = this.combineStats(historicalGenres, analytics.favoriteGenres, 'genre');
        const combinedPlatforms = this.combineStats(historicalPlatforms, analytics.favoritePlatforms, 'platform');
        const combinedYears = this.combineStats(historicalYears, analytics.favoriteReleaseYears.map(y => ({ year: y.releaseYear, count: y.count })), 'year');

        const totalGames = library.userGames.length;
        const ratedGames = library.games.filter(g => g.rating !== null && g.rating !== undefined);
        const totalRating = ratedGames.reduce((acc, game) => acc + (game.rating || 0), 0);
        const averageRating = ratedGames.length > 0 ? totalRating / ratedGames.length : 0;

        this.statistics = {
          favoriteGenres: combinedGenres,
          favoritePlatforms: combinedPlatforms,
          favoriteReleaseYears: combinedYears.map(y => ({ releaseYear: y.year, count: y.count })),
          totalGames,
          averageRating
        };

        if (this.statistics.favoriteReleaseYears.length > 0) {
          const yearData = this.statistics.favoriteReleaseYears;
          const minYear = Math.min(...yearData.map(y => y.releaseYear));
          const maxYear = Math.max(...yearData.map(y => y.releaseYear));

          const fullYearRange = new Map<number, number>();
          for (let year = minYear; year <= maxYear; year++) {
            fullYearRange.set(year, 0);
          }

          yearData.forEach(item => {
            fullYearRange.set(item.releaseYear, item.count);
          });

          this.releaseYearData = Array.from(fullYearRange.entries())
            .map(([year, count]) => ({ name: year.toString(), value: count }))
            .sort((a, b) => Number(a.name) - Number(b.name));
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Error al cargar las estadísticas.';
        this.loading = false;
        console.error('Error fetching combined statistics:', err);
        this.cdr.detectChanges();
      }
    });
  }

  private calculateGenreStats(games: Game[]): GenrePreference[] {
    const counts = new Map<string, number>();
    games.flatMap(g => g.genres || []).forEach(genre => {
      counts.set(genre, (counts.get(genre) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([genre, count]) => ({ genre, count }));
  }

  private calculatePlatformStats(games: Game[]): PlatformPreference[] {
    const counts = new Map<string, number>();
    games.flatMap(g => g.platforms || []).forEach(platform => {
      counts.set(platform, (counts.get(platform) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([platform, count]) => ({ platform, count }));
  }

  private calculateYearStats(games: Game[]): { year: number; count: number }[] {
    const counts = new Map<number, number>();
    games.map(g => g.releaseDate ? new Date(g.releaseDate).getFullYear() : null)
      .filter((year): year is number => year !== null)
      .forEach(year => {
        counts.set(year, (counts.get(year) || 0) + 1);
      });
    return Array.from(counts.entries()).map(([year, count]) => ({ year, count }));
  }

  private combineStats<T extends { count: number }>(historical: T[], realtime: T[], key: keyof T): T[] {
    const combined = new Map<any, number>();
    historical.forEach(item => {
      combined.set(item[key], (combined.get(item[key]) || 0) + item.count);
    });
    realtime.forEach(item => {
      combined.set(item[key], (combined.get(item[key]) || 0) + item.count);
    });
    return Array.from(combined.entries()).map(([keyValue, count]) => ({
      [key]: keyValue,
      count
    } as T)).sort((a, b) => b.count - a.count);
  }
}
