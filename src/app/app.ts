import { Component, OnInit } from '@angular/core';
import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import { GameService } from './game.service';
import { Observable, Subject, combineLatest, BehaviorSubject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap, map } from 'rxjs/operators';
import { Game, GameFilterRequest } from './game.model';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  imports: [AsyncPipe, DatePipe, DecimalPipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  // Observables para los datos
  latestGames$: Observable<Game[]> | undefined;
  searchResults$: Observable<Game[]> | undefined;
  isSearching$: Observable<boolean> | undefined;

  private searchInput = new BehaviorSubject<string>('');
  private sortInput = new BehaviorSubject<string>('relevance');

  lastSearchTerm: string | null = null;
  hasResults: boolean = true;

  // Modal state
  selectedGame: Game | null = null;

  // Lightbox state
  enlargedScreenshot: string | null = null;

  constructor(private gameService: GameService, private sanitizer: DomSanitizer) {}

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchInput.next(input.value);
  }

  onSortChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.sortInput.next(select.value);
  }

  openModal(game: Game) {
    this.selectedGame = game;
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    this.selectedGame = null;
    document.body.style.overflow = 'auto';
  }

  openLightbox(screenshotUrl: string) {
    this.enlargedScreenshot = screenshotUrl;
  }

  closeLightbox() {
    this.enlargedScreenshot = null;
  }

  getSafeVideoUrl(url: string): SafeResourceUrl {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    let embedUrl = url;
    if (match && match[2] && match[2].length === 11) {
      const videoId = match[2];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  ngOnInit(): void {
    // 1. Carga inicial de los últimos juegos
    const initialRequest: GameFilterRequest = {
      filter: `first_release_date <= ${Math.floor(Date.now() / 1000)}`,
      sort: 'first_release_date desc',
      limit: 20
    };
    this.latestGames$ = this.gameService.filterGames(initialRequest);

    // Observable para saber si estamos buscando
    this.isSearching$ = this.searchInput.pipe(
      map(term => !!term) // Convierte el término en un booleano
    );

    // 2. Lógica para los resultados de búsqueda
    const searchResultsRaw$ = this.searchInput.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(term => this.lastSearchTerm = term),
      switchMap(term => {
        if (!term) {
          return of([]);
        }
        return this.gameService.searchGames(term);
      }),
      tap(games => this.hasResults = games.length > 0)
    );

    this.searchResults$ = combineLatest([searchResultsRaw$, this.sortInput]).pipe(
      map(([games, sortKey]) => {
        if (!games || games.length === 0) return [];

        const sortedGames = [...games];
        switch (sortKey) {
          case 'name-asc':
            return sortedGames.sort((a, b) => a.name.localeCompare(b.name));
          case 'name-desc':
            return sortedGames.sort((a, b) => b.name.localeCompare(a.name));
          case 'date-desc':
            return sortedGames.sort((a, b) => new Date(b.releaseDate!).getTime() - new Date(a.releaseDate!).getTime());
          case 'date-asc':
            return sortedGames.sort((a, b) => new Date(a.releaseDate!).getTime() - new Date(b.releaseDate!).getTime());
          case 'rating-desc':
            return sortedGames.sort((a, b) => (b.rating || 0) - (a.rating || 0));
          default:
            return games;
        }
      })
    );
  }
}
