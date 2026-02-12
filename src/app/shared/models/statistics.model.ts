export interface GenrePreference {
  genre: string;
  count: number;
}

export interface PlatformPreference {
  platform: string;
  count: number;
}

export interface ReleaseYearPreference {
  releaseYear: number; // Changed from 'year' to 'releaseYear'
  count: number;
}

export interface UserStatistics {
  favoriteGenres: GenrePreference[];
  favoritePlatforms: PlatformPreference[];
  favoriteReleaseYears: ReleaseYearPreference[];
  totalGames: number;
  averageRating: number;
}
