import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    type: 'barber' | 'client';
  };
}

export interface JWTPayload {
  id: string;
  username: string;
  type: 'barber' | 'client';
  iat?: number;
  exp?: number;
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        ok: false,
        error: 'Authorization header is required',
      });
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({
        ok: false,
        error: 'Token is required',
      });
    }

    const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
    req.user = {
      id: decoded.id,
      username: decoded.username,
      type: decoded.type,
    };

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        ok: false,
        error: 'Invalid token',
      });
    }

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        ok: false,
        error: 'Token expired',
      });
    }

    return res.status(500).json({
      ok: false,
      error: 'Internal server error',
    });
  }
};

// Optional auth - doesn't fail if no token provided
export const optionalAuthMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const token = authHeader.split(' ')[1];

      if (token) {
        const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
        req.user = {
          id: decoded.id,
          username: decoded.username,
          type: decoded.type,
        };
      }
    }

    next();
  } catch (error) {
    logger.warn('Optional auth middleware error:', error);
    next();
  }
};

// Export alias for compatibility
export const authenticateToken = authMiddleware;
