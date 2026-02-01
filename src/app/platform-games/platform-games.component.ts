import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GameService } from '../core/services/game.service';
import { GameSummary } from '../shared/models/game.model';
import { CommonModule } from '@angular/common';
import { of, combineLatest } from 'rxjs';
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
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  pageSize = 50;

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
      this.platformService.getPlatforms()
    ]).pipe(
      switchMap(([params, platforms]) => {
        this.platformId = params.get('id');
        const foundPlatform = platforms.find(p => p.id.toString() === this.platformId);
        this.platformName = foundPlatform ? foundPlatform.name : 'Plataforma Desconocida';

        this.currentPage = 0;
        this.games = [];
        this.cdr.detectChanges();
        return this.loadGames();
      })
    ).subscribe();
  }

  loadGames() {
    if (!this.platformId) {
      return of([]);
    }

    const request = {
      filter: `platforms = (${this.platformId})`,
      limit: this.pageSize,
      offset: this.currentPage * this.pageSize,
      sort: 'rating desc'
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

  openGameModal(gameId: number): void {
    this.uiService.openGameModal(gameId);
  }
}
