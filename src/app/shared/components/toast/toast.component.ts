import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.css']
})
export class ToastComponent implements OnInit {
  @Input() toast!: Toast;
  @Output() closeEvent = new EventEmitter<number>();

  ngOnInit() {
    if (this.toast.duration) {
      setTimeout(() => this.closeToast(), this.toast.duration);
    }
  }

  closeToast() {
    this.closeEvent.emit(this.toast.id);
  }

  getIconPath(): string {
    switch (this.toast.type) {
      case 'success':
        return 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z';
      case 'error':
        return 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z';
      default:
        return 'M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z';
    }
  }
}
