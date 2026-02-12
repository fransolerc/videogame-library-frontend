import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatisticsComponent } from './statistics.component';
import { StatisticsService } from '../core/services/statistics.service';
import { AuthService } from '../core/services/auth.service';
import { LibraryService } from '../core/services/library.service';
import { GameService } from '../core/services/game.service';
import { of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('StatisticsComponent', () => {
  let component: StatisticsComponent;
  let fixture: ComponentFixture<StatisticsComponent>;

  // Mocks
  const mockStatisticsService = {
    getUserStatistics: () => of({
      favoriteGenres: [],
      favoritePlatforms: [],
      favoriteReleaseYears: [],
      totalGames: 0,
      averageRating: 0
    })
  };

  const mockAuthService = {
    getUserId: () => 'user123'
  };

  const mockLibraryService = {
    getLibrary: () => of([])
  };

  const mockGameService = {
    getGamesByIds: () => of([])
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        NgxChartsModule,
        StatisticsComponent, // Import standalone component
        BrowserAnimationsModule // Needed for ngx-charts
      ],
      providers: [
        { provide: StatisticsService, useValue: mockStatisticsService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: LibraryService, useValue: mockLibraryService },
        { provide: GameService, useValue: mockGameService }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StatisticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
