import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlatformGamesComponent } from './platform-games.component';
import { ActivatedRoute } from '@angular/router';
import { GameService } from '../core/services/game.service';
import { PlatformService } from '../core/services/platform.service';
import { UiService } from '../core/services/ui.service';
import { of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlatformIconPipe } from '../shared/pipes';
import { GameCardSkeletonComponent } from '../game-card-skeleton/game-card-skeleton.component';
import { GameCardComponent } from '../game-card/game-card.component';

describe('PlatformGamesComponent', () => {
  let component: PlatformGamesComponent;
  let fixture: ComponentFixture<PlatformGamesComponent>;

  // Mocks
  const mockActivatedRoute = {
    paramMap: of({ get: (key: string) => '1' })
  };

  const mockGameService = {
    filterGamesPaginated: () => of({
      content: [
        { id: 1, name: 'Game 1', rating: 90 },
        { id: 2, name: 'Game 2', rating: 80 }
      ],
      totalPages: 5,
      totalElements: 250
    })
  };

  const mockPlatformService = {
    getPlatforms: () => of([{ id: 1, name: 'Test Platform', platformType: 'CONSOLE' }])
  };

  const mockUiService = {
    openGameModal: () => {}
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        PlatformGamesComponent,
        PlatformIconPipe,
        GameCardSkeletonComponent,
        GameCardComponent
      ],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: GameService, useValue: mockGameService },
        { provide: PlatformService, useValue: mockPlatformService },
        { provide: UiService, useValue: mockUiService }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlatformGamesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load games on init', () => {
    expect(component.games.length).toBe(2);
    expect(component.platformName).toBe('Test Platform');
    expect(component.totalPages).toBe(5);
  });

  it('should change page', () => {
    component.onPageChange(1);
    expect(component.currentPage).toBe(1);
    // loadGames is called, which we mocked to return data
  });

  it('should change sort order', () => {
    const event = { target: { value: 'name-asc' } } as any;
    component.onSortChange(event);
    expect(component.currentPage).toBe(0);
    // sortOrder$ emits, triggering loadGames
  });

  it('should calculate pagination numbers correctly', () => {
    component.totalPages = 10;
    component.currentPage = 4;
    component.isTotalKnown = true;

    const pages = component.getPaginationNumbers();
    // Should contain 1, ..., 3, 4, 5, 6, 7, ..., 10
    expect(pages).toContain(1);
    expect(pages).toContain(5); // current + 1
    expect(pages).toContain(10);
  });

  it('should handle unknown total pages', () => {
    component.isTotalKnown = false;
    component.totalPages = 5;
    component.currentPage = 2;

    const pages = component.getPaginationNumbers();
    // Should show pages around current page
    expect(pages.length).toBeGreaterThan(0);
  });
});
