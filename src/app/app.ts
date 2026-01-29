import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, AfterViewInit, ElementRef, ViewChild, OnDestroy, HostListener } from '@angular/core';
import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import { GameService } from './game.service';
import { Observable, combineLatest, BehaviorSubject, of, Subscription, fromEvent, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap, map, finalize } from 'rxjs/operators';
import { Game, GameFilterRequest } from './game.model';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from './auth/auth.service';
import { LoginComponent } from './auth/login/login.component';
import { PlatformService } from './platform.service';
import { Platform } from './platform.model';
import { LibraryService } from './library/library.service';
import { GameStatus } from './library/library.model';
import { User } from './auth/user.model';
import { RegisterComponent } from './auth/register/register.component';

@Component({
  selector: 'app-root',
  imports: [AsyncPipe, DatePipe, DecimalPipe, LoginComponent, RegisterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('latestReleasesList') latestReleasesList!: ElementRef<HTMLUListElement>;
  @ViewChild('searchResultsList') searchResultsList!: ElementRef<HTMLUListElement>;
  @ViewChild('profileMenu') profileMenu!: ElementRef;

  latestGames$: Observable<Game[]> | undefined;
  searchResults$: Observable<Game[]> | undefined;
  isSearching$: Observable<boolean> | undefined;
  isAuthenticated$: Observable<boolean>;
  platforms$: Observable<Platform[]> | undefined;
  currentUser$: Observable<User | null>;
  favorites$ = new BehaviorSubject<Game[]>([]);

  private readonly searchInput = new BehaviorSubject<string>('');
  private readonly sortInput = new BehaviorSubject<string>('relevance');
  private readonly platformFilterInput = new BehaviorSubject<number | 'all'>('all');

  lastSearchTerm: string | null = null;
  hasResults: boolean = true;

  selectedGame: Game | null = null;
  showLoginModal = false;
  showRegisterModal = false;

  enlargedScreenshot: string | null = null;
  areVideosPaused = false;

  GameStatus = GameStatus;
  isAddingToLibrary = false;
  currentLibraryStatus: GameStatus | null = null;
  isCurrentGameFavorite = false;

  isProfileMenuOpen = false;
  isMobileMenuOpen = false;

  isDown = false;
  startX = 0;
  scrollLeft = 0;
  isDragging = false;
  private readonly subscriptions = new Subscription();

  constructor(
    private readonly gameService: GameService,
    private readonly sanitizer: DomSanitizer,
    private readonly authService: AuthService,
    private readonly platformService: PlatformService,
    private readonly libraryService: LibraryService,
    private readonly cdr: ChangeDetectorRef,
    private readonly elementRef: ElementRef
  ) {
    this.isAuthenticated$ = this.authService.isAuthenticated$;
    this.currentUser$ = this.authService.currentUser$;
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    if (this.isProfileMenuOpen && this.profileMenu && !this.profileMenu.nativeElement.contains(event.target)) {
      this.isProfileMenuOpen = false;
      this.cdr.detectChanges();
    }
  }

  ngAfterViewInit(): void {
    if (this.latestReleasesList) {
      this.setupDragToScroll(this.latestReleasesList);
    }
    if (this.searchResultsList) {
      this.setupDragToScroll(this.searchResultsList);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private setupDragToScroll(elementRef: ElementRef<HTMLUListElement>): void {
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

  toggleProfileMenu(event: Event): void {
    event.stopPropagation();
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  openModal(game: Game, event?: MouseEvent) {
    if (this.isDragging) {
      this.isDragging = false;
      return;
    }
    this.selectedGame = game;
    this.currentLibraryStatus = null;
    this.isCurrentGameFavorite = false;

    const userId = this.authService.getUserId();
    if (userId) {
      this.libraryService.getGameFromLibrary(userId, game.id).subscribe(userGame => {
        if (userGame) {
          this.currentLibraryStatus = userGame.status;
          this.isCurrentGameFavorite = userGame.isFavorite || false;
          this.cdr.detectChanges();
        }
      });
    }
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
    this.showRegisterModal = false;
    this.showLoginModal = true;
    document.body.style.overflow = 'hidden';
    this.closeMobileMenu();
  }

  closeLoginModal() {
    this.showLoginModal = false;
    document.body.style.overflow = 'auto';
  }

  openRegisterModal() {
    this.showLoginModal = false;
    this.showRegisterModal = true;
    document.body.style.overflow = 'hidden';
    this.closeMobileMenu();
  }

  closeRegisterModal() {
    this.showRegisterModal = false;
    document.body.style.overflow = 'auto';
  }

  logout() {
    this.authService.logout();
    this.isProfileMenuOpen = false;
    this.closeMobileMenu();
  }

  handleLibraryAction(status: string) {
    if (!this.selectedGame) return;

    const userId = this.authService.getUserId();
    if (!userId) {
      this.openLoginModal();
      return;
    }

    this.isAddingToLibrary = true;
    const newStatus = status as GameStatus;

    if (this.currentLibraryStatus === newStatus) {
      this.libraryService.removeGameFromLibrary(userId, this.selectedGame.id).pipe(
        finalize(() => {
          this.isAddingToLibrary = false;
          this.cdr.detectChanges();
        })
      ).subscribe({
        next: () => {
          this.currentLibraryStatus = null;
          console.log('Juego eliminado de la biblioteca.');
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error eliminando juego de la biblioteca:', err);
          alert('Error al eliminar el juego de la biblioteca');
          this.cdr.detectChanges();
        }
      });
    } else {
      this.libraryService.addOrUpdateGameInLibrary(userId, {
        gameId: this.selectedGame.id,
        status: newStatus
      }).pipe(
        finalize(() => {
          this.isAddingToLibrary = false;
          this.cdr.detectChanges();
        })
      ).subscribe({
        next: (userGame) => {
          this.currentLibraryStatus = userGame.status;
          console.log('Juego añadido/actualizado en la biblioteca:', userGame);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error adding game to library:', err);
          alert('Error al añadir el juego a la biblioteca');
          this.cdr.detectChanges();
        }
      });
    }
  }

  toggleFavorite(): void {
    if (!this.selectedGame) return;

    const userId = this.authService.getUserId();
    if (!userId) {
      this.openLoginModal();
      return;
    }

    const gameId = this.selectedGame.id;
    const isFavorite = this.isCurrentGameFavorite;

    const action$ = isFavorite
      ? this.libraryService.removeFavorite(userId, gameId)
      : this.libraryService.addFavorite(userId, gameId);

    action$.subscribe({
      next: () => {
        this.isCurrentGameFavorite = !isFavorite;
        this.loadFavorites(userId);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al actualizar favoritos:', err);
        alert('Error al actualizar favoritos');
      }
    });
  }

  private loadFavorites(userId: string): void {
    this.libraryService.getFavorites(userId).pipe(
      switchMap(favoriteUserGames => {
        if (favoriteUserGames.length === 0) {
          return of([]);
        }
        const gameObservables = favoriteUserGames.map(fav => this.gameService.getGameById(fav.gameId.toString()));
        return forkJoin(gameObservables);
      })
    ).subscribe(games => {
      this.favorites$.next(games);
      this.cdr.detectChanges();
    });
  }

  getSafeVideoUrl(url: string): SafeResourceUrl {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = regExp.exec(url);
    let embedUrl = url;
    if (match?.[2]?.length === 11) {
      const videoId = match[2];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  getVideoThumbnail(url: string): string {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = regExp.exec(url);
    if (match?.[2]?.length === 11) {
      const videoId = match[2];
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
    return '';
  }

  ngOnInit(): void {
    this.authService.isAuthenticated$.subscribe(isAuthenticated => {
      if (isAuthenticated) {
        this.closeLoginModal();
        this.closeRegisterModal();
        const userId = this.authService.getUserId();
        if (userId) {
          this.loadFavorites(userId);
        }
      } else {
        this.favorites$.next([]);
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
