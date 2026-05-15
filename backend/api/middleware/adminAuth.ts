/**
 * Admin authentication for `/admin/*`.
 *
 * **Production (preferred):** `Authorization: Bearer <Firebase ID token>` from the client app.
 * Set custom claims on staff users via Firebase Admin SDK:
 *   `admin.auth().setCustomUserClaims(uid, { admin: true })` or `{ role: 'admin' }`.
 * The server verifies the token with `verifyIdToken` and checks `admin === true` or `role === 'admin'`.
 *
 * **Bootstrap / tests / dev without claims:** `Authorization: Bearer <app JWT>` whose subject `id`
 * is listed in `ADMIN_UID_ALLOWLIST` (comma-separated UIDs matching JWT `id`).
 *
 * **Scripts only:** if `ADMIN_API_KEY` is set, `X-Admin-Api-Key: <same value>` is accepted.
 * Do not expose this key to mobile or web clients.
 *
 * **Never** ship service account keys to clients; this middleware only uses server-side config.
 *
 * Do not stack `authMiddleware` before this route: app JWT validation would reject Firebase ID tokens.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getAuth } from 'firebase-admin/auth';
import { config } from '../config/config';
import { JWTPayload } from './auth';
import { logger } from '../utils/logger';

/** Request after successful admin auth */
export interface AdminAuthRequest extends Request {
  adminAuth: {
    subjectId: string;
    source: 'firebase_claims' | 'jwt_allowlist' | 'api_key';
  };
}

function isFirebaseAdminClaims(decoded: Record<string, unknown>): boolean {
  if (decoded.admin === true) return true;
  if (decoded.role === 'admin') return true;
  return false;
}

export async function adminAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = req.get('X-Admin-Api-Key');
    if (config.adminApiKey && apiKey === config.adminApiKey) {
      (req as AdminAuthRequest).adminAuth = {
        subjectId: 'api_key',
        source: 'api_key',
      };
      next();
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({
        ok: false,
        error: 'Authorization header is required',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({
        ok: false,
        error: 'Token is required',
      });
      return;
    }

    try {
      const decoded = await getAuth().verifyIdToken(token);
      const raw = decoded as unknown as Record<string, unknown>;
      if (isFirebaseAdminClaims(raw)) {
        (req as AdminAuthRequest).adminAuth = {
          subjectId: decoded.uid,
          source: 'firebase_claims',
        };
        next();
        return;
      }
      res.status(403).json({
        ok: false,
        error: 'Admin privileges required',
      });
      return;
    } catch (firebaseErr) {
      // Not a Firebase ID token (or invalid): try app JWT + allowlist
      logger.debug('Admin auth: Firebase verify failed, trying JWT allowlist', {
        err:
          firebaseErr instanceof Error
            ? firebaseErr.message
            : String(firebaseErr),
      });
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
      const allow = new Set(config.adminUidAllowlist);
      if (allow.has(decoded.id)) {
        (req as AdminAuthRequest).adminAuth = {
          subjectId: decoded.id,
          source: 'jwt_allowlist',
        };
        next();
        return;
      }
      res.status(403).json({
        ok: false,
        error: 'Admin privileges required',
      });
      return;
    } catch (jwtErr) {
      if (jwtErr instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          ok: false,
          error: 'Token expired',
        });
        return;
      }
      if (jwtErr instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          ok: false,
          error: 'Invalid token',
        });
        return;
      }
      throw jwtErr;
    }
  } catch (error) {
    logger.error('adminAuthMiddleware error:', error);
    res.status(500).json({
      ok: false,
      error: 'Internal server error',
    });
  }
}
