// Representa un resumen de los datos de un videojuego (GameSummaryDTO)
export interface GameSummary {
  id: number;
  name: string;
  platforms?: string[];
  releaseDate?: string;
  coverImageUrl?: string;
  rating?: number;
}

// Representa los datos completos de un videojuego (GameDTO)
export interface Game extends GameSummary {
  genres?: string[];
  summary?: string;
  storyline?: string;
  videos?: string[];
  screenshots?: string[];
  artworks?: Artwork[];
}

export interface Artwork {
  id: number;
  url: string;
}

export interface GameFilterRequest {
  filter: string;
  sort?: string;
  limit?: number;
  offset?: number;
}

export enum GameStatus {
  WANT_TO_PLAY = 'WANT_TO_PLAY',
  PLAYING = 'PLAYING',
  COMPLETED = 'COMPLETED',
  NONE = 'NONE'
}

export interface AddGameToLibraryRequest {
  gameId: number;
  status: GameStatus;
}

export interface UserGame {
  id: string;
  userId: string;
  gameId: number;
  status: GameStatus;
  addedAt: string;
  updatedAt: string;
  game?: GameSummary;
  isFavorite?: boolean;
}
