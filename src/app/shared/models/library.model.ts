import { Game } from './game.model';

export enum GameStatus {
  WANT_TO_PLAY = 'WANT_TO_PLAY',
  PLAYING = 'PLAYING',
  COMPLETED = 'COMPLETED'
}

export interface AddGameToLibraryRequest {
  gameId: string;
  status: GameStatus;
}

export interface UserGame {
  id: string;
  userId: string;
  gameId: string;
  status: GameStatus;
  addedAt: string;
  updatedAt: string;
  game?: Game;
  isFavorite?: boolean;
}
