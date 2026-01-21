import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from './game.service';
import { Observable, Subject, combineLatest, BehaviorSubject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap, map } from 'rxjs/operators';
import { Game } from './game.model';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  games$: Observable<Game[]> | undefined;
  private searchTerms = new Subject<string>();
  private sortOrder = new BehaviorSubject<string>('relevance');

  lastSearchTerm: string | null = null;
  hasResults: boolean = true;

  // Modal state
  selectedGame: Game | null = null;

  constructor(private gameService: GameService, private sanitizer: DomSanitizer) {}

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerms.next(input.value);
  }

  onSortChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.sortOrder.next(select.value);
  }

  openModal(game: Game) {
    this.selectedGame = game;
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }

  closeModal() {
    this.selectedGame = null;
    document.body.style.overflow = 'auto'; // Restore scrolling
  }

  getSafeVideoUrl(url: string): SafeResourceUrl {
    // Extract video ID from various YouTube URL formats
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);

    let embedUrl = url;
    if (match && match[2].length === 11) {
      const videoId = match[2];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  ngOnInit(): void {
    const searchResults$ = this.searchTerms.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(term => this.lastSearchTerm = term),
      switchMap((term: string) => this.gameService.searchGames(term)),
      tap(games => this.hasResults = games.length > 0)
    );

    this.games$ = combineLatest([searchResults$, this.sortOrder]).pipe(
      map(([games, sortKey]) => {
        if (!games) return [];

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
          default: // 'relevance'
            return games;
        }
      })
    );
  }
}
