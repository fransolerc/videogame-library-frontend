import { Component, ElementRef, HostListener, ChangeDetectionStrategy, input, output, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { User } from '../shared/models/user.model';

@Component({
  selector: 'app-auth-widget',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './auth-widget.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./auth-widget.component.css']
})
export class AuthWidgetComponent {
  readonly isAuthenticated = input<boolean | null>(false);
  readonly currentUser = input<User | null>(null);
  readonly isMobileView = input<boolean>(false);
  readonly login = output<void>();
  readonly logout = output<void>();
  readonly closeMenu = output<void>();
  readonly profileMenu = viewChild<ElementRef>('profileMenu');

  isProfileMenuOpen = false;

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    const menu = this.profileMenu()?.nativeElement;
    if (this.isProfileMenuOpen && menu && !menu.contains(event.target)) {
      this.isProfileMenuOpen = false;
    }
  }

  toggleProfileMenu(event: Event): void {
    event.stopPropagation();
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  onLogout(): void {
    this.logout.emit();
    this.isProfileMenuOpen = false;
  }

  onLogin(): void {
    this.login.emit();
  }

  onLinkClick(): void {
    this.closeMenu.emit();
  }
}
