export interface Game {
  id: string;
  name: string;
  genres?: string[];
  releaseDate: string | null;
  coverImageUrl: string;
  description?: string;
  videos?: string[];
  screenshots?: string[];
  platforms?: string[];
  rating?: number;
}
