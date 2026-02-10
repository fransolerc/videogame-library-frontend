import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { PlatformGamesComponent } from './platform-games/platform-games.component';
import { PlatformListComponent } from './platform-list/platform-list.component';
import { LibraryComponent } from './library/library.component';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: 'platforms', component: PlatformListComponent },
  { path: 'platforms/:id', component: PlatformGamesComponent },
  {
    path: 'library',
    component: LibraryComponent,
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: '' }
];
