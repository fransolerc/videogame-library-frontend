export interface Game {
  id: string;
  name: string;
  genres?: string[];
  releaseDate: string | null;
  coverImageUrl: string;
  summary?: string;
  videos?: string[];
  screenshots?: string[];
  platforms?: string[];
  rating?: number;
}
