# Plan: Enable Redis-backed rate limiting (optional rollout)

The API already supports **optional** shared rate limits via Redis. With **`REDIS_URL` unset**, behavior is unchanged: **`express-rate-limit` uses its default in-memory store** per serverless instance ([`appFactory.ts`](../appFactory.ts)). You can **stay on that indefinitely** if you accept weaker protection during bursts (see [vercel-request-flood-runbook.md](./vercel-request-flood-runbook.md)).

Use this document when you decide to turn Redis on.

## Preconditions

- Production traffic patterns roughly understood (avoid blocking legitimate users behind carrier NAT when tuning `RATE_LIMIT_MAX`).
- Client-side loops / retries under control (Redis caps abuse; it does not remove bad client behavior).

## Steps

1. **Provision Redis**
   - Prefer a **serverless-friendly** host reachable from the public internet (e.g. **Upstash**).
   - Prefer **`rediss://`** (TLS) for remote access.
   - Note connection limits and region vs Vercel deployment region (latency).

2. **Configure Vercel**
   - Project → **Environment Variables** → add **`REDIS_URL`** for **Production** (and **Preview** if you want shared limits on previews).
   - Redeploy the project so new env is picked up.

3. **Verify after deploy**
   - Check runtime logs for the startup line from [`config/config.ts`](../config/config.ts): rate limit backend should read **Redis (shared across instances)**.
   - Optionally hit the API from multiple clients / parallel requests and confirm **`429`** appears once the shared window is exceeded (respecting `RATE_LIMIT_MAX`).

4. **Operational**
   - Monitor Redis provider dashboard (memory, commands, errors).
   - If Redis is unreachable, requests using the store may fail until connectivity is restored; treat outages like any dependency (status page, rollback env var).

5. **Tuning**
   - Adjust **`RATE_LIMIT_MAX`** via env if legitimate traffic hits **`429`** too often or abuse still gets through.
   - Key prefix is **`my-barber-api:rl:`** ([`middleware/rateLimitRedis.ts`](../middleware/rateLimitRedis.ts)); changing prefix is rare unless multiple apps share one Redis.

## Rollback

- Remove **`REDIS_URL`** from Vercel (or clear value) and redeploy → falls back to **in-memory** rate limiting.

## References

- Env sample: [`.env.example`](../.env.example) (`REDIS_URL`).
- Incident context: [`vercel-request-flood-runbook.md`](./vercel-request-flood-runbook.md).
