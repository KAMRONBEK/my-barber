import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { config } from '../config/config';
import { createSharedRedisRateLimitStore } from './rateLimitRedis';

const DEFAULT_MAX_FAILURES = 10;

/**
 * Slows password guessing. Only failed attempts count, and the key includes the
 * username, so people sharing one mobile-carrier IP do not lock each other out.
 * The app-wide limiter still caps the total volume per IP.
 */
export function createLoginLimiter() {
  const isTest = process.env.NODE_ENV === 'test';
  const configured = Number(process.env.AUTH_RATE_LIMIT_MAX);

  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: configured > 0 ? configured : DEFAULT_MAX_FAILURES,
    skipSuccessfulRequests: true,
    // Off in tests unless a test asks for it explicitly.
    skip: () => isTest && !(configured > 0),
    keyGenerator: req => {
      const username = String(req.body?.username ?? '')
        .toLowerCase()
        .replace(/[\s()-]/g, '');
      return `${ipKeyGenerator(req.ip ?? '')}:${req.path}:${username}`;
    },
    message: {
      ok: false,
      error: 'Too many failed attempts. Try again in 15 minutes.',
    },
    ...(config.redisUrl && !isTest
      ? {
          store: createSharedRedisRateLimitStore(
            config.redisUrl,
            'my-barber-api:rl:login:'
          ),
        }
      : {}),
  });
}
