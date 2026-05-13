/* eslint-env jest */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { barberApprovalGate } from '../../middleware/barberApprovalGate';
import { COLLECTIONS } from '../../config/database';
import { seedDoc } from '../support/mockFirestore';

function makeReq(
  user: AuthRequest['user'],
  path = '/bookings'
): AuthRequest {
  return { user, path } as AuthRequest;
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

describe('barberApprovalGate', () => {
  it('passes through for non-barber users', async () => {
    const next = jest.fn() as unknown as NextFunction;
    const { res } = makeRes();
    await barberApprovalGate(
      makeReq({ id: 'c1', username: 'c', type: 'client' }),
      res,
      next
    );
    expect(next).toHaveBeenCalled();
  });

  it('passes through for whitelisted paths even without approval', async () => {
    seedDoc(COLLECTIONS.BARBERS, 'b1', {
      id: 'b1',
      approvalStatus: 'pending',
    });
    const next = jest.fn() as unknown as NextFunction;
    const { res } = makeRes();
    await barberApprovalGate(
      makeReq({ id: 'b1', username: 'b', type: 'barber' }, '/getMe'),
      res,
      next
    );
    expect(next).toHaveBeenCalled();
  });

  it('blocks pending barber for non-whitelisted path', async () => {
    seedDoc(COLLECTIONS.BARBERS, 'b2', {
      id: 'b2',
      approvalStatus: 'pending',
    });
    const next = jest.fn() as unknown as NextFunction;
    const { res, sent } = makeRes();
    await barberApprovalGate(
      makeReq({ id: 'b2', username: 'b', type: 'barber' }),
      res,
      next
    );
    expect(sent.status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows approved barber on protected path', async () => {
    seedDoc(COLLECTIONS.BARBERS, 'b3', {
      id: 'b3',
      approvalStatus: 'approved',
    });
    const next = jest.fn() as unknown as NextFunction;
    const { res } = makeRes();
    await barberApprovalGate(
      makeReq({ id: 'b3', username: 'b', type: 'barber' }),
      res,
      next
    );
    expect(next).toHaveBeenCalled();
  });

  it('treats missing barber doc as approved (default)', async () => {
    const next = jest.fn() as unknown as NextFunction;
    const { res, sent } = makeRes();
    await barberApprovalGate(
      makeReq({ id: 'ghost', username: 'g', type: 'barber' }),
      res,
      next
    );
    expect(sent.status).toBe(undefined);
    expect(next).toHaveBeenCalled();
  });
});
