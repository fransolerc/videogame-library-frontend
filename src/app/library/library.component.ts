import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../core/services/game.service';
import { LibraryService } from '../core/services/library.service';
import { AuthService } from '../core/services/auth.service';
import { Game, GameStatus, UserGame } from '../shared/models/game.model';
import { forkJoin, of, Subscription, fromEvent, Subject, BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { switchMap, map, takeUntil, catchError } from 'rxjs/operators';
import { GameCardComponent } from '../game-card/game-card.component';
import { UiService } from '../core/services/ui.service';
import { PlatformService } from '../core/services/platform.service';
import { Platform } from '../shared/models/platform.model';

type LibraryDisplayGame = Game & { status: GameStatus; isFavorite: boolean | undefined; };

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, GameCardComponent],
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.css']
})
export class LibraryComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('favoritesList') favoritesList!: ElementRef<HTMLUListElement>;
  @ViewChild('wantToPlayList') wantToPlayList!: ElementRef<HTMLUListElement>;
  @ViewChild('playingList') playingList!: ElementRef<HTMLUListElement>;
  @ViewChild('completedList') completedList!: ElementRef<HTMLUListElement>;

  platforms$: Observable<Platform[]>;
  favorites: LibraryDisplayGame[] = [];
  wantToPlay: LibraryDisplayGame[] = [];
  playing: LibraryDisplayGame[] = [];
  completed: LibraryDisplayGame[] = [];

  isDown = false;
  startX = 0;
  scrollLeft = 0;
  isDragging = false;

  private readonly sortInput = new BehaviorSubject<string>('relevance');
  private readonly platformFilterInput = new BehaviorSubject<number | 'all'>('all');
  private allGames: LibraryDisplayGame[] = [];

  private dragSubscriptions = new Subscription();
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

  ngAfterViewInit(): void {
    this.setupAllDragToScroll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.dragSubscriptions.unsubscribe();
  }

  private loadLibrary(userId: string): void {
    this.libraryService.getLibrary(userId).pipe(
      switchMap((userGames: UserGame[]) => {
        if (!userGames || userGames.length === 0) {
          return of([]);
        }
        const gameObservables: Observable<LibraryDisplayGame | null>[] = userGames.map(userGame =>
          this.gameService.getGameById(userGame.gameId).pipe(
            map(game => ({ ...game, status: userGame.status, isFavorite: userGame.isFavorite })),
            catchError(error => {
              console.warn(`Could not load game with ID ${userGame.gameId}:`, error);
              return of(null);
            })
          )
        );
        return forkJoin(gameObservables);
      })
    ).subscribe(games => {
      this.allGames = games.filter((game): game is LibraryDisplayGame => game !== null);
      this.applyFilters(this.sortInput.value, this.platformFilterInput.value, []);
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

    this.cdr.detectChanges();
    this.setupAllDragToScroll();
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

  openGameModal(gameId: number): void {
    if (this.isDragging) {
      this.isDragging = false;
      return;
    }
    this.uiService.openGameModal(gameId);
  }

  private setupAllDragToScroll(): void {
    this.dragSubscriptions.unsubscribe();
    this.dragSubscriptions = new Subscription();

    const lists = [this.favoritesList, this.wantToPlayList, this.playingList, this.completedList];
    lists.forEach(list => {
      if (list) {
        this.setupDragToScroll(list);
      }
    });
  }

  private setupDragToScroll(elementRef: ElementRef<HTMLUListElement>): void {
    const slider = elementRef.nativeElement;

    const mouseDown$ = fromEvent<MouseEvent>(slider, 'mousedown');
    const mouseUp$ = fromEvent<MouseEvent>(document, 'mouseup');
    const mouseMove$ = fromEvent<MouseEvent>(document, 'mousemove');

    this.dragSubscriptions.add(mouseDown$.subscribe((e: MouseEvent) => {
      this.isDown = true;
      this.isDragging = false;
      slider.classList.add('active');
      this.startX = e.pageX - slider.offsetLeft;
      this.scrollLeft = slider.scrollLeft;
    }));

    this.dragSubscriptions.add(mouseUp$.subscribe(() => {
      this.isDown = false;
      slider.classList.remove('active');
    }));

    this.dragSubscriptions.add(mouseMove$.subscribe((e: MouseEvent) => {
      if (!this.isDown) return;
      e.preventDefault();
      this.isDragging = true;
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - this.startX) * 2;
      slider.scrollLeft = this.scrollLeft - walk;
    }));
  }
}
