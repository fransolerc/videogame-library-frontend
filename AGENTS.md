# AGENTS.md

Frontend for **GameLibrary** (video game library). Angular 22, standalone components, zoneless (no `zone.js`), tests with Vitest through `ng test`.

Backend lives in a separate repo (Spring Boot 4.1.2, hexagonal architecture). The API contract is `src/main/resources/api/openapi.yaml` in that repo. Base URL comes from `environment.apiUrl`.

## Commands

| Task | Command |
|:--|:--|
| Dev server | `npm start` |
| Production build | `npm run build` |
| Unit tests | `npm test` |
| Migrations | `ng generate @angular/core:<schematic>` |

`src/environments/environment.ts` is git-ignored. Copy it from `environment.example.ts`. Never commit secrets.

## Angular conventions

Target state. Some files still use the old style (see "Migration status"); do not copy those patterns into new code.

- Use `inject()`, not constructor injection. Prefer `private readonly x = inject(X)`.
- Use `input()`, `input.required()`, `output()`, `model()`, `viewChild()` / `viewChildren()`. No `@Input`, `@Output`, `@ViewChild`, `@HostListener`/`@HostBinding` in new code.
- Component state is `signal()` / `computed()` / `linkedSignal()`. Async data from HTTP: prefer `resource()` or `toSignal()`.
- Do not call `ChangeDetectorRef.detectChanges()` to fix stale views. If a view is stale, the state is not a signal.
- Built-in control flow only (`@if`, `@for` with `track`, `@switch`). No `*ngIf` / `*ngFor`.
- Do not import `CommonModule`. Import only the pipes/directives actually used (`AsyncPipe`, `DatePipe`, `DecimalPipe`...).
- Guards and interceptors are functional (`CanActivateFn`, `HttpInterceptorFn`).
- No NgModules. No `zone.js`. No `localStorage` access outside `AuthService`.
- Reactive forms are acceptable; check `@angular/forms/signals` before starting a new form.
- UI text is Spanish. Identifiers are English.

## Workflow for agents

1. Before writing Angular code, load the version-aligned rules: Angular CLI MCP `get_best_practices`, and use `search_documentation` instead of relying on memory (Angular 22 is newer than most model training data).
2. Activate the `angular-developer` skill for components, services, forms, routing, testing.
3. After every change run `npm run build` and `npm test` (MCP: `run_target`). Do not report a task as done without both passing.
4. Keep diffs small. One migration schematic per commit.

## Migration status

Done: standalone components, built-in control flow, lazy routes, Vitest.

Pending (run in this order, one commit each, review the diff, run tests):

1. `ng generate @angular/core:inject`
2. `ng generate @angular/core:signal-input-migration --insert-todos`
3. `ng generate @angular/core:output-migration`
4. `ng generate @angular/core:signal-queries-migration`
5. `ng generate @angular/core:cleanup-unused-imports`
6. Manual: replace `ChangeDetectorRef` + plain fields with signals; convert `AuthGuard` to a functional guard.

Check the exact schematic names in `https://angular.dev/reference/migrations`.

Known debt:

- `StatisticsService` appears unused (statistics are computed client-side in `StatisticsComponent`) and points to an analytics service on `:8081` that is not part of this stack. Confirm and delete.
- `@angular/animations` and `platform-browser-dynamic` are deprecated; they are only kept because `@swimlane/ngx-charts` requires them.

## Commits

- Written in English.
- Markdown format: short imperative subject (max 72 chars), blank line, body as a bullet list explaining what and why.
- One logical change per commit.

```markdown
Migrate components to signal inputs

- Run `signal-input-migration` over `src/app`
- Update templates and specs to call the signals
- Skipped inputs are marked with TODOs
```
