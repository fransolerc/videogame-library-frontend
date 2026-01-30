import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PlatformService } from '../platform.service';
import { Platform } from '../platform.model';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

interface PlatformGroup {
  key: string;
  platforms: Platform[];
  sortOrder: number;
}

@Component({
  selector: 'app-platform-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './platform-list.component.html',
  styleUrls: ['./platform-list.component.css']
})
export class PlatformListComponent implements OnInit {
  groupedPlatforms$: Observable<PlatformGroup[]> | undefined;

  constructor(
    private platformService: PlatformService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.groupedPlatforms$ = this.platformService.getPlatforms().pipe(
      map(platforms => {
        const groups = new Map<string, { platforms: Platform[], sortOrder: number }>();

        platforms.forEach(platform => {
          let groupKey: string;
          let sortOrder: number;

          const type = platform.platformType ? platform.platformType.toUpperCase() : '';

          if (platform.generation && platform.generation > 0) {
            groupKey = `Generación ${platform.generation}`;
            sortOrder = platform.generation * 10;
          } else if (type === 'COMPUTER' || type === 'OPERATING_SYSTEM') {
            groupKey = 'Ordenadores / Sistemas Operativos';
            sortOrder = 5;
          } else if (type === 'ARCADE') {
            groupKey = 'Arcade';
            sortOrder = 4;
          } else if (type === 'PORTABLE_CONSOLE') {
            groupKey = 'Consolas Portátiles';
            sortOrder = 3;
          } else {
            groupKey = 'Otras Plataformas';
            sortOrder = 0;
          }

          if (!groups.has(groupKey)) {
            groups.set(groupKey, { platforms: [], sortOrder });
          }
          groups.get(groupKey)?.platforms.push(platform);
        });

        const resultGroups: PlatformGroup[] = Array.from(groups.entries()).map(([key, value]) => ({
          key,
          platforms: value.platforms.sort((a, b) => a.name.localeCompare(b.name)),
          sortOrder: value.sortOrder
        }));

        return resultGroups.sort((a, b) => b.sortOrder - a.sortOrder);
      })
    );
  }

  navigateToPlatform(id: number): void {
    this.router.navigate(['/platforms', id]);
  }

  getPlatformIconType(platform: Platform): string {
    const type = platform.platformType ? platform.platformType.toUpperCase() : 'UNKNOWN';

    switch (type) {
      case 'COMPUTER':
      case 'OPERATING_SYSTEM':
        return 'computer';
      case 'PORTABLE_CONSOLE':
        return 'portable';
      case 'ARCADE':
        return 'arcade';
      case 'CONSOLE':
      case 'PLATFORM':
      default:
        return 'console';
    }
  }
}
