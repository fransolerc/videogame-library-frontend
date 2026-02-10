import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Toast } from '../../shared/components/toast/toast.component';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new Subject<Toast>();
  toastState = this.toastSubject.asObservable();

  private id = 0;

  show(message: string, type: 'success' | 'error' | 'info', duration: number = 5000) {
    this.id++;
    this.toastSubject.next({ id: this.id, message, type, duration });
  }

  showSuccess(message: string, duration: number = 5000) {
    this.show(message, 'success', duration);
  }

  showError(message: string, duration: number = 5000) {
    this.show(message, 'error', duration);
  }

  showInfo(message: string, duration: number = 5000) {
    this.show(message, 'info', duration);
  }
}
