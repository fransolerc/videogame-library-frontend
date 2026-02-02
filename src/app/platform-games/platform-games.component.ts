import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GameService } from '../core/services/game.service';
import { GameSummary } from '../shared/models/game.model';
import { CommonModule } from '@angular/common';
import { of, combineLatest, BehaviorSubject } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { UiService } from '../core/services/ui.service';
import { PlatformService } from '../core/services/platform.service';
import { GameCardComponent } from '../game-card/game-card.component';

@Component({
  selector: 'app-platform-games',
  standalone: true,
  imports: [CommonModule, GameCardComponent],
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
      return of([]);
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

    return this.gameService.filterGames(request).pipe(
      tap(response => {
        this.games = response;
        this.totalElements = response.length; // This might not be accurate if the API doesn't return total elements
        this.cdr.detectChanges();
      })
    );
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadGames().subscribe();
  }

  onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.currentPage = 0; // Reset to first page on sort change
    this.sortOrder$.next(select.value);
  }

  openGameModal(gameId: number): void {
    const game = this.games.find(g => g.id === gameId);
    this.uiService.openGameModal(gameId, game?.platforms);
  }

  getPlatformIcon(type: string): string {
    const normalizedType = type ? type.toUpperCase() : 'UNKNOWN';
    switch (normalizedType) {
      case 'COMPUTER':
      case 'OPERATING_SYSTEM':
        return 'M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z';
      case 'PORTABLE_CONSOLE':
        return 'M22 6H2v12h20V6zm-2 10H4V8h16v8zM7 9h2v2H7zm0 4h2v2H7zm4-4h2v2h-2zm0 4h2v2h-2zm4-4h2v6h-2z';
      case 'ARCADE':
        return 'M21 9H3V7h18v2zm-9-6c-1.1 0-2 .9-2 2v2h4V5c0-1.1-.9-2-2-2zm9 8H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2zm-9 8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z';
      case 'CONSOLE':
      case 'PLATFORM':
      default:
        return 'M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z';
    }
  }
}
