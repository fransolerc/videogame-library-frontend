import { Component, OnInit } from '@angular/core';
import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import { GameService } from './game.service';
import { Observable, Subject, combineLatest, BehaviorSubject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap, map } from 'rxjs/operators';
import { Game, GameFilterRequest } from './game.model';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from './auth/auth.service';
import { LoginComponent } from './auth/login/login.component';

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

  private searchInput = new BehaviorSubject<string>('');
  private sortInput = new BehaviorSubject<string>('relevance');

  lastSearchTerm: string | null = null;
  hasResults: boolean = true;

  selectedGame: Game | null = null;
  showLoginModal = false;

  enlargedScreenshot: string | null = null;
  areVideosPaused = false;

  constructor(
    private gameService: GameService,
    private sanitizer: DomSanitizer,
    private authService: AuthService
  ) {
    this.isAuthenticated$ = this.authService.isAuthenticated$;
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchInput.next(input.value);
  }

  onSortChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.sortInput.next(select.value);
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
    const initialRequest: GameFilterRequest = {
      filter: `first_release_date <= ${Math.floor(Date.now() / 1000)}`,
      sort: 'first_release_date desc',
      limit: 20
    };
    this.latestGames$ = this.gameService.filterGames(initialRequest);

    this.isSearching$ = this.searchInput.pipe(
      map(term => !!term)
    );

    const searchResultsRaw$ = this.searchInput.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(term => this.lastSearchTerm = term),
      switchMap(term => {
        if (!term) {
          return of([]);
        }
        return this.gameService.searchGames(term);
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
