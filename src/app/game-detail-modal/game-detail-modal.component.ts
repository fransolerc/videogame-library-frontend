import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Game, GameStatus } from '../shared/models/game.model';
import { LibraryService } from '../core/services/library.service';
import { AuthService } from '../core/services/auth.service';
import { finalize } from 'rxjs/operators';
import '@justinribeiro/lite-youtube';
import { UiService } from '../core/services/ui.service';
import { GameService } from '../core/services/game.service';
import { ToastService } from '../core/services/toast.service';
import { forkJoin, Observable } from 'rxjs';

@Component({
  selector: 'app-game-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-detail-modal.component.html',
  styleUrls: ['./game-detail-modal.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GameDetailModalComponent implements OnInit {
  @Input({ required: true }) gameId!: number;
  @Input() platforms?: string[];
  @Output() closeModalEvent = new EventEmitter<void>();

  game: Game | null = null;
  currentLibraryStatus: GameStatus | null = null;
  isCurrentGameFavorite = false;
  isAddingToLibrary = false;
  enlargedScreenshot: string | null = null;
  isSummaryExpanded = false;
  isStorylineExpanded = false;
  isAuthenticated$: Observable<boolean>;

  GameStatus = GameStatus;

  constructor(
    private readonly libraryService: LibraryService,
    private readonly authService: AuthService,
    private readonly gameService: GameService,
    private readonly uiService: UiService,
    private readonly toastService: ToastService,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.isAuthenticated$ = this.authService.isAuthenticated$;
  }

  @HostListener('document:keydown.escape', ['$event'])
  onKeydownHandler(event: Event) {
    this.closeModal();
  }

  ngOnInit(): void {
    document.body.style.overflow = 'hidden';
    this.loadInitialData();
  }

  loadInitialData(): void {
    const userId = this.authService.getUserId();
    const gameDetails$ = this.gameService.getGameById(this.gameId);

    if (userId) {
      const gameStatus$ = this.libraryService.getGameFromLibrary(userId, this.gameId);

      forkJoin({ details: gameDetails$, status: gameStatus$ }).subscribe(({ details, status }) => {
        this.game = { ...details, platforms: this.platforms };
        if (status) {
          this.currentLibraryStatus = status.status;
          this.isCurrentGameFavorite = status.isFavorite || false;
        }
        this.cdr.detectChanges();
      });
    } else {
      gameDetails$.subscribe(details => {
        this.game = { ...details, platforms: this.platforms };
        this.cdr.detectChanges();
      });
    }
  }

  getArtworkUrl(): string {
    if (this.game?.artworks?.[0]?.url) {
      return this.game.artworks[0].url.replace('t_thumb', 't_1080p');
    }
    return this.game?.coverImageUrl || '';
  }

  closeModal(): void {
    document.body.style.overflow = 'auto';
    this.closeModalEvent.emit();
  }

  handleLibraryAction(status: GameStatus): void {
    const userId = this.authService.getUserId();
    if (!userId || !this.game) {
      return;
    }
    this.isAddingToLibrary = true;
    if (this.currentLibraryStatus === status) {
      this.libraryService.removeGameFromLibrary(userId, this.game.id).pipe(finalize(() => {
        this.isAddingToLibrary = false;
        this.cdr.detectChanges();
      })).subscribe(() => {
        this.currentLibraryStatus = null;
        this.uiService.notifyLibraryChanged();
        this.toastService.showSuccess('Juego eliminado de tu biblioteca');
      });
    } else {
      this.libraryService.addOrUpdateGameInLibrary(userId, { gameId: this.game.id, status }).pipe(finalize(() => {
        this.isAddingToLibrary = false;
        this.cdr.detectChanges();
      })).subscribe(userGame => {
        this.currentLibraryStatus = userGame.status;
        this.uiService.notifyLibraryChanged();
        this.toastService.showSuccess('Biblioteca actualizada');
      });
    }
  }

  toggleFavorite(): void {
    const userId = this.authService.getUserId();
    if (!userId || !this.game) {
      return;
    }
    const action$ = this.isCurrentGameFavorite
      ? this.libraryService.removeFavorite(userId, this.game.id)
      : this.libraryService.addFavorite(userId, this.game.id);

    action$.subscribe(() => {
      this.isCurrentGameFavorite = !this.isCurrentGameFavorite;
      this.uiService.notifyLibraryChanged();
      this.cdr.detectChanges();
      if (this.isCurrentGameFavorite) {
        this.toastService.showSuccess('Añadido a favoritos');
      } else {
        this.toastService.showInfo('Eliminado de favoritos');
      }
    });
  }

  openLightbox(screenshotUrl: string): void {
    this.enlargedScreenshot = screenshotUrl;
  }

  closeLightbox(): void {
    this.enlargedScreenshot = null;
  }

  extractYoutubeVideoId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = regExp.exec(url);
    return match?.[2]?.length === 11 ? match[2] : null;
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }
}
