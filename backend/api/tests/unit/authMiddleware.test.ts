/* eslint-env jest */
import jwt from 'jsonwebtoken';
import { Response, NextFunction } from 'express';
import {
  authMiddleware,
  optionalAuthMiddleware,
  AuthRequest,
} from '../../middleware/auth';
import { config } from '../../config/config';

function makeReq(authHeader?: string): AuthRequest {
  return { headers: { authorization: authHeader } } as unknown as AuthRequest;
}

function makeRes(): { res: Response; sent: { status?: number; body?: unknown } } {
  const sent: { status?: number; body?: unknown } = {};
  const res = {
    status(code: number) {
      sent.status = code;
      return this;
    },
    json(body: unknown) {
      sent.body = body;
      return this;
    },
  } as unknown as Response;
  return { res, sent };
}

describe('authMiddleware', () => {
  it('returns 401 when Authorization header is missing', () => {
    const next = jest.fn() as unknown as NextFunction;
    const { res, sent } = makeRes();
    authMiddleware(makeReq(undefined), res, next);
    expect(sent.status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token part is missing', () => {
    const next = jest.fn() as unknown as NextFunction;
    const { res, sent } = makeRes();
    authMiddleware(makeReq('Bearer '), res, next);
    expect(sent.status).toBe(401);
  });

  it('returns 401 for malformed JWT', () => {
    const next = jest.fn() as unknown as NextFunction;
    const { res, sent } = makeRes();
    authMiddleware(makeReq('Bearer not-a-jwt'), res, next);
    expect(sent.status).toBe(401);
  });

  it('attaches user and calls next for valid JWT', () => {
    const token = jwt.sign(
      { id: 'u1', username: 'u', type: 'barber' },
      config.jwtSecret
    );
    const req = makeReq(`Bearer ${token}`);
    const next = jest.fn() as unknown as NextFunction;
    const { res } = makeRes();

    authMiddleware(req, res, next);
    expect(req.user).toEqual({ id: 'u1', username: 'u', type: 'barber' });
    expect(next).toHaveBeenCalled();
  });
});

describe('optionalAuthMiddleware', () => {
  it('continues without user when header missing', () => {
    const req = makeReq(undefined);
    const next = jest.fn() as unknown as NextFunction;
    const { res } = makeRes();

    optionalAuthMiddleware(req, res, next);
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('attaches user for valid token', () => {
    const token = jwt.sign(
      { id: 'u2', username: 'u2', type: 'client' },
      config.jwtSecret
    );
    const req = makeReq(`Bearer ${token}`);
    const next = jest.fn() as unknown as NextFunction;
    const { res } = makeRes();

    optionalAuthMiddleware(req, res, next);
    expect(req.user?.id).toBe('u2');
    expect(next).toHaveBeenCalled();
  });

  it('continues silently when token is invalid', () => {
    const req = makeReq('Bearer not-valid');
    const next = jest.fn() as unknown as NextFunction;
    const { res } = makeRes();

    optionalAuthMiddleware(req, res, next);
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});
