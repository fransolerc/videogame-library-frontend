import { Component, OnInit } from '@angular/core';
import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import { GameService } from './game.service';
import { Observable, combineLatest, BehaviorSubject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap, map } from 'rxjs/operators';
import { Game, GameFilterRequest } from './game.model';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from './auth/auth.service';
import { LoginComponent } from './auth/login/login.component';
import { PlatformService } from './platform.service';
import { Platform } from './platform.model';

@Component({
  selector: 'app-root',
  imports: [AsyncPipe, DatePipe, DecimalPipe, LoginComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  latestGames$: Observable<Game[]> | undefined;
  searchResults$: Observable<Game[]> | undefined;
  isSearching$: Observable<boolean> | undefined;
  isAuthenticated$: Observable<boolean>;
  platforms$: Observable<Platform[]> | undefined;

  private readonly searchInput = new BehaviorSubject<string>('');
  private readonly sortInput = new BehaviorSubject<string>('relevance');
  private readonly platformFilterInput = new BehaviorSubject<number | 'all'>('all');

  lastSearchTerm: string | null = null;
  hasResults: boolean = true;

  selectedGame: Game | null = null;
  showLoginModal = false;

  enlargedScreenshot: string | null = null;
  areVideosPaused = false;

  constructor(
    private readonly gameService: GameService,
    private readonly sanitizer: DomSanitizer,
    private readonly authService: AuthService,
    private readonly platformService: PlatformService
  ) {
    this.isAuthenticated$ = this.authService.isAuthenticated$;
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
    this.platformFilterInput.next(value === 'all' ? 'all' : Number.parseInt(value, 10));
  }

  openModal(game: Game) {
    this.selectedGame = game;
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    this.selectedGame = null;
    document.body.style.overflow = 'auto';
  }

  openLightbox(screenshotUrl: string) {
    this.enlargedScreenshot = screenshotUrl;
    this.areVideosPaused = true;
  }

  closeLightbox() {
    this.enlargedScreenshot = null;
    this.areVideosPaused = false;
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }

  openLoginModal() {
    this.showLoginModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeLoginModal() {
    this.showLoginModal = false;
    document.body.style.overflow = 'auto';
  }

  logout() {
    this.authService.logout();
  }

  getSafeVideoUrl(url: string): SafeResourceUrl {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    let embedUrl = url;
    if (match && match[2] && match[2].length === 11) {
      const videoId = match[2];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  getVideoThumbnail(url: string): string {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2] && match[2].length === 11) {
      const videoId = match[2];
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
    return '';
  }

  ngOnInit(): void {
    this.authService.isAuthenticated$.subscribe(isAuthenticated => {
      if (isAuthenticated) {
        this.closeLoginModal();
      }
    });

    this.platforms$ = this.platformService.getPlatforms();

    this.latestGames$ = combineLatest([this.sortInput, this.platformFilterInput, this.platforms$]).pipe(
      switchMap(([sortKey, platformId, allPlatforms]) => {
        const initialRequest: GameFilterRequest = {
          filter: `first_release_date <= ${Math.floor(Date.now() / 1000)}`,
          limit: 20
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

    this.isSearching$ = this.searchInput.pipe(
      map(term => !!term)
    );

    const searchResultsRaw$ = combineLatest([this.searchInput, this.platformFilterInput, this.platforms$]).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(([term]) => this.lastSearchTerm = term),
      switchMap(([term, platformId, allPlatforms]) => {
        if (!term) {
          return of([]);
        }

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
}
