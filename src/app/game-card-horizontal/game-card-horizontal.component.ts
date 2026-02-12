import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Game } from '../shared/models/game.model';

@Component({
  selector: 'app-game-card-horizontal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-card-horizontal.component.html',
  styleUrls: ['./game-card-horizontal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameCardHorizontalComponent {
  @Input({ required: true }) game!: Game;
}
