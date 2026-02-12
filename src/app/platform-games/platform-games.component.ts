import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
  styleUrls: ['./platform-games.component.css']
})
export class PlatformGamesComponent implements OnInit {
  games: GameSummary[] = [];
  platformId: string | null = null;
  platformName: string = '';
  platformType: string = '';
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  pageSize = 50;
  sortOrder$ = new BehaviorSubject<string>('rating-desc');
  pageInput: number = 1;
  isLoadingGames = true;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly gameService: GameService,
    private readonly platformService: PlatformService,
    private readonly cdr: ChangeDetectorRef,
    private readonly uiService: UiService
  ) {}

  ngOnInit(): void {
    combineLatest([
      this.route.paramMap,
      this.platformService.getPlatforms(),
      this.sortOrder$
    ]).pipe(
      switchMap(([params, platforms, sortOrder]) => {
        this.isLoadingGames = true;
        this.cdr.detectChanges();

        const newPlatformId = params.get('id');
        if (this.platformId !== newPlatformId) {
          this.currentPage = 0;
          this.pageInput = 1;
        }

        this.platformId = newPlatformId;
        const foundPlatform = platforms.find(p => p.id.toString() === this.platformId);
        this.platformName = foundPlatform ? foundPlatform.name : 'Plataforma Desconocida';
        this.platformType = foundPlatform ? foundPlatform.platformType : '';

        return this.loadGames(sortOrder);
      })
    ).subscribe();
  }

  loadGames(sortOrder: string = this.sortOrder$.value) {
    if (!this.platformId) {
      this.isLoadingGames = false;
      return of({ content: [], totalElements: 0, totalPages: 0, size: this.pageSize, number: 0 });
    }

    const request = {
      filter: `platforms = (${this.platformId})`,
      limit: this.pageSize,
      offset: this.currentPage * this.pageSize,
      sort: this.getSortString(sortOrder)
    };

    return this.gameService.filterGamesPaginated(request).pipe(
      tap((response: PaginatedResponse<GameSummary> | GameSummary[]) => {
        this.processResponse(response);
      }),
      finalize(() => {
        this.isLoadingGames = false;
        this.cdr.detectChanges();
      })
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
      this.totalPages = response.totalPages || 0;
    } else if (Array.isArray(response)) {
      games = response;
      this.totalElements = response.length;
      this.totalPages = games.length === this.pageSize ? this.currentPage + 2 : this.currentPage + 1;
    } else {
      this.games = [];
      this.totalElements = 0;
      this.totalPages = 0;
    }

    const uniqueGames = new Map<number, GameSummary>();
    games.forEach(game => {
      if (!uniqueGames.has(game.id)) {
        uniqueGames.set(game.id, game);
      }
    });
    this.games = Array.from(uniqueGames.values());

    if (this.totalPages === 0 && this.games.length > 0) {
      this.totalPages = 1;
    }
  }

  onPageChange(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.pageInput = page + 1;
      this.isLoadingGames = true;
      this.cdr.detectChanges();
      this.loadGames().subscribe();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onPageInputChange(): void {
    if (this.pageInput >= 1 && this.pageInput <= this.totalPages) {
      this.onPageChange(this.pageInput - 1);
    } else {
      this.pageInput = this.currentPage + 1;
    }
  }

  onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.currentPage = 0;
    this.pageInput = 1;
    this.sortOrder$.next(select.value);
  }

  openGameModal(gameId: number): void {
    const game = this.games.find(g => g.id === gameId);
    this.uiService.openGameModal(gameId, game?.platforms);
  }

  getPaginationNumbers(): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (this.totalPages <= maxVisiblePages) {
      for (let i = 0; i < this.totalPages; i++) {
        pages.push(i + 1);
      }
    } else {
      pages.push(1);
      let startPage = Math.max(2, this.currentPage - 1);
      let endPage = Math.min(this.totalPages - 1, this.currentPage + 3);

      if (this.currentPage < 3) {
        endPage = Math.min(this.totalPages - 1, 5);
      }
      if (this.currentPage > this.totalPages - 4) {
        startPage = Math.max(2, this.totalPages - 4);
      }
      if (startPage > 2) {
        pages.push('...');
      }
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      if (endPage < this.totalPages - 1) {
        pages.push('...');
      }
      pages.push(this.totalPages);
    }
    return pages;
  }
}
