import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../game.service';
import { LibraryService } from './library.service';
import { AuthService } from '../auth/auth.service';
import { Game } from '../game.model';
import { forkJoin, of, Subscription, fromEvent, Subject } from 'rxjs';
import { switchMap, map, takeUntil } from 'rxjs/operators';
import { GameCardComponent } from '../game-card/game-card.component';
import { UiService } from '../ui.service';
import { GameStatus, UserGame } from './library.model';

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

  favorites: Game[] = [];
  wantToPlay: Game[] = [];
  playing: Game[] = [];
  completed: Game[] = [];

  isDown = false;
  startX = 0;
  scrollLeft = 0;
  isDragging = false;

  private dragSubscriptions = new Subscription();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly libraryService: LibraryService,
    private readonly gameService: GameService,
    private readonly authService: AuthService,
    private readonly uiService: UiService,
    private readonly cdr: ChangeDetectorRef
  ) {}

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
        if (userGames.length === 0) {
          this.favorites = [];
          this.wantToPlay = [];
          this.playing = [];
          this.completed = [];
          return of([]);
        }
        const gameObservables = userGames.map(userGame =>
          this.gameService.getGameById(userGame.gameId.toString()).pipe(
            map(game => ({ ...game, status: userGame.status, isFavorite: userGame.isFavorite }))
          )
        );
        return forkJoin(gameObservables);
      })
    ).subscribe(games => {
      this.favorites = games.filter(game => game.isFavorite);
      this.wantToPlay = games.filter(game => game.status === GameStatus.WANT_TO_PLAY);
      this.playing = games.filter(game => game.status === GameStatus.PLAYING);
      this.completed = games.filter(game => game.status === GameStatus.COMPLETED);
      this.cdr.detectChanges();
      this.setupAllDragToScroll();
    });
  }

  openGameModal(game: Game): void {
    if (this.isDragging) {
      this.isDragging = false;
      return;
    }
    this.uiService.openGameModal(game);
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
