import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, AfterViewInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { GameService } from '../core/services/game.service';
import { Observable, combineLatest, BehaviorSubject, of, Subscription, fromEvent } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap, map, finalize } from 'rxjs/operators';
import { GameSummary, GameFilterRequest } from '../shared/models/game.model';
import { PlatformService } from '../core/services/platform.service';
import { Platform } from '../shared/models/platform.model';
import { UiService } from '../core/services/ui.service';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { GameCardComponent } from '../game-card/game-card.component';
import { GameCardSkeletonComponent } from '../game-card-skeleton/game-card-skeleton.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AsyncPipe, GameCardComponent, GameCardSkeletonComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('latestReleasesList') latestReleasesList!: ElementRef<HTMLUListElement>;
  @ViewChild('searchResultsList') searchResultsList!: ElementRef<HTMLUListElement>;
  @ViewChild('topRatedList') topRatedList!: ElementRef<HTMLUListElement>;

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

  isDown = false;
  startX = 0;
  scrollLeft = 0;
  isDragging = false;
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

    this.isSearching$ = this.searchInput.pipe(map(term => !!term));


    this.subscriptions.add(
      combineLatest([this.searchInput, this.platformFilterInput, this.platforms$, this.sortInput]).pipe(
        debounceTime(300),
        distinctUntilChanged((
          [prevTerm, prevPlatform, prevPlatforms, prevSort],
          [currTerm, currPlatform, currPlatforms, currSort]
        ) => prevTerm === currTerm && prevPlatform === currPlatform && prevSort === currSort),
        tap(([term]) => {
          this.lastSearchTerm = term;
          if (term) {
            this.isLoadingSearch = true;
            this.cdr.detectChanges();
          } else {
            this.isLoadingSearch = false;
            this.searchResults = [];
            this.cdr.detectChanges();
          }
        }),
        switchMap(([term, platformId, allPlatforms, sortKey]) => {
          if (!term) return of([]);

          return this.gameService.searchGames(term).pipe(
            map(games => {
              if (platformId !== 'all' && allPlatforms) {
                const selectedPlatformName = allPlatforms.find(p => p.id === platformId)?.name;
                if (selectedPlatformName) {
                  games = games.filter(game => game.platforms?.includes(selectedPlatformName));
                }
              }

              const sortedGames = [...games];
              switch (sortKey) {
                case 'name-asc':
                  return sortedGames.sort((a, b) => a.name.localeCompare(b.name));
                case 'name-desc':
                  return sortedGames.sort((a, b) => b.name.localeCompare(a.name));
                case 'date-desc':
                  return sortedGames.sort((a, b) => new Date(b.releaseDate!).getTime() - new Date(a.releaseDate!).getTime());
                case 'date-asc':
                  return sortedGames.sort((a, b) => new Date(a.releaseDate!).getTime() - new Date(b.releaseDate!).getTime());
                case 'rating-desc':
                  return sortedGames.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                default:
                  return games;
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

    const authSubscription = this.authService.isAuthenticated$.pipe(
      tap(isAuthenticated => {
        if (isAuthenticated) {
          this.uiService.closeLoginModal();
        }
      })
    ).subscribe();
    this.subscriptions.add(authSubscription);
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

  ngAfterViewInit(): void {
    if (this.latestReleasesList) this.setupDragToScroll(this.latestReleasesList);
    if (this.searchResultsList) this.setupDragToScroll(this.searchResultsList);
    if (this.topRatedList) this.setupDragToScroll(this.topRatedList);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private setupDragToScroll(elementRef: ElementRef<HTMLUListElement>): void {
    if (!elementRef) return;
    const slider = elementRef.nativeElement;
    this.subscriptions.add(fromEvent<MouseEvent>(slider, 'mousedown').subscribe((e: MouseEvent) => {
      this.isDown = true;
      this.isDragging = false;
      slider.classList.add('active');
      this.startX = e.pageX - slider.offsetLeft;
      this.scrollLeft = slider.scrollLeft;
    }));
    this.subscriptions.add(fromEvent<MouseEvent>(document, 'mouseup').subscribe(() => {
      this.isDown = false;
      slider.classList.remove('active');
    }));
    this.subscriptions.add(fromEvent<MouseEvent>(document, 'mousemove').subscribe((e: MouseEvent) => {
      if (!this.isDown) return;
      e.preventDefault();
      this.isDragging = true;
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - this.startX) * 2;
      slider.scrollLeft = this.scrollLeft - walk;
    }));
  }

  openModal(game: GameSummary): void {
    if (this.isDragging) {
      this.isDragging = false;
      return;
    }
    this.uiService.openGameModal(game.id, game.platforms);
  }

  navigateToPlatformPage(platformName: string): void {
    this.platforms$.pipe(
      map(platforms => platforms.find(p => p.name === platformName)),
      tap(platform => {
        if (platform) {
          this.router.navigate(['/platforms', platform.id]);
        }
      })
    ).subscribe();
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchInput.next(input.value);
  }

  clearSearch() {
    this.searchInput.next('');
    const inputElement = document.querySelector('.search-input') as HTMLInputElement;
    if (inputElement) {
      inputElement.value = '';
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
}
