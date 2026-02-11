import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { UiService } from './core/services/ui.service';
import { User } from './shared/models/user.model';
import { GameDetailModalComponent } from './game-detail-modal/game-detail-modal.component';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { AuthWidgetComponent } from './auth-widget/auth-widget.component';
import { ToastContainerComponent } from './shared/components/toast/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    GameDetailModalComponent,
    LoginComponent,
    RegisterComponent,
    AuthWidgetComponent,
    ToastContainerComponent
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  isAuthenticated$: Observable<boolean>;
  currentUser$: Observable<User | null>;
  selectedGame$: Observable<{ id: number; platforms?: string[] } | null>;
  showLoginModal$: Observable<boolean>;
  showRegisterModal$: Observable<boolean>;
  isMobileMenuOpen$: Observable<boolean>;

  constructor(
    public readonly authService: AuthService,
    public readonly uiService: UiService,
    private readonly router: Router
  ) {
    this.isAuthenticated$ = this.authService.isAuthenticated$;
    this.currentUser$ = this.authService.currentUser$;
    this.selectedGame$ = this.uiService.selectedGame$;
    this.showLoginModal$ = this.uiService.showLoginModal$;
    this.showRegisterModal$ = this.uiService.showRegisterModal$;
    this.isMobileMenuOpen$ = this.uiService.isMobileMenuOpen$;
  }

  @HostListener('document:keydown.escape', ['$event'])
  onKeydownHandler(event: Event) {
    this.uiService.closeGameModal();
    this.uiService.closeLoginModal();
    this.uiService.closeRegisterModal();
  }

  logout(): void {
    this.authService.logout();
    this.uiService.closeMobileMenu();
    this.router.navigate(['/']);
  }
}
