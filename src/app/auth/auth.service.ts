import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthResponse, User } from './user.model';

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

  constructor(private readonly http: HttpClient) { }

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
        if (response.user) {
          localStorage.setItem(this.userKey, JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
        }
        this.isAuthenticatedSubject.next(true);
      })
    );
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
