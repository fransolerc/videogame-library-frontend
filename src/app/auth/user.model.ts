export interface User {
  id: string;
  username: string;
  avatar?: string; // Añadido para la URL del avatar
  // Puedes añadir más propiedades del usuario aquí si el backend las devuelve
}

export interface AuthResponse {
  token: string;
  user?: User; // El backend podría devolver información del usuario junto con el token
  userId?: string;
  username?: string; // Nuevo campo para el nombre de usuario
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}
