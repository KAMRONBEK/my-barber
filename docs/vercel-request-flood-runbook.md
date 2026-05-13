# Runbook: request storms / Vercel overrun

Use this when traffic spikes (for example a buggy client infinite rerender loop) and Vercel observability shows massive load on [`server.ts`](https://vercel.com/docs/concepts/functions/serverless-functions).

## Why the API alone cannot fully stop storms

On Vercel, **each HTTP request can run in a separate serverless instance**. [`express-rate-limit`](https://github.com/express-rate-limit/express-rate-limit)’s **default store is in-memory**. Each instance keeps its own counters, so the effective ceiling is **much higher** than `RATE_LIMIT_MAX` requests per 15 minutes “per IP” would suggest.

**Mitigation in this repo:** set **`REDIS_URL`** in production/staging so rate limits use **Redis** (`rate-limit-redis` in [`appFactory.ts`](../appFactory.ts)). Counters are then shared across instances.

## 1. Identify the source (logs / observability)

In Vercel: **Project → Observability** (or Runtime Logs). Filter the incident window by:

- **Route / path** — which endpoints spike?
- **HTTP status** — mostly `200`, `401`, `429`, `5xx`?
- **User-Agent** — Expo / React Native vs browser vs script?
- **Client IP** — single IP, small set, or widely distributed?

Correlate with your **mobile/web release** timeline (OTA, store build, web deploy).

## 2. Client remediation (root cause)

Ship as soon as possible:

- **Rollback** the bad client build (fastest), or patch and release.
- Audit **effects** that call the API: dependency arrays, navigation loops, **React Query** `refetchInterval` / `refetchOnWindowFocus`, auth **token refresh** recursion.
- Cancel **in-flight** requests on unmount (`AbortController`).

The API can throttle abuse but **cannot fix** a tight client loop; invocations still cost until the client stops.

## 3. Platform containment (Vercel)

Manual steps in the Vercel dashboard:

- **Firewall / IP blocking** — temporary block for known abusive IPs (Hobby has a small [IP block allowance](https://vercel.com/docs/accounts/plans/hobby)).
- **Pause or gate deployments** if needed until the bad client is gone.
- **Usage** — monitor Function invocations vs [Hobby included usage](https://vercel.com/docs/accounts/plans/hobby). Hobby does not bill like Pro; overages may mean **restricted usage until usage rolls off** (~30-day behavior per Vercel docs).

**Alerts:** Full spend alerts are a **Pro** concern; on Hobby, rely on periodic dashboard checks after incidents.

## 4. Configuration checklist

| Variable | Purpose |
| -------- | ------- |
| `REDIS_URL` | Shared rate limit store (`rediss://` for TLS providers such as Upstash). |
| `RATE_LIMIT_MAX` | Max requests per IP per 15 minutes (default: production `100`). |

After adding Redis, confirm startup logs show **Redis (shared across instances)** (see [`config/config.ts`](../config/config.ts)).

## 5. Post-incident

- Confirm **`REDIS_URL`** is set on Production (and Preview if applicable).
- Optionally tighten **`RATE_LIMIT_MAX`** after observing legitimate peak traffic (balance vs carrier NAT shared IPs).
- Open a **Vercel support** ticket if you need clarification on account restrictions after a spike.
