import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { PlatformGamesComponent } from './platform-games/platform-games.component';
import { PlatformListComponent } from './platform-list/platform-list.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: 'platforms', component: PlatformListComponent },
  { path: 'platforms/:id', component: PlatformGamesComponent },
  { path: '**', redirectTo: '' }
];
