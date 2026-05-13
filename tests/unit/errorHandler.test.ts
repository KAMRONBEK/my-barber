/* eslint-env jest */
import { Request, Response } from 'express';
import {
  errorHandler,
  createApiError,
  ApiError,
} from '../../middleware/errorHandler';

function fakeReq(): Request {
  return {
    url: '/x',
    method: 'GET',
    ip: '127.0.0.1',
    get: (_h: string) => undefined,
    body: { foo: 'bar' },
  } as unknown as Request;
}

function fakeRes(): { res: Response; sent: { status?: number; body?: unknown } } {
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

describe('errorHandler middleware', () => {
  it('uses statusCode from ApiError', () => {
    const err = createApiError('forbidden', 403);
    const { res, sent } = fakeRes();
    errorHandler(err, fakeReq(), res, () => undefined);
    expect(sent.status).toBe(403);
    expect(sent.body).toMatchObject({ ok: false, error: 'forbidden' });
  });

  it('maps ValidationError to 400', () => {
    const err: ApiError = new Error('bad input');
    err.name = 'ValidationError';
    const { res, sent } = fakeRes();
    errorHandler(err, fakeReq(), res, () => undefined);
    expect(sent.status).toBe(400);
    expect(sent.body).toMatchObject({ error: 'bad input' });
  });

  it('maps CastError to 400 with generic message', () => {
    const err: ApiError = new Error('whatever');
    err.name = 'CastError';
    const { res, sent } = fakeRes();
    errorHandler(err, fakeReq(), res, () => undefined);
    expect(sent.status).toBe(400);
    expect(sent.body).toMatchObject({ error: 'Invalid ID format' });
  });

  it('maps duplicate key error to 409', () => {
    const err: ApiError = new Error('duplicate key in collection');
    const { res, sent } = fakeRes();
    errorHandler(err, fakeReq(), res, () => undefined);
    expect(sent.status).toBe(409);
  });

  it('maps Unexpected token JSON to 400', () => {
    const err: ApiError = new Error('Unexpected token < in JSON at position 0');
    const { res, sent } = fakeRes();
    errorHandler(err, fakeReq(), res, () => undefined);
    expect(sent.status).toBe(400);
  });

  it('maps "request entity too large" to 413', () => {
    const err: ApiError = new Error('request entity too large');
    const { res, sent } = fakeRes();
    errorHandler(err, fakeReq(), res, () => undefined);
    expect(sent.status).toBe(413);
  });

  it('falls back to 500 with generic message', () => {
    const err: ApiError = new Error('something');
    const { res, sent } = fakeRes();
    errorHandler(err, fakeReq(), res, () => undefined);
    expect(sent.status).toBe(500);
    expect(sent.body).toMatchObject({ error: 'Internal Server Error' });
  });

  it('createApiError sets isOperational and statusCode', () => {
    const err = createApiError('boom');
    expect(err.statusCode).toBe(500);
    expect(err.isOperational).toBe(true);
  });
});
