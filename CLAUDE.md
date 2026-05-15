# My Barber Shop — Monorepo Conventions

## Tooling

- **Package manager:** `pnpm` only. Never use `npm` or `yarn`. The repo is pinned to `pnpm@10.33.2` via the `packageManager` field.
- **Task runner:** `turbo`. Use `pnpm turbo run <task>` for cross-package work (`build`, `dev`, `lint`, `typecheck`, `test`, `clean`).
- **Node:** 20.x (see `.nvmrc`).
- **pnpm linker:** `hoisted` (root `.npmrc` and `pnpm-workspace.yaml` agree). Required for Expo Metro to resolve symlinked workspace packages. Do not flip back to `isolated` without re-testing the mobile app.

## Layout

```
apps/
  mobile/        @my-barber/mobile        Expo SDK 54 + Shopify Restyle
  web/           @my-barber/web           Next.js 16 + Tailwind v4 (landing, privacy, terms)
  admin/         @my-barber/admin         TailAdmin-based Next.js dashboard (port 3001)
packages/
  tsconfig/      @my-barber/tsconfig      base / node / nextjs / react-native variants
  eslint-config/ @my-barber/eslint-config base / next / expo / node presets
  types/         @my-barber/types         Zod schemas + inferred TS types
  config/        @my-barber/config        env loader, Firebase admin, Firestore collections, app constants
  ui/            @my-barber/ui            empty; destination for Open Design MCP output
backend/
  api/           @my-barber/api           Express + Firestore API deployed on Vercel
.claude/agents/                            project-scoped Claude Code agents (empty for now)
.github/workflows/                         CI + per-app deploy workflows
```

## Important nuances

- **`backend/api/` is an Express API, not Firebase Cloud Functions.** It is deployed to Vercel (`api.my-barber.uz` production, `staging-api.my-barber.uz` staging). It uses `firebase-admin` only as a Firestore SDK; there is no Firebase Functions deployment.
- **Auth is custom JWT + bcrypt.** `firebase-admin` is *not* used to verify Firebase Auth ID tokens. A migration to Firebase Auth is planned but has not been executed — do not assume Firebase Auth is in use.
- **Shared types live in `@my-barber/types`.** Import — do not redefine. Source of truth for API contracts.
- **Firestore collection names live in `@my-barber/config/firestore-collections`.** Import the `COLLECTIONS` const — never hardcode collection names.
- **Firebase Admin initialization** goes through `getFirebaseAdmin()` in `@my-barber/config/firebase`. Don't call `initializeApp` directly outside that helper.

## Env files

- `.env.example` is committed and lists every variable. Real env files (`.env`, `.env.development`, `.env.staging`, `.env.production`, `.env*.local`) are gitignored and must never be committed.
- **2026-05-14 incident:** real keys (Firebase service account, JWT secret, AWS S3, Expo push token) were committed in the upstream `KAMRONBEK/my-barber-api` repo. Those keys must be rotated in every provider; assume they are public.

## Commit & PR conventions

- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `ci:`. Scope is optional: `chore(api): …`, `fix(mobile): …`.
- Keep monorepo-wide changes (root config, shared packages, CI) in their own commits; app-specific changes scoped per app.

## Working in this repo

- New shared types or schemas → `packages/types`.
- New Firestore collection → add the name to `packages/config/src/firestore-collections.ts`.
- New Firebase env var → add to `packages/config/src/env.ts` AND to `backend/api/.env.example`.
- Open Design MCP generates components into `packages/ui/`. Do not hand-edit `packages/ui/` until the first generation has landed.

## QA test accounts

Seeded in every environment (staging + production). Use for manual testing from the mobile app or Swagger UI.

| Role   | Username           | Password      |
|--------|--------------------|---------------|
| Barber | `barber@test.local` | `DevTest12345` |
| Client | `client@test.local` | `DevTest12345` |

The barber account has `approvalStatus: approved` so it is immediately usable. To re-seed a fresh environment run `pnpm --filter @my-barber/api seed`.

## Verification

```bash
pnpm install --frozen-lockfile
pnpm turbo run typecheck
pnpm turbo run lint
pnpm turbo run build
```

Per-app dev: `pnpm --filter=@my-barber/<app> dev`.
