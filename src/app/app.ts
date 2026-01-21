import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { GameService } from './game.service';
import { Observable, Subject, combineLatest, BehaviorSubject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap, map } from 'rxjs/operators';
import { Game } from './game.model';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  games$: Observable<Game[]> | undefined;
  private searchTerms = new Subject<string>();
  private sortOrder = new BehaviorSubject<string>('relevance');

  lastSearchTerm: string | null = null;
  hasResults: boolean = true;

  constructor(private gameService: GameService) {}

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerms.next(input.value);
  }

  onSortChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.sortOrder.next(select.value);
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

        const sortedGames = [...games]; // Create a new array to avoid mutating the original

        switch (sortKey) {
          case 'name-asc':
            return sortedGames.sort((a, b) => a.name.localeCompare(b.name));
          case 'name-desc':
            return sortedGames.sort((a, b) => b.name.localeCompare(a.name));
          case 'date-desc':
            return sortedGames.sort((a, b) => new Date(b.releaseDate!).getTime() - new Date(a.releaseDate!).getTime());
          case 'date-asc':
            return sortedGames.sort((a, b) => new Date(a.releaseDate!).getTime() - new Date(b.releaseDate!).getTime());
          default: // 'relevance'
            return games;
        }
      })
    );
  }
}
