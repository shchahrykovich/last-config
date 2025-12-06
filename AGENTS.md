# Repository Guidelines

## Project Structure & Module Organization
Source lives in `src/`: App Router routes under `app/`, shared UI in `components/`, domain workflows in `services/`, and adapters/utilities in `infrastructure/` and `lib/`. `src/middleware.ts` handles API-key auth and tenant routing. Prisma schema plus migrations stay in `prisma/`; apply them before API or worker tests. Cloudflare wiring (`wrangler.jsonc`, `open-next.config.ts`, `cloudflare-env.d.ts`, `worker-configuration.d.ts`) lives at the repo root. Tests mirror the source tree inside `tests/` (e.g., `tests/services/feature-flags/feature-flags.test.ts`).

## Build, Test, and Development Commands
- `npm run dev` – Next.js dev server (Turbopack).
- `npm run build` – Production bundle; pair with `npm run start` for smoke checks.
- `npm run deploy` – Runs `db:migrations:apply`, builds via OpenNext, and deploys with Wrangler.
- `npm run deploy-from-local` – Manual OpenNext build + deploy; `npm run preview` emulates the worker locally.
- `npm run lint` and `npm run cf-typegen` – Run before PRs to keep lint rules and bindings aligned.

## Coding Style & Naming Conventions
Code is TypeScript-first with React Server Components, so use `.ts/.tsx` and two-space indentation. Apply PascalCase to components (and their files), camelCase to variables/functions, and suffix new service modules with `-service.ts`. Follow `eslint.config.mjs`, keep route folders idiomatic to the App Router, and prefer explicit return types on exported helpers so workers and tests stay type-safe.

## Testing Guidelines
Vitest with `@cloudflare/vitest-pool-workers` runs the suite: `npm test` for CI, `npm run test:watch` while iterating, `npm run test:coverage` before refactors. Specs reside in `tests/**/*.test.ts`. Call `applyMigrations()` from `tests/helpers/db-setup.ts`, instantiate `PrismaClient` with the D1 adapter, seed multiple tenants, and assert isolation plus permission boundaries. After each write, re-query the database and finish with `afterAll` cleanup that deletes tenant-scoped data.

## Commit & Pull Request Guidelines
Commits use short, imperative subjects (see `git log` entries like \"Added tests\") and should mention why the change exists. Pull requests need a succinct summary, evidence of `npm test` (plus UI screenshots when applicable), migration notes, and callouts for API-key scope or tenant-isolation effects. Link the relevant issue card and clearly flag breaking changes or new config.

## Security & Configuration Tips
Never commit secrets; store them through `wrangler secret put` and document required bindings in `wrangler.jsonc`. API keys follow `sk_{public}_{private}` or `pk_{public}`—mask the private portion in logs, fixtures, and PRs. Generate `AUTH_SECRET` via `openssl rand -hex 32` whenever a new environment spins up, and rerun `npm run cf-typegen` after tweaking bindings so gaps are caught in review.
