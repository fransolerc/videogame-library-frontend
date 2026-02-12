import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [CommonModule, NgxChartsModule],
  template: `
    <div *ngIf="data.length > 0" class="chart-wrapper">
      <ngx-charts-bar-vertical
        [view]="view"
        [results]="data"
        [scheme]="colorScheme"
        [xAxis]="true"
        [yAxis]="true"
        [legend]="false"
        [showXAxisLabel]="true"
        [showYAxisLabel]="true"
        xAxisLabel="Año"
        yAxisLabel="Número de Juegos">
      </ngx-charts-bar-vertical>
    </div>
  `,
  styles: [`
    .chart-wrapper {
      height: 400px;
    }
  `]
})
export class ChartComponent {
  @Input() data: { name: string; value: number }[] = [];
  @Input() view: [number, number] = [700, 400];

  @Input() colorScheme: Color = {
    name: 'custom',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#38bdf8']
  };
}
