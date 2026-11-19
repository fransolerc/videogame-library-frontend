import { Component, Output, EventEmitter, ViewChild, ElementRef, HostListener, ChangeDetectionStrategy, input } from '@angular/core';
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
  @Output() login = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();
  @Output() closeMenu = new EventEmitter<void>();

  @ViewChild('profileMenu') profileMenu!: ElementRef;

  isProfileMenuOpen = false;

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    if (this.isProfileMenuOpen && this.profileMenu && !this.profileMenu.nativeElement.contains(event.target)) {
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
