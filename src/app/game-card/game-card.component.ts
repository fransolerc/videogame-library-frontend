import { Component, Output, EventEmitter, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Game } from '../shared/models/game.model';

@Component({
  selector: 'app-game-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-card.component.html',
  styleUrls: ['./game-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameCardComponent {
  readonly game = input.required<Game>();
  readonly isPlatformClickable = input<boolean>(true);

  @Output() platformClick = new EventEmitter<string>();

  onPlatformClick(platformName: string, event: MouseEvent): void {
    if (this.isPlatformClickable()) {
      event.stopPropagation();
      this.platformClick.emit(platformName);
    }
  }
}
