import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GameService } from '../game.service';
import { Game } from '../game.model';
import { CommonModule } from '@angular/common';
import { of, combineLatest } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { UiService } from '../ui.service';
import { PlatformService } from '../platform.service';
import { GameCardComponent } from '../game-card/game-card.component';

@Component({
  selector: 'app-platform-games',
  standalone: true,
  imports: [CommonModule, GameCardComponent],
  templateUrl: './platform-games.component.html',
  styleUrls: ['./platform-games.component.css']
})
export class PlatformGamesComponent implements OnInit {
  games: Game[] = [];
  platformId: string | null = null;
  platformName: string = '';
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  pageSize = 20;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
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

        console.log(`Cargando juegos para ${this.platformName} (ID: ${this.platformId})`);

        this.currentPage = 0;
        this.games = [];
        this.cdr.detectChanges();
        return this.loadGames();
      })
    ).subscribe();
  }

  loadGames() {
    if (!this.platformId) {
      return of({ content: [], totalPages: 0, totalElements: 0 });
    }

    const request = {
      filter: `involved_companies != null & platforms = (${this.platformId})`,
      limit: 50,
      offset: this.currentPage * 50,
      sort: 'rating desc'
    };

    return this.gameService.filterGames(request).pipe(
      tap((response: any) => {
        if (Array.isArray(response)) {
             this.games = response;
             this.totalElements = response.length;
        } else {
             this.games = response.content || [];
             this.totalPages = response.totalPages || 0;
             this.totalElements = response.totalElements || 0;
        }
        this.cdr.detectChanges();
      })
    );
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadGames().subscribe();
  }

  openGameModal(game: Game): void {
    this.uiService.openGameModal(game);
  }
}
