import { Component, OnInit, ChangeDetectionStrategy, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { GameService } from '../core/services/game.service';
import { GameSummary } from '../shared/models/game.model';
import { PaginatedResponse } from '../shared/models/pagination.model';
import { CommonModule } from '@angular/common';
import { of, combineLatest, BehaviorSubject } from 'rxjs';
import { switchMap, tap, finalize } from 'rxjs/operators';
import { UiService } from '../core/services/ui.service';
import { PlatformService } from '../core/services/platform.service';
import { GameCardComponent } from '../game-card/game-card.component';
import { FormsModule } from '@angular/forms';
import { PlatformIconPipe } from '../shared/pipes';
import { GameCardSkeletonComponent } from '../game-card-skeleton/game-card-skeleton.component';

@Component({
  selector: 'app-platform-games',
  standalone: true,
  imports: [CommonModule, GameCardComponent, FormsModule, PlatformIconPipe, GameCardSkeletonComponent],
  templateUrl: './platform-games.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./platform-games.component.css']
})
export class PlatformGamesComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  games = signal<GameSummary[]>([]);
  platformName = signal('');
  platformType = signal('');
  currentPage = signal(0);
  totalPages = signal(0);
  pageInput = signal(1);
  isLoadingGames = signal(true);
  isTotalKnown = signal(false);

  platformId: string | null = null;
  totalElements = 0;
  pageSize = 50;
  sortOrder$ = new BehaviorSubject<string>('rating-desc');

  constructor(
    private readonly route: ActivatedRoute,
    private readonly gameService: GameService,
    private readonly platformService: PlatformService,
    private readonly uiService: UiService
  ) {}

  ngOnInit(): void {
    combineLatest([
      this.route.paramMap,
      this.platformService.getPlatforms(),
      this.sortOrder$
    ]).pipe(
      switchMap(([params, platforms, sortOrder]) => {
        this.isLoadingGames.set(true);

        const newPlatformId = params.get('id');
        if (this.platformId !== newPlatformId) {
          this.currentPage.set(0);
          this.pageInput.set(1);
        }

        this.platformId = newPlatformId;
        const foundPlatform = platforms.find(p => p.id.toString() === this.platformId);
        this.platformName.set(foundPlatform ? foundPlatform.name : 'Plataforma Desconocida');
        this.platformType.set(foundPlatform ? foundPlatform.platformType : '');

        return this.loadGames(sortOrder);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  loadGames(sortOrder: string = this.sortOrder$.value) {
    if (!this.platformId) {
      this.isLoadingGames.set(false);
      return of({ content: [], totalElements: 0, totalPages: 0, size: this.pageSize, number: 0 });
    }

    const request = {
      filter: `platforms = (${this.platformId})`,
      limit: this.pageSize,
      offset: this.currentPage() * this.pageSize,
      sort: this.getSortString(sortOrder)
    };

    return this.gameService.filterGamesPaginated(request).pipe(
      tap((response: PaginatedResponse<GameSummary> | GameSummary[]) => {
        this.processResponse(response);
      }),
      finalize(() => this.isLoadingGames.set(false))
    );
  }

  private getSortString(sortOrder: string): string {
    switch (sortOrder) {
      case 'name-asc': return 'name asc';
      case 'name-desc': return 'name desc';
      case 'date-desc': return 'first_release_date desc';
      case 'date-asc': return 'first_release_date asc';
      default: return 'rating desc';
    }
  }

  private processResponse(response: PaginatedResponse<GameSummary> | GameSummary[]): void {
    let games: GameSummary[] = [];
    if (response && 'content' in response) {
      games = response.content;
      this.totalElements = response.totalElements || 0;
      this.totalPages.set(response.totalPages || 0);
      this.isTotalKnown.set(true);
    } else if (Array.isArray(response)) {
      games = response;
      this.totalElements = response.length;
      this.totalPages.set(games.length === this.pageSize ? this.currentPage() + 2 : this.currentPage() + 1);
      this.isTotalKnown.set(false);
    } else {
      this.totalElements = 0;
      this.totalPages.set(0);
      this.isTotalKnown.set(true);
    }

    const uniqueGames = new Map<number, GameSummary>();
    games.forEach(game => {
      if (!uniqueGames.has(game.id)) {
        uniqueGames.set(game.id, game);
      }
    });
    this.games.set(Array.from(uniqueGames.values()));

    if (this.totalPages() === 0 && this.games().length > 0) {
      this.totalPages.set(1);
    }
  }

  onPageChange(page: number): void {
    if (page >= 0 && page < this.totalPages()) {
      this.currentPage.set(page);
      this.pageInput.set(page + 1);
      this.isLoadingGames.set(true);
      this.loadGames().subscribe();
    }
  }

  onPageInputChange(): void {
    const input = this.pageInput();
    if (input >= 1 && input <= this.totalPages()) {
      this.onPageChange(input - 1);
    } else {
      this.pageInput.set(this.currentPage() + 1);
    }
  }

  onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.currentPage.set(0);
    this.pageInput.set(1);
    this.sortOrder$.next(select.value);
  }

  openGameModal(gameId: number): void {
    const game = this.games().find(g => g.id === gameId);
    this.uiService.openGameModal(gameId, game?.platforms);
  }

  getPaginationNumbers(): (number | string)[] {
    if (!this.isTotalKnown()) {
      return this.getPaginationForUnknownTotal();
    }

    const maxVisiblePages = 5;
    if (this.totalPages() <= maxVisiblePages) {
      return this.getPaginationForSmallTotal();
    }

    return this.getPaginationForLargeTotal();
  }

  private getPaginationForUnknownTotal(): number[] {
    const pages: number[] = [];
    const startPage = Math.max(0, this.currentPage() - 2);
    const endPage = this.totalPages() - 1;

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i + 1);
    }
    return pages;
  }

  private getPaginationForSmallTotal(): number[] {
    const pages: number[] = [];
    for (let i = 0; i < this.totalPages(); i++) {
      pages.push(i + 1);
    }
    return pages;
  }

  private getPaginationForLargeTotal(): (number | string)[] {
    const current = this.currentPage();
    const total = this.totalPages();
    const pages: (number | string)[] = [];
    pages.push(1);

    let startPage = Math.max(2, current - 1);
    let endPage = Math.min(total - 1, current + 3);

    if (current < 3) {
      endPage = Math.min(total - 1, 5);
    }
    if (current > total - 4) {
      startPage = Math.max(2, total - 4);
    }

    if (startPage > 2) {
      pages.push('...');
    }
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    if (endPage < total - 1) {
      pages.push('...');
    }
    pages.push(total);

    return pages;
  }
}
