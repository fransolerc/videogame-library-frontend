import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, AfterViewInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { GameService } from '../core/services/game.service';
import { Observable, combineLatest, BehaviorSubject, of, Subscription, fromEvent } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap, map } from 'rxjs/operators';
import { Game, GameFilterRequest } from '../shared/models/game.model';
import { PlatformService } from '../core/services/platform.service';
import { Platform } from '../shared/models/platform.model';
import { UiService } from '../core/services/ui.service';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { GameCardComponent } from '../game-card/game-card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AsyncPipe, GameCardComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('latestReleasesList') latestReleasesList!: ElementRef<HTMLUListElement>;
  @ViewChild('searchResultsList') searchResultsList!: ElementRef<HTMLUListElement>;

  latestGames$: Observable<Game[]>;
  searchResults$: Observable<Game[]>;
  isSearching$: Observable<boolean>;
  platforms$: Observable<Platform[]>;
  isAuthenticated$: Observable<boolean>;

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

    this.latestGames$ = combineLatest([this.sortInput, this.platformFilterInput]).pipe(
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
    );

    this.isSearching$ = this.searchInput.pipe(map(term => !!term));

    const searchResultsRaw$ = combineLatest([this.searchInput, this.platformFilterInput, this.platforms$]).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(([term]) => this.lastSearchTerm = term),
      switchMap(([term, platformId, allPlatforms]) => {
        if (!term) return of([]);
        return this.gameService.searchGames(term).pipe(
          map(games => {
            if (platformId !== 'all' && allPlatforms) {
              const selectedPlatformName = allPlatforms.find(p => p.id === platformId)?.name;
              if (selectedPlatformName) {
                return games.filter(game => game.platforms?.includes(selectedPlatformName));
              }
            }
            return games;
          })
        );
      }),
      tap(games => this.hasResults = games.length > 0)
    );

    this.searchResults$ = combineLatest([searchResultsRaw$, this.sortInput]).pipe(
      map(([games, sortKey]) => {
        if (!games || games.length === 0) return [];
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
      })
    );
  }

  ngOnInit(): void {
    const authSubscription = this.authService.isAuthenticated$.pipe(
      tap(isAuthenticated => {
        if (isAuthenticated) {
          this.uiService.closeLoginModal();
        }
      })
    ).subscribe();
    this.subscriptions.add(authSubscription);
  }

  ngAfterViewInit(): void {
    if (this.latestReleasesList) this.setupDragToScroll(this.latestReleasesList);
    if (this.searchResultsList) this.setupDragToScroll(this.searchResultsList);
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

  openModal(game: Game) {
    if (this.isDragging) {
      this.isDragging = false;
      return;
    }
    this.uiService.openGameModal(game);
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
