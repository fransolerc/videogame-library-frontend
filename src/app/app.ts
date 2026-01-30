import { Component, OnInit, ChangeDetectorRef, OnDestroy, HostListener, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subscription } from 'rxjs';
import { Game } from './game.model';
import { AuthService } from './auth/auth.service';
import { LoginComponent } from './auth/login/login.component';
import { PlatformService } from './platform.service';
import { Platform } from './platform.model';
import { User } from './auth/user.model';
import { RegisterComponent } from './auth/register/register.component';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { UiService } from './ui.service';
import { GameDetailModalComponent } from './game-detail-modal/game-detail-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, LoginComponent, RegisterComponent, RouterLink, RouterOutlet, GameDetailModalComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class App implements OnInit, OnDestroy {
  @ViewChild('profileMenu') profileMenu!: ElementRef;

  isAuthenticated$: Observable<boolean>;
  currentUser$: Observable<User | null>;
  platforms$: Observable<Platform[]>;

  selectedGame: Game | null = null;
  showLoginModal = false;
  showRegisterModal = false;

  isProfileMenuOpen = false;
  isMobileMenuOpen = false;

  private readonly subscriptions = new Subscription();

  constructor(
    private readonly authService: AuthService,
    private readonly platformService: PlatformService,
    private readonly uiService: UiService,
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router
  ) {
    this.isAuthenticated$ = this.authService.isAuthenticated$;
    this.currentUser$ = this.authService.currentUser$;
    this.platforms$ = this.platformService.getPlatforms();
  }

  ngOnInit(): void {
    this.subscriptions.add(
      this.uiService.openGameModal$.subscribe(game => {
        this.selectedGame = game;
        this.cdr.detectChanges();
      })
    );

    this.subscriptions.add(
      this.authService.isAuthenticated$.subscribe(isAuthenticated => {
        if (isAuthenticated) {
          this.closeLoginModal();
          this.closeRegisterModal();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    if (this.isProfileMenuOpen && this.profileMenu && !this.profileMenu.nativeElement.contains(event.target)) {
      this.isProfileMenuOpen = false;
      this.cdr.detectChanges();
    }
  }

  toggleProfileMenu(event: Event): void {
    event.stopPropagation();
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  openLoginModal() {
    this.showRegisterModal = false;
    this.showLoginModal = true;
    document.body.style.overflow = 'hidden';
    this.closeMobileMenu();
    this.cdr.detectChanges(); // Forzar detección de cambios
  }

  closeLoginModal() {
    this.showLoginModal = false;
    document.body.style.overflow = 'auto';
  }

  openRegisterModal() {
    this.showLoginModal = false;
    this.showRegisterModal = true;
    document.body.style.overflow = 'hidden';
    this.closeMobileMenu();
  }

  closeRegisterModal() {
    this.showRegisterModal = false;
    document.body.style.overflow = 'auto';
  }

  logout() {
    this.authService.logout();
    this.isProfileMenuOpen = false;
    this.closeMobileMenu();
  }
}
