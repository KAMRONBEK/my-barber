/* eslint-env jest */
/**
 * @jest-environment node
 */
import request from 'supertest';
import { createApp } from '../../appFactory';
import { signBarberToken, signClientToken } from '../support/authHelpers';
import { COLLECTIONS } from '../../config/database';
import { seedDoc } from '../support/mockFirestore';

jest.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: jest.fn(() =>
      Promise.reject(new Error('not a Firebase ID token'))
    ),
  }),
}));

const app = createApp();

describe('Admin API', () => {
  const prevAllow = process.env.ADMIN_UID_ALLOWLIST;
  const prevKey = process.env.ADMIN_API_KEY;

  beforeEach(() => {
    process.env.ADMIN_UID_ALLOWLIST = 'admin-b1';
    delete process.env.ADMIN_API_KEY;
  });

  afterEach(() => {
    process.env.ADMIN_UID_ALLOWLIST = prevAllow;
    process.env.ADMIN_API_KEY = prevKey;
  });

  function adminToken(): string {
    return signBarberToken('admin-b1', 'admin_user');
  }

  it('GET /admin/barbers returns 403 for valid non-admin JWT', async () => {
    const res = await request(app)
      .get('/admin/barbers')
      .set('Authorization', `Bearer ${signBarberToken('other-b', 'x')}`);
    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
  });

  it('GET /admin/barbers returns 403 for client JWT not in allowlist', async () => {
    const res = await request(app)
      .get('/admin/barbers')
      .set('Authorization', `Bearer ${signClientToken('c1', 'c')}`);
    expect(res.status).toBe(403);
  });

  it('GET /admin/barbers returns 401 without Authorization', async () => {
    const res = await request(app).get('/admin/barbers');
    expect(res.status).toBe(401);
  });

  it('GET /admin/barbers returns 200 and paginated barbers for allowlisted admin', async () => {
    seedDoc(COLLECTIONS.BARBERS, 'adm-b1', {
      id: 'adm-b1',
      username: 'u1',
      password: 'hash',
      firstName: 'A',
      lastName: 'B',
      phone: '1',
      location: { latitude: '0', longitude: '0' },
      birthDate: '1990-01-01',
      workingHours: '9-5',
      images: [],
      approvalStatus: 'pending',
    });
    const res = await request(app)
      .get('/admin/barbers')
      .query({ limit: 10, page: 0 })
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.barbers).toHaveLength(1);
    expect(res.body.data.barbers[0].password).toBeUndefined();
    expect(res.body.data.barbers[0].approvalStatus).toBe('pending');
  });

  it('PATCH /admin/barbers/:id/approval updates pending barber to approved', async () => {
    seedDoc(COLLECTIONS.BARBERS, 'adm-b2', {
      id: 'adm-b2',
      username: 'u2',
      password: 'hash',
      firstName: 'A',
      lastName: 'B',
      phone: '1',
      location: { latitude: '0', longitude: '0' },
      birthDate: '1990-01-01',
      workingHours: '9-5',
      images: [],
      approvalStatus: 'pending',
    });
    const res = await request(app)
      .patch('/admin/barbers/adm-b2/approval')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'approved', message: 'Welcome' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.approvalStatus).toBe('approved');
    expect(res.body.data.approvalMessage).toBe('Welcome');
  });

  it('PATCH /admin/barbers/:id/approval returns 400 for invalid body', async () => {
    seedDoc(COLLECTIONS.BARBERS, 'adm-b3', {
      id: 'adm-b3',
      username: 'u3',
      password: 'hash',
      firstName: 'A',
      lastName: 'B',
      phone: '1',
      location: { latitude: '0', longitude: '0' },
      birthDate: '1990-01-01',
      workingHours: '9-5',
      images: [],
      approvalStatus: 'pending',
    });
    const res = await request(app)
      .patch('/admin/barbers/adm-b3/approval')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'not-a-status' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('PATCH /admin/barbers/:id/approval returns 400 when transition is not allowed', async () => {
    seedDoc(COLLECTIONS.BARBERS, 'adm-b4', {
      id: 'adm-b4',
      username: 'u4',
      password: 'hash',
      firstName: 'A',
      lastName: 'B',
      phone: '1',
      location: { latitude: '0', longitude: '0' },
      birthDate: '1990-01-01',
      workingHours: '9-5',
      images: [],
      approvalStatus: 'invalid_state',
    });
    const res = await request(app)
      .patch('/admin/barbers/adm-b4/approval')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'approved' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Cannot change approval/);
  });

  it('GET /admin/barbers/:id returns 404 when missing', async () => {
    const res = await request(app)
      .get('/admin/barbers/does-not-exist')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });

  it('PATCH /admin/barbers/:id/approval returns 404 when barber missing', async () => {
    const res = await request(app)
      .patch('/admin/barbers/missing/approval')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ status: 'approved' });
    expect(res.status).toBe(404);
  });

  it('GET /admin/stats/summary returns counts', async () => {
    seedDoc(COLLECTIONS.BARBERS, 'st-b1', {
      id: 'st-b1',
      username: 's1',
      password: 'h',
      firstName: 'A',
      lastName: 'B',
      phone: '1',
      location: { latitude: '0', longitude: '0' },
      birthDate: '1990-01-01',
      workingHours: '9-5',
      images: [],
      approvalStatus: 'pending',
    });
    const t = new Date().toISOString();
    seedDoc(COLLECTIONS.BOOKINGS, 'st-o1', {
      id: 'st-o1',
      barberId: 'st-b1',
      clientId: 'c1',
      timestamp: t,
    });
    const res = await request(app)
      .get('/admin/stats/summary')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.barbersByApprovalStatus.pending).toBe(1);
    expect(res.body.data.bookingsLast7Days).toBeGreaterThanOrEqual(1);
  });

  it('GET/PUT /admin/content/banner roundtrip', async () => {
    const getEmpty = await request(app)
      .get('/admin/content/banner')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(getEmpty.status).toBe(200);

    const put = await request(app)
      .put('/admin/content/banner')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ title: 'Hi', active: true });
    expect(put.status).toBe(200);
    expect(put.body.data.title).toBe('Hi');

    const get2 = await request(app)
      .get('/admin/content/banner')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(get2.body.data.title).toBe('Hi');
  });
});
