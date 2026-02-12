import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../core/services/game.service';
import { LibraryService } from '../core/services/library.service';
import { AuthService } from '../core/services/auth.service';
import { Game, GameStatus, UserGame } from '../shared/models/game.model';
import { of, Subject, BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { switchMap, map, takeUntil, catchError } from 'rxjs/operators';
import { GameCardComponent } from '../game-card/game-card.component';
import { UiService } from '../core/services/ui.service';
import { PlatformService } from '../core/services/platform.service';
import { Platform } from '../shared/models/platform.model';
import { GameCardSkeletonComponent } from '../game-card-skeleton/game-card-skeleton.component';
import { StatisticsComponent } from '../statistics/statistics.component';

type LibraryDisplayGame = Game & { status: GameStatus; isFavorite: boolean | undefined; };

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, GameCardComponent, GameCardSkeletonComponent, StatisticsComponent],
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.css']
})
export class LibraryComponent implements OnInit, OnDestroy {
  platforms$: Observable<Platform[]>;

  favorites: LibraryDisplayGame[] = [];
  wantToPlay: LibraryDisplayGame[] = [];
  playing: LibraryDisplayGame[] = [];
  completed: LibraryDisplayGame[] = [];

  paginatedFavorites: LibraryDisplayGame[] = [];
  paginatedWantToPlay: LibraryDisplayGame[] = [];
  paginatedPlaying: LibraryDisplayGame[] = [];
  paginatedCompleted: LibraryDisplayGame[] = [];

  isLoading = true;

  // Pagination properties
  pageSize = 16;
  pagination = {
    favorites: { currentPage: 1, totalPages: 1 },
    wantToPlay: { currentPage: 1, totalPages: 1 },
    playing: { currentPage: 1, totalPages: 1 },
    completed: { currentPage: 1, totalPages: 1 }
  };

  private readonly sortInput = new BehaviorSubject<string>('relevance');
  private readonly platformFilterInput = new BehaviorSubject<number | 'all'>('all');
  private allGames: LibraryDisplayGame[] = [];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly libraryService: LibraryService,
    private readonly gameService: GameService,
    private readonly authService: AuthService,
    private readonly uiService: UiService,
    private readonly cdr: ChangeDetectorRef,
    private readonly platformService: PlatformService
  ) {
    this.platforms$ = this.platformService.getPlatforms();
  }

  ngOnInit(): void {
    const userId = this.authService.getUserId();
    if (userId) {
      this.loadLibrary(userId);
    } else {
      this.isLoading = false;
    }

    this.uiService.libraryChanged$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (userId) {
        this.loadLibrary(userId);
      }
    });

    combineLatest({
      sortKey: this.sortInput,
      platformId: this.platformFilterInput,
      allPlatforms: this.platforms$
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe(({ sortKey, platformId, allPlatforms }) => {
      this.applyFilters(sortKey, platformId, allPlatforms);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadLibrary(userId: string): void {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.libraryService.getLibrary(userId).pipe(
      switchMap((userGames: UserGame[]) => {
        if (!userGames || userGames.length === 0) {
          return of([]);
        }

        const gameIds = userGames.map(ug => ug.gameId);
        return this.gameService.getGamesByIds(gameIds).pipe(
          map((games: Game[]) => {
            const gamesMap = new Map(games.map(g => [g.id, g]));
            return userGames.map(userGame => {
              const gameDetails = gamesMap.get(userGame.gameId);
              return gameDetails ? {
                ...gameDetails,
                status: userGame.status,
                isFavorite: userGame.isFavorite
              } : null;
            }).filter((g): g is LibraryDisplayGame => g !== null);
          }),
          catchError(error => {
            console.error(`Failed to load batch game data:`, error);
            return of([]);
          })
        );
      })
    ).subscribe({
      next: (games) => {
        this.allGames = games;
        this.applyFilters(this.sortInput.value, this.platformFilterInput.value, []);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Failed to load library", err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private applyFilters(sortKey: string, platformId: number | 'all', allPlatforms: Platform[]): void {
    let filteredGames = [...this.allGames];

    if (platformId !== 'all' && allPlatforms.length > 0) {
      const selectedPlatform = allPlatforms.find(p => p.id === platformId);
      if (selectedPlatform) {
        filteredGames = filteredGames.filter(game =>
          game.platforms?.includes(selectedPlatform.name)
        );
      }
    }

    const sortedGames = this.sortGames(filteredGames, sortKey);

    this.favorites = sortedGames.filter(game => game.isFavorite);
    this.wantToPlay = sortedGames.filter(game => game.status === GameStatus.WANT_TO_PLAY);
    this.playing = sortedGames.filter(game => game.status === GameStatus.PLAYING);
    this.completed = sortedGames.filter(game => game.status === GameStatus.COMPLETED);

    this.updateAllPaginatedLists();
    this.cdr.detectChanges();
  }

  private updateAllPaginatedLists(): void {
    this.paginatedFavorites = this.updatePaginatedList('favorites', this.favorites);
    this.paginatedWantToPlay = this.updatePaginatedList('wantToPlay', this.wantToPlay);
    this.paginatedPlaying = this.updatePaginatedList('playing', this.playing);
    this.paginatedCompleted = this.updatePaginatedList('completed', this.completed);
  }

  private updatePaginatedList(
    category: keyof typeof this.pagination,
    sourceList: LibraryDisplayGame[]
  ): LibraryDisplayGame[] {
    const paginator = this.pagination[category];
    paginator.totalPages = Math.ceil(sourceList.length / this.pageSize);
    if (paginator.currentPage > paginator.totalPages) {
      paginator.currentPage = Math.max(1, paginator.totalPages);
    }

    const startIndex = (paginator.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return sourceList.slice(startIndex, endIndex);
  }

  changePage(category: keyof typeof this.pagination, direction: 'next' | 'prev'): void {
    const paginator = this.pagination[category];
    if (direction === 'next' && paginator.currentPage < paginator.totalPages) {
      paginator.currentPage++;
    } else if (direction === 'prev' && paginator.currentPage > 1) {
      paginator.currentPage--;
    }
    this.updateAllPaginatedLists();
  }

  private sortGames(games: LibraryDisplayGame[], sortKey: string): LibraryDisplayGame[] {
    const sorted = [...games];
    switch (sortKey) {
      case 'name-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'date-desc':
        return sorted.sort((a, b) => new Date(b.releaseDate!).getTime() - new Date(a.releaseDate!).getTime());
      case 'date-asc':
        return sorted.sort((a, b) => new Date(a.releaseDate!).getTime() - new Date(b.releaseDate!).getTime());
      case 'rating-desc':
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      default:
        return games;
    }
  }

  onSortChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.sortInput.next(select.value);
  }

  onPlatformFilterChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    this.platformFilterInput.next(value === 'all' ? 'all' : Number(value));
  }

  openGameModal(game: Game): void {
    this.uiService.openGameModal(game.id, game.platforms);
  }
}
