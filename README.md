# My Barber Shop

Monorepo for the My Barber Shop SaaS: Expo mobile app, marketing site, admin dashboard, and Express API backed by Firestore.

## Quickstart

```bash
pnpm install
```

Run a single app:

```bash
pnpm --filter=@my-barber/mobile dev   # Expo on :8081
pnpm --filter=@my-barber/web dev      # Next.js on :3000
pnpm --filter=@my-barber/admin dev    # Next.js on :3001
pnpm --filter=@my-barber/api dev      # Express on :8080
```

Run everything (typecheck + lint + build) at once:

```bash
pnpm turbo run typecheck lint build
```

## Repo map

| Path | Package | Purpose |
| --- | --- | --- |
| `apps/mobile` | `@my-barber/mobile` | Expo + Shopify Restyle |
| `apps/web` | `@my-barber/web` | Marketing site (Next.js + Tailwind) |
| `apps/admin` | `@my-barber/admin` | TailAdmin-based dashboard (Next.js) |
| `backend/api` | `@my-barber/api` | Express API; deployed on Vercel |
| `packages/types` | `@my-barber/types` | Zod schemas for shared models |
| `packages/config` | `@my-barber/config` | Firebase init, env, Firestore collections, app constants |
| `packages/tsconfig` | `@my-barber/tsconfig` | Shared TS configs |
| `packages/eslint-config` | `@my-barber/eslint-config` | Shared ESLint configs |
| `packages/ui` | `@my-barber/ui` | Destination for Open Design MCP output |

## Env setup

Each app reads its env file from its own directory; the root never holds secrets.

```bash
cp backend/api/.env.example backend/api/.env
# edit backend/api/.env with real values
```

Repeat for `apps/web/.env.local`, `apps/admin/.env.local` as you add variables.

**Never commit real env files.** `.env`, `.env.development`, `.env.staging`, `.env.production`, and `.env*.local` are gitignored.

## Upstream references

- API source: https://github.com/KAMRONBEK/my-barber-api (subtree-merged at `backend/api/` on 2026-05-14)
- Admin template: https://github.com/TailAdmin/free-nextjs-admin-dashboard (copied into `apps/admin/`; MIT — see `apps/admin/ATTRIBUTION.md`)

## Deployment

Three independent Vercel projects deploy `apps/web`, `apps/admin`, and `backend/api`. Each must be created in the Vercel dashboard with its root directory set to the corresponding monorepo path, then the project IDs added as GitHub Action secrets (`VERCEL_PROJECT_ID_WEB`, `VERCEL_PROJECT_ID_ADMIN`, `VERCEL_PROJECT_ID_API`) along with shared `VERCEL_TOKEN` and `VERCEL_ORG_ID`.

The mobile app builds via EAS, triggered by tag `mobile-v*` or manually.

## Conventions

See `CLAUDE.md` for the full guide (pnpm only, Turbo for tasks, shared types policy, etc.).
