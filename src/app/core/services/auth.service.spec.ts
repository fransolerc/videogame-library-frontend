import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { User } from '../../shared/models/user.model';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('login', () => {
    it('should save token and user on successful login', async () => { // async
      const mockUser: User = { id: '1', username: 'testuser' };
      const mockResponse = { token: 'fake-jwt-token', user: mockUser };

      service.login('test@test.com', 'password').subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(localStorage.getItem('jwt_token')).toBe(mockResponse.token);
        expect(JSON.parse(localStorage.getItem('auth_user') || '{}')).toEqual(mockUser);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/users/login`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should update isAuthenticated$ and currentUser$ on login', async () => { // async
      const mockUser: User = { id: '1', username: 'testuser' };
      const mockResponse = { token: 'fake-jwt-token', user: mockUser };

      let authStatus = false;
      service.isAuthenticated$.subscribe(status => authStatus = status);

      let currentUser: User | null = null;
      service.currentUser$.subscribe(user => currentUser = user);

      service.login('test@test.com', 'password').subscribe(() => {
        expect(authStatus).toBe(true);
        expect(currentUser).toEqual(mockUser);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/users/login`);
      req.flush(mockResponse);
    });
  });

  describe('logout', () => {
    it('should clear token and user from localStorage', () => {
      localStorage.setItem('jwt_token', 'fake-token');
      localStorage.setItem('auth_user', JSON.stringify({ id: '1', username: 'test' }));

      service.logout();

      expect(localStorage.getItem('jwt_token')).toBeNull();
      expect(localStorage.getItem('auth_user')).toBeNull();
    });

    it('should update isAuthenticated$ and currentUser$ on logout', () => { // No es asíncrono, no necesita done
      localStorage.setItem('jwt_token', 'fake-token');
      localStorage.setItem('auth_user', JSON.stringify({ id: '1', username: 'test' }));
      (service as any).isAuthenticatedSubject.next(true);
      (service as any).currentUserSubject.next({ id: '1', username: 'test' });

      let authStatus = true;
      service.isAuthenticated$.subscribe(status => authStatus = status);

      let currentUser: User | null = { id: '1', username: 'test' };
      service.currentUser$.subscribe(user => currentUser = user);

      service.logout();

      expect(authStatus).toBe(false);
      expect(currentUser).toBeNull();
    });
  });
});
