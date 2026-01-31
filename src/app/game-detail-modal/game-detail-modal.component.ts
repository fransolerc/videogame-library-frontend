import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Game } from '../game.model';
import { GameStatus } from '../library/library.model';
import { LibraryService } from '../library/library.service';
import { AuthService } from '../auth/auth.service';
import { finalize } from 'rxjs/operators';
import '@justinribeiro/lite-youtube';
import { UiService } from '../ui.service';

@Component({
  selector: 'app-game-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-detail-modal.component.html',
  styleUrls: ['./game-detail-modal.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GameDetailModalComponent implements OnInit {
  @Input({ required: true }) game!: Game;
  @Output() close = new EventEmitter<void>();

  currentLibraryStatus: GameStatus | null = null;
  isCurrentGameFavorite = false;
  isAddingToLibrary = false;
  enlargedScreenshot: string | null = null;

  GameStatus = GameStatus;

  constructor(
    private readonly libraryService: LibraryService,
    private readonly authService: AuthService,
    private readonly uiService: UiService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    document.body.style.overflow = 'hidden';
    this.loadInitialStatus();
  }

  loadInitialStatus(): void {
    const userId = this.authService.getUserId();
    if (userId) {
      this.libraryService.getGameFromLibrary(userId, this.game.id).subscribe(userGame => {
        if (userGame) {
          this.currentLibraryStatus = userGame.status;
          this.isCurrentGameFavorite = userGame.isFavorite || false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  closeModal(): void {
    document.body.style.overflow = 'auto';
    this.close.emit();
  }

  handleLibraryAction(status: GameStatus): void {
    const userId = this.authService.getUserId();
    if (!userId) {
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
      });
    } else {
      this.libraryService.addOrUpdateGameInLibrary(userId, { gameId: this.game.id, status }).pipe(finalize(() => {
        this.isAddingToLibrary = false;
        this.cdr.detectChanges();
      })).subscribe(userGame => {
        this.currentLibraryStatus = userGame.status;
        this.uiService.notifyLibraryChanged();
      });
    }
  }

  toggleFavorite(): void {
    const userId = this.authService.getUserId();
    if (!userId) {
      return;
    }
    const action$ = this.isCurrentGameFavorite
      ? this.libraryService.removeFavorite(userId, this.game.id)
      : this.libraryService.addFavorite(userId, this.game.id);

    action$.subscribe(() => {
      this.isCurrentGameFavorite = !this.isCurrentGameFavorite;
      this.uiService.notifyLibraryChanged();
      this.cdr.detectChanges();
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
    return (match && match[2] && match[2].length === 11) ? match[2] : null;
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }
}
