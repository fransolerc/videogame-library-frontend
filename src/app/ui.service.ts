import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Game } from './game.model';

@Injectable({
  providedIn: 'root'
})
export class UiService {
  private readonly openGameModalSource = new Subject<Game>();
  openGameModal$ = this.openGameModalSource.asObservable();

  openGameModal(game: Game) {
    this.openGameModalSource.next(game);
  }
}
