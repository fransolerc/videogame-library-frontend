export interface Game {
  id: string;
  name: string;
  genres: string[];
  releaseDate: string | null;
  coverImageUrl: string;
}
