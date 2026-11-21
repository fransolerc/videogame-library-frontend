import { Component, OnInit, ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA, HostListener, ElementRef, ChangeDetectionStrategy, inject, input, output, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Game, GameStatus } from '../shared/models/game.model';
import { LibraryService } from '../core/services/library.service';
import { AuthService } from '../core/services/auth.service';
import { catchError, finalize } from 'rxjs/operators';
import '@justinribeiro/lite-youtube';
import { UiService } from '../core/services/ui.service';
import { GameService } from '../core/services/game.service';
import { ToastService } from '../core/services/toast.service';
import { forkJoin, Observable, of } from 'rxjs';

@Component({
  selector: 'app-game-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-detail-modal.component.html',
  styleUrls: ['./game-detail-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GameDetailModalComponent implements OnInit {
  private readonly libraryService = inject(LibraryService);
  private readonly authService = inject(AuthService);
  private readonly gameService = inject(GameService);
  private readonly uiService = inject(UiService);
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly gameId = input.required<number>();
  readonly platforms = input<string[]>();
  readonly closeModalEvent = output<void>();
  readonly carouselTrack = viewChild<ElementRef<HTMLDivElement>>('carouselTrack');

  game: Game | null = null;
  currentLibraryStatus: GameStatus | null = null;
  isCurrentGameFavorite = false;
  isAddingToLibrary = false;
  enlargedScreenshot: string | null = null;
  isSummaryExpanded = false;
  isStorylineExpanded = false;
  isAuthenticated$: Observable<boolean>;
  currentIndex = 1;
  isCarouselSetup = false;

  // Propiedades para el carrusel arrastrable
  isDragging = false;
  startX = 0;
  currentTranslate = 0;
  prevTranslate = 0;

  GameStatus = GameStatus;

  constructor() {
    this.isAuthenticated$ = this.authService.isAuthenticated$;
  }

  @HostListener('document:keydown.escape', ['$event'])
  onKeydownHandler(event: Event) {
    this.closeModal();
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    const userId = this.authService.getUserId();
    const gameDetails$ = this.gameService.getGameById(this.gameId());

    const handleGameLoaded = (gameData: Game) => {
      this.game = { ...gameData, platforms: this.platforms() ?? gameData.platforms };
      this.cdr.detectChanges();
      setTimeout(() => this.setupCarousel(), 0);
    };
    const handleError = () => {
      this.toastService.showError('No se pudo cargar el juego.');
      this.closeModal();
    };

    if (userId) {
      // Si falla solo el estado en biblioteca, el modal debe abrirse igualmente
      const gameStatus$ = this.libraryService.getGameFromLibrary(userId, this.gameId())
        .pipe(catchError(() => of(null)));

      forkJoin({ details: gameDetails$, status: gameStatus$ }).subscribe({
        next: ({ details, status }) => {
          if (status) {
            this.currentLibraryStatus = status.status;
            this.isCurrentGameFavorite = status.isFavorite || false;
          }
          handleGameLoaded(details);
        },
        error: handleError
      });
    } else {
      gameDetails$.subscribe({ next: handleGameLoaded, error: handleError });
    }
  }

  setupCarousel(): void {
    const carouselTrack = this.carouselTrack();
    if (this.isCarouselSetup || !carouselTrack?.nativeElement || !this.game?.screenshots?.length) return;

    carouselTrack.nativeElement.addEventListener('transitionend', () => this.handleTransitionEnd());
    this.updatePosition(false);
    this.isCarouselSetup = true;
  }

  handleTransitionEnd(): void {
    if (!this.game?.screenshots) return;
    const numScreenshots = this.game.screenshots.length;

    if (this.currentIndex === 0) {
      this.currentIndex = numScreenshots;
      this.updatePosition(false);
    } else if (this.currentIndex === numScreenshots + 1) {
      this.currentIndex = 1;
      this.updatePosition(false);
    }
  }

  getArtworkUrl(): string {
    if (this.game?.artworks?.[0]?.url) {
      return this.game.artworks[0].url.replace('t_thumb', 't_1080p');
    }
    return this.game?.coverImageUrl || '';
  }

  closeModal(): void {
    this.closeModalEvent.emit();
  }

  handleLibraryAction(status: GameStatus): void {
    const userId = this.authService.getUserId();
    if (!userId || !this.game) return;

    const isTogglingOff = this.currentLibraryStatus === status;
    const targetStatus = isTogglingOff ? GameStatus.NONE : status;

    this.isAddingToLibrary = true;
    this.libraryService
      .addOrUpdateGameInLibrary(userId, { gameId: this.game.id, status: targetStatus })
      .pipe(finalize(() => {
        this.isAddingToLibrary = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (result) => {
          // result == null (204): la entrada se borró, no era favorita
          this.currentLibraryStatus =
            result && result.status !== GameStatus.NONE ? result.status : null;
          this.isCurrentGameFavorite = result?.isFavorite ?? false;
          this.toastService.showSuccess(
            isTogglingOff ? 'Estado del juego eliminado' : 'Biblioteca actualizada'
          );
          this.uiService.notifyLibraryChanged();
        },
        error: () => this.toastService.showError('No se pudo actualizar la biblioteca')
      });
  }

  toggleFavorite(): void {
    const userId = this.authService.getUserId();
    if (!userId || !this.game) return;

    const action$ = this.isCurrentGameFavorite
      ? this.libraryService.removeFavorite(userId, this.game.id)
      : this.libraryService.addFavorite(userId, this.game.id);

    action$.subscribe(() => {
      this.isCurrentGameFavorite = !this.isCurrentGameFavorite;
      this.uiService.notifyLibraryChanged();
      this.cdr.detectChanges();
      this.toastService.showSuccess(this.isCurrentGameFavorite ? 'Añadido a favoritos' : 'Eliminado de favoritos');
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

  nextScreenshot(): void {
    if (!this.game?.screenshots || this.game.screenshots.length <= 1) return;
    this.currentIndex++;
    this.updatePosition(true);
  }

  prevScreenshot(): void {
    if (!this.game?.screenshots || this.game.screenshots.length <= 1) return;
    this.currentIndex--;
    this.updatePosition(true);
  }

  dragStart(event: MouseEvent): void {
    this.isDragging = true;
    this.startX = event.pageX;
    this.prevTranslate = this.currentTranslate;
    this.carouselTrack()?.nativeElement.classList.add('grabbing');
  }

  dragMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    const currentPosition = event.pageX;
    this.currentTranslate = this.prevTranslate + currentPosition - this.startX;
    this.setSliderPosition(false);
  }

  dragEnd(): void {
    this.isDragging = false;
    this.carouselTrack()?.nativeElement.classList.remove('grabbing');
    const movedBy = this.currentTranslate - this.prevTranslate;

    if (movedBy < -100) {
      this.nextScreenshot();
    } else if (movedBy > 100) {
      this.prevScreenshot();
    } else {
      this.updatePosition(true);
    }
  }

  updatePosition(withTransition = false): void {
    const track = this.carouselTrack()?.nativeElement;
    if (!track) return;
    const slideWidth = track.clientWidth;
    this.currentTranslate = this.currentIndex * -slideWidth;
    this.prevTranslate = this.currentTranslate;
    this.setSliderPosition(withTransition);
  }

  setSliderPosition(withTransition = false): void {
    const track = this.carouselTrack()?.nativeElement;
    if (!track) return;
    track.style.transition = withTransition ? 'transform 0.3s ease-out' : 'none';
    track.style.transform = `translateX(${this.currentTranslate}px)`;
  }
}
