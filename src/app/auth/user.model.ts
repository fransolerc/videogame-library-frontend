export interface User {
  id: string;
  username: string;
}

export interface AuthResponse {
  token: string;
  user?: User;
  userId?: string;
}
