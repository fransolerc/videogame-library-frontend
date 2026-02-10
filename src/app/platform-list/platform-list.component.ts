import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PlatformService } from '../core/services/platform.service';
import { Platform } from '../shared/models/platform.model';
import { map } from 'rxjs/operators';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { PlatformIconPipe } from '../shared/pipes/platform-icon.pipe';

interface PlatformGroup {
  key: string;
  platforms: Platform[];
  sortOrder: number;
}

@Component({
  selector: 'app-platform-list',
  standalone: true,
  imports: [CommonModule, PlatformIconPipe],
  templateUrl: './platform-list.component.html',
  styleUrls: ['./platform-list.component.css']
})
export class PlatformListComponent implements OnInit {
  groupedPlatforms$: Observable<PlatformGroup[]> | undefined;
  sortOrder$ = new BehaviorSubject<string>('name-asc');

  constructor(
    private readonly platformService: PlatformService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.groupedPlatforms$ = combineLatest([
      this.platformService.getPlatforms(),
      this.sortOrder$
    ]).pipe(
      map(([platforms, sortOrder]) => {
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
          platforms: this.sortPlatforms([...value.platforms], sortOrder),
          sortOrder: value.sortOrder
        }));

        return resultGroups.sort((a, b) => b.sortOrder - a.sortOrder);
      })
    );
  }

  sortPlatforms(platforms: Platform[], sortOrder: string): Platform[] {
    switch (sortOrder) {
      case 'name-asc':
        return platforms.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return platforms.sort((a, b) => b.name.localeCompare(a.name));
      default:
        return platforms;
    }
  }

  onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.sortOrder$.next(select.value);
  }

  navigateToPlatform(id: number): void {
    this.router.navigate(['/platforms', id]);
  }
}
