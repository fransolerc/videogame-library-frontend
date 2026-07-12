import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-game-card-skeleton',
  standalone: true,
  templateUrl: './game-card-skeleton.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./game-card-skeleton.component.css']
})
export class GameCardSkeletonComponent {}
