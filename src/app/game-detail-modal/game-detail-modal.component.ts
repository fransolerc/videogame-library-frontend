import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Game, GameStatus } from '../shared/models/game.model';
import { LibraryService } from '../core/services/library.service';
import { AuthService } from '../core/services/auth.service';
import { tap } from 'rxjs/operators'; // Cambiado de finalize a tap
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
  @ViewChild('carouselTrack') carouselTrack!: ElementRef<HTMLDivElement>;

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

    const handleGameLoaded = (gameData: Game) => {
      this.game = { ...gameData, platforms: this.platforms };
      this.cdr.detectChanges();
      setTimeout(() => this.setupCarousel(), 0);
    };

    if (userId) {
      const gameStatus$ = this.libraryService.getGameFromLibrary(userId, this.gameId);
      forkJoin({ details: gameDetails$, status: gameStatus$ }).subscribe(({ details, status }) => {
        if (status) {
          this.currentLibraryStatus = status.status;
          this.isCurrentGameFavorite = status.isFavorite || false;
        }
        handleGameLoaded(details);
      });
    } else {
      gameDetails$.subscribe(handleGameLoaded);
    }
  }

  setupCarousel(): void {
    if (this.isCarouselSetup || !this.carouselTrack?.nativeElement || !this.game?.screenshots?.length) return;

    this.carouselTrack.nativeElement.addEventListener('transitionend', () => this.handleTransitionEnd());
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
    document.body.style.overflow = 'auto';
    this.closeModalEvent.emit();
  }

  handleLibraryAction(status: GameStatus): void {
    const userId = this.authService.getUserId();
    if (!userId || !this.game) return;

    this.isAddingToLibrary = true;
    const action$: Observable<any> = this.currentLibraryStatus === status
      ? this.libraryService.removeGameFromLibrary(userId, this.game.id)
      : this.libraryService.addOrUpdateGameInLibrary(userId, { gameId: this.game.id, status });

    action$.pipe(
      tap({
        finalize: () => {
          this.isAddingToLibrary = false;
          this.cdr.detectChanges();
        }
      })
    ).subscribe((result: any) => {
      if (this.currentLibraryStatus === status) {
        this.currentLibraryStatus = null;
        this.toastService.showSuccess('Juego eliminado de tu biblioteca');
      } else if (result) {
        this.currentLibraryStatus = result.status;
        this.toastService.showSuccess('Biblioteca actualizada');
      }
      this.uiService.notifyLibraryChanged();
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
    this.carouselTrack.nativeElement.classList.add('grabbing');
  }

  dragMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    const currentPosition = event.pageX;
    this.currentTranslate = this.prevTranslate + currentPosition - this.startX;
    this.setSliderPosition(false);
  }

  dragEnd(): void {
    this.isDragging = false;
    this.carouselTrack.nativeElement.classList.remove('grabbing');
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
    if (!this.carouselTrack?.nativeElement) return;
    const slideWidth = this.carouselTrack.nativeElement.clientWidth;
    this.currentTranslate = this.currentIndex * -slideWidth;
    this.prevTranslate = this.currentTranslate;
    this.setSliderPosition(withTransition);
  }

  setSliderPosition(withTransition = false): void {
    if (!this.carouselTrack?.nativeElement) return;
    this.carouselTrack.nativeElement.style.transition = withTransition ? 'transform 0.3s ease-out' : 'none';
    this.carouselTrack.nativeElement.style.transform = `translateX(${this.currentTranslate}px)`;
  }
}
