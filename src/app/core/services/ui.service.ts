import { Injectable, Inject, Renderer2, RendererFactory2 } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UiService {
  private readonly renderer: Renderer2;

  private readonly _selectedGameSource = new BehaviorSubject<{ id: number; platforms?: string[] } | null>(null);
  selectedGame$ = this._selectedGameSource.asObservable();

  private readonly _showLoginModalSource = new BehaviorSubject<boolean>(false);
  showLoginModal$ = this._showLoginModalSource.asObservable();

  private readonly _showRegisterModalSource = new BehaviorSubject<boolean>(false);
  showRegisterModal$ = this._showRegisterModalSource.asObservable();

  private readonly _isMobileMenuOpenSource = new BehaviorSubject<boolean>(false);
  isMobileMenuOpen$ = this._isMobileMenuOpenSource.asObservable();

  private readonly _libraryChangedSource = new Subject<void>();
  libraryChanged$ = this._libraryChangedSource.asObservable();

  constructor(
    rendererFactory: RendererFactory2,
    @Inject(DOCUMENT) private readonly document: Document
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  openGameModal(gameId: number, platforms?: string[]): void {
    this._selectedGameSource.next({ id: gameId, platforms });
    this.updateBodyScroll();
  }

  closeGameModal(): void {
    this._selectedGameSource.next(null);
    this.updateBodyScroll();
  }

  openLoginModal(): void {
    this._showRegisterModalSource.next(false);
    this._showLoginModalSource.next(true);
    this.closeMobileMenu();
    this.updateBodyScroll();
  }

  closeLoginModal(): void {
    this._showLoginModalSource.next(false);
    this.updateBodyScroll();
  }

  openRegisterModal(): void {
    this._showLoginModalSource.next(false);
    this._showRegisterModalSource.next(true);
    this.closeMobileMenu();
    this.updateBodyScroll();
  }

  closeRegisterModal(): void {
    this._showRegisterModalSource.next(false);
    this.updateBodyScroll();
  }

  toggleMobileMenu(): void {
    this._isMobileMenuOpenSource.next(!this._isMobileMenuOpenSource.value);
  }

  closeMobileMenu(): void {
    this._isMobileMenuOpenSource.next(false);
  }

  notifyLibraryChanged(): void {
    this._libraryChangedSource.next();
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  private isModalOpen(): boolean {
    return !!this._selectedGameSource.value || this._showLoginModalSource.value || this._showRegisterModalSource.value;
  }

  private updateBodyScroll(): void {
    if (this.isModalOpen()) {
      this.renderer.addClass(this.document.body, 'modal-open');
    } else {
      this.renderer.removeClass(this.document.body, 'modal-open');
    }
  }
}
