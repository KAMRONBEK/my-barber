/* eslint-env jest */
import request from 'supertest';
import { createApp } from '../../appFactory';
import { COLLECTIONS } from '../../config/database';
import { seedDoc } from '../support/mockFirestore';
import { signBarberToken, signClientToken } from '../support/authHelpers';

const app = createApp();

function seedApprovedBarber(id: string, username = `b_${id}`) {
  seedDoc(COLLECTIONS.BARBERS, id, {
    id,
    username,
    password: 'x',
    firstName: 'B',
    lastName: 'B',
    phone: '+998901234567',
    location: { latitude: '0', longitude: '0' },
    birthDate: '1990-01-01',
    workingHours: '9-5',
    images: [],
    approvalStatus: 'approved',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function seedClient(id: string, username = `c_${id}`) {
  seedDoc(COLLECTIONS.CLIENTS, id, {
    id,
    username,
    password: 'x',
    firstName: 'C',
    lastName: 'C',
    phone: '+998901234567',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function seedBooking(
  id: string,
  barberId: string,
  clientId: string,
  status: string
) {
  seedDoc(COLLECTIONS.BOOKINGS, id, {
    id,
    barberId,
    clientId,
    timestamp: new Date().toISOString(),
    status,
    declineReason: null,
    cancellationReason: null,
    previousTimestamp: null,
    cancelledBy: null,
    completedAt: null,
    serviceTotal: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('barber booking operations - error paths', () => {
  const barberId = 'epb';
  const clientId = 'epc';

  beforeEach(() => {
    seedApprovedBarber(barberId);
    seedClient(clientId);
  });

  describe('POST /barber/bookings/:bookingId/cancel', () => {
    it('returns 403 for client token', async () => {
      const token = signClientToken(clientId);
      await request(app)
        .post('/barber/bookings/any/cancel')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('returns 404 when booking is missing', async () => {
      const token = signBarberToken(barberId);
      await request(app)
        .post('/barber/bookings/no-such/cancel')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('returns 409 when booking is not active', async () => {
      seedBooking('o-c-completed', barberId, clientId, 'completed');
      const token = signBarberToken(barberId);
      await request(app)
        .post('/barber/bookings/o-c-completed/cancel')
        .set('Authorization', `Bearer ${token}`)
        .expect(409);
    });
  });

  describe('POST /barber/bookings/:bookingId/reschedule', () => {
    it('returns 403 for client token', async () => {
      const token = signClientToken(clientId);
      await request(app)
        .post('/barber/bookings/any/reschedule')
        .set('Authorization', `Bearer ${token}`)
        .send({ timestamp: '2099-01-01T00:00:00.000Z' })
        .expect(403);
    });

    it('returns 404 when booking is missing', async () => {
      const token = signBarberToken(barberId);
      await request(app)
        .post('/barber/bookings/no-such/reschedule')
        .set('Authorization', `Bearer ${token}`)
        .send({ timestamp: '2099-01-01T00:00:00.000Z' })
        .expect(404);
    });

    it('returns 409 for completed booking', async () => {
      seedBooking('o-r-completed', barberId, clientId, 'completed');
      const token = signBarberToken(barberId);
      await request(app)
        .post('/barber/bookings/o-r-completed/reschedule')
        .set('Authorization', `Bearer ${token}`)
        .send({ timestamp: '2099-01-01T00:00:00.000Z' })
        .expect(409);
    });

    it('returns 400 on invalid timestamp', async () => {
      seedBooking('o-r-bad', barberId, clientId, 'confirmed');
      const token = signBarberToken(barberId);
      await request(app)
        .post('/barber/bookings/o-r-bad/reschedule')
        .set('Authorization', `Bearer ${token}`)
        .send({ timestamp: 'nope' })
        .expect(400);
    });
  });

  describe('POST /barber/bookings/:bookingId/no-show', () => {
    it('returns 403 for client token', async () => {
      const token = signClientToken(clientId);
      await request(app)
        .post('/barber/bookings/any/no-show')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('returns 404 when booking is missing', async () => {
      const token = signBarberToken(barberId);
      await request(app)
        .post('/barber/bookings/no-such/no-show')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('returns 409 on pending booking', async () => {
      seedBooking('o-ns-pending', barberId, clientId, 'pending_confirmation');
      const token = signBarberToken(barberId);
      await request(app)
        .post('/barber/bookings/o-ns-pending/no-show')
        .set('Authorization', `Bearer ${token}`)
        .expect(409);
    });
  });

  describe('POST /barber/bookings/:bookingId/complete', () => {
    it('returns 403 for client token', async () => {
      const token = signClientToken(clientId);
      await request(app)
        .post('/barber/bookings/any/complete')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('returns 404 when booking is missing', async () => {
      const token = signBarberToken(barberId);
      await request(app)
        .post('/barber/bookings/no-such/complete')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('returns 409 on declined booking', async () => {
      seedBooking('o-cmp-decl', barberId, clientId, 'declined');
      const token = signBarberToken(barberId);
      await request(app)
        .post('/barber/bookings/o-cmp-decl/complete')
        .set('Authorization', `Bearer ${token}`)
        .expect(409);
    });
  });

  describe('GET /barber/earnings', () => {
    it('returns 401 without token', async () => {
      await request(app).get('/barber/earnings').expect(401);
    });

    it('returns 400 when range missing', async () => {
      const token = signBarberToken(barberId);
      await request(app)
        .get('/barber/earnings')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  describe('PUT /barber/update-avatar', () => {
    it('returns 400 when no avatar payload provided', async () => {
      const token = signBarberToken(barberId);
      const res = await request(app)
        .put('/barber/update-avatar')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
      expect(res.body.ok).toBe(false);
    });

    it('returns 403 when called by client', async () => {
      const token = signClientToken(clientId);
      await request(app)
        .put('/barber/update-avatar')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(403);
    });
  });

  describe('POST /barber/add-image', () => {
    it('returns 400 when no images provided', async () => {
      const token = signBarberToken(barberId);
      const res = await request(app)
        .post('/barber/add-image')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
      expect(res.body.ok).toBe(false);
    });

    it('returns 403 when called by client', async () => {
      const token = signClientToken(clientId);
      await request(app)
        .post('/barber/add-image')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(403);
    });
  });
});

describe('client booking operations - error paths', () => {
  const barberId = 'epb2';
  const clientId = 'epc2';

  beforeEach(() => {
    seedApprovedBarber(barberId);
    seedClient(clientId);
  });

  describe('POST /client/bookings/:bookingId/cancel', () => {
    it('returns 403 for barber token', async () => {
      const token = signBarberToken(barberId);
      await request(app)
        .post('/client/bookings/any/cancel')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('returns 404 when booking is missing', async () => {
      const token = signClientToken(clientId);
      await request(app)
        .post('/client/bookings/no-such/cancel')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('returns 409 on completed booking', async () => {
      seedBooking('o-cc-completed', barberId, clientId, 'completed');
      const token = signClientToken(clientId);
      await request(app)
        .post('/client/bookings/o-cc-completed/cancel')
        .set('Authorization', `Bearer ${token}`)
        .expect(409);
    });
  });

  describe('POST /client/bookings/:bookingId/reschedule', () => {
    it('returns 403 for barber token', async () => {
      const token = signBarberToken(barberId);
      await request(app)
        .post('/client/bookings/any/reschedule')
        .set('Authorization', `Bearer ${token}`)
        .send({ timestamp: '2099-01-01T00:00:00.000Z' })
        .expect(403);
    });

    it('returns 404 when booking is missing', async () => {
      const token = signClientToken(clientId);
      await request(app)
        .post('/client/bookings/no-such/reschedule')
        .set('Authorization', `Bearer ${token}`)
        .send({ timestamp: '2099-01-01T00:00:00.000Z' })
        .expect(404);
    });

    it('returns 409 on completed booking', async () => {
      seedBooking('o-cr-completed', barberId, clientId, 'completed');
      const token = signClientToken(clientId);
      await request(app)
        .post('/client/bookings/o-cr-completed/reschedule')
        .set('Authorization', `Bearer ${token}`)
        .send({ timestamp: '2099-01-01T00:00:00.000Z' })
        .expect(409);
    });
  });

  describe('POST /client/bookings/:bookingId/review', () => {
    it('returns 403 for barber token', async () => {
      const token = signBarberToken(barberId);
      await request(app)
        .post('/client/bookings/any/review')
        .set('Authorization', `Bearer ${token}`)
        .send({ rating: 5 })
        .expect(403);
    });

    it('returns 400 on invalid rating', async () => {
      const token = signClientToken(clientId);
      await request(app)
        .post('/client/bookings/any/review')
        .set('Authorization', `Bearer ${token}`)
        .send({ rating: 99 })
        .expect(400);
    });

    it('returns 404 for missing booking', async () => {
      const token = signClientToken(clientId);
      await request(app)
        .post('/client/bookings/no-such/review')
        .set('Authorization', `Bearer ${token}`)
        .send({ rating: 5, comment: 'good' })
        .expect(404);
    });
  });

  describe('PUT /client/update-avatar', () => {
    it('returns 400 when no avatar payload provided', async () => {
      const token = signClientToken(clientId);
      const res = await request(app)
        .put('/client/update-avatar')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
      expect(res.body.ok).toBe(false);
    });

    it('returns 403 when called by barber', async () => {
      const token = signBarberToken(barberId);
      await request(app)
        .put('/client/update-avatar')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(403);
    });
  });
});

describe('notifications - error paths', () => {
  const clientId = 'noti-c';

  beforeEach(() => {
    seedClient(clientId);
  });

  it('GET /notifications returns 400 for invalid limit', async () => {
    const token = signClientToken(clientId);
    await request(app)
      .get('/notifications')
      .query({ limit: 9999 })
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('PATCH /notifications/:id/read returns 404 for unknown', async () => {
    const token = signClientToken(clientId);
    const res = await request(app)
      .patch('/notifications/unknown/read')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
    expect(res.body.ok).toBe(false);
  });

  it('POST /notifications/read-all marks all as read', async () => {
    const token = signClientToken(clientId);
    await request(app)
      .post('/notifications/read-all')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});

describe('trust - error paths', () => {
  const clientId = 'trust-c';
  const targetId = 'trust-t';

  beforeEach(() => {
    seedClient(clientId);
    seedClient(targetId);
  });

  it('POST /reports returns 400 on missing fields', async () => {
    const token = signClientToken(clientId);
    await request(app)
      .post('/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'r' })
      .expect(400);
  });

  it('POST /blocks returns 400 on missing blocked_user_id', async () => {
    const token = signClientToken(clientId);
    await request(app)
      .post('/blocks')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);
  });

  it('POST /blocks returns 400 on self-block', async () => {
    const token = signClientToken(clientId);
    const res = await request(app)
      .post('/blocks')
      .set('Authorization', `Bearer ${token}`)
      .send({ blocked_user_id: clientId })
      .expect(400);
    expect(res.body.ok).toBe(false);
  });

  it('DELETE /blocks/:userId returns 404 when not blocked', async () => {
    const token = signClientToken(clientId);
    await request(app)
      .delete(`/blocks/${targetId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('POST /reports succeeds', async () => {
    const token = signClientToken(clientId);
    const res = await request(app)
      .post('/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        target_type: 'client',
        target_id: targetId,
        reason: 'spam',
      })
      .expect(201);
    expect(res.body.ok).toBe(true);
  });

  it('POST /blocks succeeds and DELETE /blocks/:id removes', async () => {
    const token = signClientToken(clientId);
    await request(app)
      .post('/blocks')
      .set('Authorization', `Bearer ${token}`)
      .send({ blocked_user_id: targetId })
      .expect(201);

    await request(app)
      .delete(`/blocks/${targetId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
