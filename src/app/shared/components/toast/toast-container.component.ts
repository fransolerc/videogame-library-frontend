import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ToastService } from '../../../core/services/toast.service';
import { Toast, ToastComponent } from './toast.component';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, ToastComponent],
  template: `
    <div class="toast-container">
      @for (toast of toasts; track toast.id) {
        <app-toast [toast]="toast" (closeEvent)="removeToast($event)"></app-toast>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
  `]
})
export class ToastContainerComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  private subscription!: Subscription;

  constructor(private readonly toastService: ToastService) {}

  ngOnInit() {
    this.subscription = this.toastService.toastState.subscribe(
      (toast: Toast) => {
        this.toasts.push(toast);
      }
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  removeToast(id: number) {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
  }
}
