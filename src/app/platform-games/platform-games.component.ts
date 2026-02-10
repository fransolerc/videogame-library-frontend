import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GameService } from '../core/services/game.service';
import { GameSummary } from '../shared/models/game.model';
import { PaginatedResponse } from '../shared/models/pagination.model';
import { CommonModule } from '@angular/common';
import { of, combineLatest, BehaviorSubject } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { UiService } from '../core/services/ui.service';
import { PlatformService } from '../core/services/platform.service';
import { GameCardComponent } from '../game-card/game-card.component';
import { FormsModule } from '@angular/forms';
import { PlatformIconPipe } from '../shared/pipes/platform-icon.pipe';

@Component({
  selector: 'app-platform-games',
  standalone: true,
  imports: [CommonModule, GameCardComponent, FormsModule, PlatformIconPipe],
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
        const newPlatformId = params.get('id');

        // Reset pagination if platform changes
        if (this.platformId !== newPlatformId) {
          this.currentPage = 0;
          this.pageInput = 1;
        }

        this.platformId = newPlatformId;
        const foundPlatform = platforms.find(p => p.id.toString() === this.platformId);
        this.platformName = foundPlatform ? foundPlatform.name : 'Plataforma Desconocida';
        this.platformType = foundPlatform ? foundPlatform.platformType : '';

        this.games = [];
        this.cdr.detectChanges();
        return this.loadGames(sortOrder);
      })
    ).subscribe();
  }

  loadGames(sortOrder: string = this.sortOrder$.value) {
    if (!this.platformId) {
      // Ensure a consistent return type: Observable<PaginatedResponse<GameSummary>>
      return of({
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: this.pageSize,
        number: 0
      });
    }

    let sortString = 'rating desc';
    switch (sortOrder) {
      case 'name-asc': sortString = 'name asc'; break;
      case 'name-desc': sortString = 'name desc'; break;
      case 'date-desc': sortString = 'first_release_date desc'; break;
      case 'date-asc': sortString = 'first_release_date asc'; break;
    }

    const request = {
      filter: `platforms = (${this.platformId})`,
      limit: this.pageSize,
      offset: this.currentPage * this.pageSize,
      sort: sortString
    };

    return this.gameService.filterGamesPaginated(request).pipe(
      tap((response: PaginatedResponse<GameSummary> | GameSummary[]) => {
        // Usamos un type guard para diferenciar entre respuesta paginada y array directo
        if (response && 'content' in response) {
          this.games = response.content;
          this.totalElements = response.totalElements || 0;
          this.totalPages = response.totalPages || 0;
        } else if (Array.isArray(response)) {
          // Fallback para cuando la API devuelve un array directamente
          this.games = response;
          this.totalElements = response.length;
          // Estimamos las páginas totales
          this.totalPages = this.games.length === this.pageSize ? this.currentPage + 2 : this.currentPage + 1;
        } else {
          // Si la respuesta es inválida o vacía
          this.games = [];
          this.totalElements = 0;
          this.totalPages = 0;
        }

        // Asegurar que haya al menos 1 página si hay juegos pero totalPages es 0
        if (this.totalPages === 0 && this.games.length > 0) {
          this.totalPages = 1;
        }

        this.cdr.detectChanges();
      })
    );
  }

  onPageChange(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.pageInput = page + 1;
      this.loadGames().subscribe();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onPageInputChange(): void {
    if (this.pageInput >= 1 && this.pageInput <= this.totalPages) {
      this.onPageChange(this.pageInput - 1);
    } else {
      // Reset input if invalid
      this.pageInput = this.currentPage + 1;
    }
  }

  onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.currentPage = 0; // Reset to first page on sort change
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
      // Always show first page
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

      // Always show last page
      pages.push(this.totalPages);
    }

    return pages;
  }
}
