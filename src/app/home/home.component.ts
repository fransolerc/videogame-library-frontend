import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { GameService } from '../core/services/game.service';
import { Observable, combineLatest, BehaviorSubject, of, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap, map, finalize } from 'rxjs/operators';
import { GameSummary, GameFilterRequest } from '../shared/models/game.model';
import { PlatformService } from '../core/services/platform.service';
import { Platform } from '../shared/models/platform.model';
import { UiService } from '../core/services/ui.service';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { GameCardHorizontalComponent } from '../game-card-horizontal/game-card-horizontal.component';
import { GameCardHorizontalSkeletonComponent } from '../game-card-horizontal-skeleton/game-card-horizontal-skeleton.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AsyncPipe, GameCardHorizontalComponent, GameCardHorizontalSkeletonComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit, OnDestroy {
  latestGames: GameSummary[] = [];
  topRatedGames: GameSummary[] = [];
  searchResults: GameSummary[] = [];
  isSearching$: Observable<boolean>;
  platforms$: Observable<Platform[]>;
  isAuthenticated$: Observable<boolean>;

  isLoadingTopRated = true;
  isLoadingLatest = true;
  isLoadingSearch = false;

  private readonly searchInput = new BehaviorSubject<string>('');
  private readonly sortInput = new BehaviorSubject<string>('relevance');
  private readonly platformFilterInput = new BehaviorSubject<number | 'all'>('all');

  lastSearchTerm: string | null = null;
  hasResults: boolean = true;
  searchMessage: string | null = null;

  private readonly subscriptions = new Subscription();

  constructor(
    private readonly gameService: GameService,
    private readonly platformService: PlatformService,
    private readonly authService: AuthService,
    private readonly uiService: UiService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.platforms$ = this.platformService.getPlatforms();
    this.isAuthenticated$ = this.authService.isAuthenticated$;
    this.isSearching$ = this.searchInput.pipe(map(term => !!term.trim()));

    this.subscriptions.add(
      combineLatest([this.searchInput, this.platformFilterInput, this.platforms$, this.sortInput]).pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(([term]) => {
          const sanitizedTerm = term.trim();
          this.lastSearchTerm = sanitizedTerm;
          this.searchMessage = null;

          if (sanitizedTerm && sanitizedTerm.length < 3) {
            this.isLoadingSearch = false;
            this.searchResults = [];
            this.searchMessage = 'Escribe al menos 3 caracteres para buscar.';
            this.cdr.detectChanges();
            return;
          }

          if (sanitizedTerm) {
            this.isLoadingSearch = true;
            this.cdr.detectChanges();
          } else {
            this.isLoadingSearch = false;
            this.searchResults = [];
            this.cdr.detectChanges();
          }
        }),
        switchMap(([term, platformId, allPlatforms, sortKey]) => {
          const sanitizedTerm = term.trim().replaceAll(/\s+/g, ' ');

          if (!sanitizedTerm || sanitizedTerm.length < 3) {
            return of([]);
          }

          return this.gameService.searchGames(sanitizedTerm).pipe(
            map(games => {
              if (platformId !== 'all' && allPlatforms) {
                const selectedPlatformName = allPlatforms.find(p => p.id === platformId)?.name;
                if (selectedPlatformName) {
                  games = games.filter(game => game.platforms?.includes(selectedPlatformName));
                }
              }

              const sortedGames = [...games];
              switch (sortKey) {
                case 'name-asc': return sortedGames.sort((a, b) => a.name.localeCompare(b.name));
                case 'name-desc': return sortedGames.sort((a, b) => b.name.localeCompare(a.name));
                case 'date-desc': return sortedGames.sort((a, b) => new Date(b.releaseDate!).getTime() - new Date(a.releaseDate!).getTime());
                case 'date-asc': return sortedGames.sort((a, b) => new Date(a.releaseDate!).getTime() - new Date(b.releaseDate!).getTime());
                case 'rating-desc': return sortedGames.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                default: return games;
              }
            }),
            finalize(() => {
              this.isLoadingSearch = false;
              this.cdr.detectChanges();
            }),
            tap(games => this.hasResults = games.length > 0)
          );
        })
      ).subscribe(games => {
        this.searchResults = games;
        this.cdr.detectChanges();
      })
    );
  }

  ngOnInit(): void {
    this.loadTopRatedGames();
    this.loadLatestGames();
    this.subscriptions.add(
      this.authService.isAuthenticated$.pipe(
        tap(isAuthenticated => isAuthenticated && this.uiService.closeLoginModal())
      ).subscribe()
    );
  }

  private loadTopRatedGames(): void {
    this.isLoadingTopRated = true;
    this.cdr.detectChanges();
    this.gameService.filterGames({
      filter: 'rating > 75 & total_rating_count > 1000 & involved_companies != null',
      sort: 'rating desc',
      limit: 50
    }).subscribe({
      next: (games) => {
        this.topRatedGames = games;
        this.isLoadingTopRated = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Failed to load top rated games", err);
        this.isLoadingTopRated = false;
        this.cdr.detectChanges();
      }
    });
  }

  private loadLatestGames(): void {
    this.isLoadingLatest = true;
    this.cdr.detectChanges();
    this.subscriptions.add(
      combineLatest([this.sortInput, this.platformFilterInput]).pipe(
        switchMap(([sortKey, platformId]) => {
          const initialRequest: GameFilterRequest = {
            filter: `involved_companies != null & first_release_date <= ${Math.floor(Date.now() / 1000)}`,
            limit: 50
          };
          if (platformId !== 'all') {
            initialRequest.filter += ` & platforms.id = ${platformId}`;
          }
          switch (sortKey) {
            case 'name-asc': initialRequest.sort = 'name asc'; break;
            case 'name-desc': initialRequest.sort = 'name desc'; break;
            case 'date-desc': initialRequest.sort = 'first_release_date desc'; break;
            case 'date-asc': initialRequest.sort = 'first_release_date asc'; break;
            case 'rating-desc': initialRequest.sort = 'rating desc'; break;
            default: initialRequest.sort = 'first_release_date desc'; break;
          }
          return this.gameService.filterGames(initialRequest);
        })
      ).subscribe({
        next: (games) => {
          this.latestGames = games;
          this.isLoadingLatest = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error("Failed to load latest games", err);
          this.isLoadingLatest = false;
          this.cdr.detectChanges();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  openModal(game: GameSummary): void {
    this.uiService.openGameModal(game.id, game.platforms);
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchInput.next(input.value);
  }

  clearSearch() {
    this.searchInput.next('');
    const searchInputElement = document.querySelector('.search-input') as HTMLInputElement;
    if (searchInputElement) searchInputElement.value = '';

    this.sortInput.next('relevance');
    const sortSelectElement = document.getElementById('sort-by') as HTMLSelectElement;
    if (sortSelectElement) sortSelectElement.value = 'relevance';

    this.platformFilterInput.next('all');
    const platformSelectElement = document.getElementById('platform-filter') as HTMLSelectElement;
    if (platformSelectElement) platformSelectElement.value = 'all';

    this.searchMessage = null;
  }

  onSortChange(event: Event) {
    this.sortInput.next((event.target as HTMLSelectElement).value);
  }

  onPlatformFilterChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.platformFilterInput.next(value === 'all' ? 'all' : Number(value));
  }
}
