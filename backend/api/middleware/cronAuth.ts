/**
 * Auth for `/cron/*`, a machine-to-machine surface hit by a scheduler (Vercel Cron
 * or an external scheduler such as a GitHub Actions cron workflow).
 *
 * Deliberately a separate secret from `ADMIN_API_KEY` (`middleware/adminAuth.ts`) —
 * different threat model and rotation cadence, and keeps the endpoint callable by
 * any scheduler regardless of Vercel Cron's plan-tier granularity.
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config/config';

export function cronAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!config.cronApiKey) {
    res.status(503).json({ ok: false, error: 'Cron endpoint not configured' });
    return;
  }

  const apiKey = req.get('X-Cron-Api-Key');
  if (apiKey !== config.cronApiKey) {
    res.status(401).json({ ok: false, error: 'Invalid cron credentials' });
    return;
  }

  next();
}
