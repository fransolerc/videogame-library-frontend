export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number; // current page number (0-indexed)
  // Puedes añadir más propiedades si tu API las devuelve, como:
  // first: boolean;
  // last: boolean;
  // empty: boolean;
}
