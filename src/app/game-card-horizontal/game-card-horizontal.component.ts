import {Component, ChangeDetectionStrategy, input} from '@angular/core';
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
  readonly game = input.required<Game>();
}
