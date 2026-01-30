export interface Game {
  id: string;
  name: string;
  summary?: string;
  releaseDate?: string;
  rating?: number;
  coverImageUrl?: string;
  screenshots?: string[];
  videos?: string[];
  platforms?: string[];
  genres?: string[];
}

export interface GameFilterRequest {
  filter: string;
  sort?: string;
  limit?: number;
  offset?: number; // Añadir offset
}
