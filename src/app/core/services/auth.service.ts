import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthResponse, User, RegisterRequest } from '../../shared/models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly tokenKey = 'jwt_token';
  private readonly userKey = 'auth_user';
  private readonly isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  private readonly currentUserSubject = new BehaviorSubject<User | null>(this.getUser());

  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private readonly http: HttpClient) {
    if (this.hasToken() && !this.getUser()) {
      const token = this.getToken();
      if (token) {
        this.processToken(token);
      }
    }
  }

  private hasToken(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  private getUser(): User | null {
    const userStr = localStorage.getItem(this.userKey);
    return userStr ? JSON.parse(userStr) : null;
  }

  login(email: string, password: string): Observable<AuthResponse> {
    const authUrl = `${environment.apiUrl}/users/login`;
    return this.http.post<AuthResponse>(authUrl, { email, password }).pipe(
      tap(response => {
        localStorage.setItem(this.tokenKey, response.token);

        let user: User | null = null;
        if (response.user) {
          user = response.user;
        } else if (response.userId) {
          const tokenPayload = this.decodeTokenPayload(response.token);
          user = {
            id: response.userId,
            username: response.username || tokenPayload.sub || email
          };
        } else {
          const tokenPayload = this.decodeTokenPayload(response.token);
          user = {
            id: tokenPayload.userId || tokenPayload.id || tokenPayload.sub,
            username: tokenPayload.username || tokenPayload.sub
          };
        }

        if (user?.id) {
          this.saveUser(user);
        }
        this.isAuthenticatedSubject.next(true);
      })
    );
  }

  register(request: RegisterRequest): Observable<User> {
    const authUrl = `${environment.apiUrl}/users/register`;
    return this.http.post<User>(authUrl, request);
  }

  private decodeTokenPayload(token: string): any {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      console.error('Error decoding JWT token', e);
      return {};
    }
  }

  private processToken(token: string): void {
    const payload = this.decodeTokenPayload(token);
    const user: User = {
      id: payload.userId || payload.id || payload.sub,
      username: payload.username || payload.sub
    };

    if (user?.id) {
      this.saveUser(user);
    }
  }

  private saveUser(user: User): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getUserId(): string | null {
    const user = this.currentUserSubject.value;
    return user ? user.id : null;
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.isAuthenticatedSubject.next(false);
    this.currentUserSubject.next(null);
  }
}
