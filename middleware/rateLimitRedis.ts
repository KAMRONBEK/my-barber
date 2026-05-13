import { createClient } from 'redis';
import { RedisStore } from 'rate-limit-redis';
import type { RedisReply } from 'rate-limit-redis';

import { logger } from '../utils/logger';

/** Narrow surface for rate-limit-redis; avoids brittle RedisClientType generic merges in TS. */
type CommandRedis = {
  connect(): Promise<void>;
  sendCommand(args: string[]): Promise<unknown>;
  on(event: 'error', listener: (err: Error) => void): void;
};

let client: CommandRedis | undefined;
let connecting: Promise<void> | undefined;

function startRedis(url: string): Promise<void> {
  if (!connecting) {
    const c = createClient({ url }) as unknown as CommandRedis;
    client = c;
    c.on('error', err =>
      logger.error('Redis rate-limit client error:', err.message)
    );
    connecting = c.connect().then(() => {
      logger.info('Redis connected for shared rate limiting');
    });
  }
  return connecting;
}

/**
 * Redis-backed store for express-rate-limit so counts are shared across Vercel serverless instances.
 * Omit REDIS_URL to fall back to default in-memory store (not shared between lambdas).
 */
export function createSharedRedisRateLimitStore(redisUrl: string): RedisStore {
  return new RedisStore({
    prefix: 'my-barber-api:rl:',
    sendCommand: (...args: string[]) =>
      startRedis(redisUrl).then(
        () => client!.sendCommand(args) as Promise<RedisReply>
      ),
  });
}
