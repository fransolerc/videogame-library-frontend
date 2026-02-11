import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    pathMatch: 'full'
  },
  {
    path: 'platforms',
    loadComponent: () => import('./platform-list/platform-list.component').then(m => m.PlatformListComponent)
  },
  {
    path: 'platforms/:id',
    loadComponent: () => import('./platform-games/platform-games.component').then(m => m.PlatformGamesComponent)
  },
  {
    path: 'library',
    loadComponent: () => import('./library/library.component').then(m => m.LibraryComponent),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
