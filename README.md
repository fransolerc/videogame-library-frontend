# Videogame Library Frontend

Responsive web application to discover video games and manage a personal library. Built with Angular (standalone components, zoneless change detection) on top of the **Video Game Library Backend** REST API, which lives in a separate repository.

## Features

- **Discovery:** latest releases and top-rated games on the home page.
- **Search:** live search by name (minimum 3 characters) with sorting and platform filter.
- **Platforms:** browse platforms grouped by generation, then browse each platform's games with pagination.
- **Game details:** modal with description, storyline, screenshot gallery and videos.
- **Accounts:** registration and login (JWT).
- **Personal library:** track games as *Want to play*, *Playing* or *Completed*, and mark favorites.
- **Statistics:** charts of favorite platforms, genres and release years, computed client-side from your favorites.
- **Responsive UI** for desktop and mobile. The interface text is in Spanish.

## Requirements

- **Node.js** `^22.22.3`, `^24.15.0` or `>=26`
- **npm** 11
- The backend running and reachable (default `http://localhost:8080`)

## Getting started

```bash
npm install
cp src/environments/environment.example.ts src/environments/environment.ts
```

`src/environments/environment.ts` is git-ignored. Set `apiUrl` to your backend:

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080'
};
```

Start the backend first, then:

```bash
npm start
```

Open `http://localhost:4200/`. The dev server listens on `0.0.0.0`, so it is reachable from other devices on your network. If you open the app from another origin, add it to `CORS_ALLOWED_ORIGINS` in the backend.

## Scripts

| Command | Description |
|:--|:--|
| `npm start` | Dev server with live reload |
| `npm run build` | Production build into `dist/` |
| `npm run watch` | Development build in watch mode |
| `npm test` | Unit tests with Vitest (watch mode, coverage enabled) |
| `npm test -- --no-watch` | Single test run |

Coverage reports (HTML and lcov) are written to `coverage/`.

## Routes

| Path | Description | Access |
|:--|:--|:--|
| `/` | Home: latest, top rated and search | Public |
| `/platforms` | Platforms grouped by generation | Public |
| `/platforms/:id` | Games of a platform | Public |
| `/library` | Personal library and statistics | Requires login |

## Project structure

```
src/app
├── core            Services, interceptors, guards and utilities
├── shared          Models, pipes and shared components (toasts)
├── home            Home page and search
├── library         Personal library
├── statistics      Charts for favorites
├── platform-list   Platforms grouped by generation
├── platform-games  Games of one platform, paginated
├── game-detail-modal   Game details modal
├── game-card, game-card-horizontal, *-skeleton   Reusable cards and loading placeholders
├── auth, auth-widget   Login, registration and navbar widget
└── app.*           Root component and navigation
```

## Authentication

The JWT returned by the backend is stored in `localStorage` (`jwt_token`, `auth_user`) and attached to every request by `authInterceptor`. Storing tokens in `localStorage` is exposed to XSS; keep third-party scripts to a minimum.

## Stack

Angular, RxJS, [`@swimlane/ngx-charts`](https://github.com/swimlane/ngx-charts), [`@justinribeiro/lite-youtube`](https://github.com/justinribeiro/lite-youtube) and Vitest. Exact versions are in `package.json`.

## Working with AI coding agents

Conventions, the migration plan and the checks to run after every change are in [`AGENTS.md`](AGENTS.md). `CLAUDE.md` imports it for Claude Code.
