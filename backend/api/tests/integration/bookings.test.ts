import request from 'supertest';
import { createApp } from '../../appFactory';
import { COLLECTIONS } from '../../config/database';
import { seedDoc } from '../support/mockFirestore';
import { signBarberToken, signClientToken } from '../support/authHelpers';

const app = createApp();

describe('bookings (contract)', () => {
  const barberId = 'barber-o1';
  const clientId = 'client-o1';
  const bookingId = 'booking-o1';

  beforeEach(() => {
    seedDoc(COLLECTIONS.BARBERS, barberId, {
      id: barberId,
      username: 'barber_bookings',
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

    seedDoc(COLLECTIONS.CLIENTS, clientId, {
      id: clientId,
      username: 'client_bookings',
      password: 'x',
      firstName: 'C',
      lastName: 'C',
      phone: '+998901234567',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    seedDoc(COLLECTIONS.BOOKINGS, bookingId, {
      id: bookingId,
      barberId,
      clientId,
      timestamp: new Date().toISOString(),
      status: 'pending_confirmation',
      declineReason: null,
      cancellationReason: null,
      previousTimestamp: null,
      cancelledBy: null,
      completedAt: null,
      serviceTotal: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('PATCH /barber/bookings/:id/status returns 401 without token', async () => {
    await request(app)
      .patch(`/barber/bookings/${bookingId}/status`)
      .send({ status: 'confirmed' })
      .expect(401);
  });

  it('PATCH /barber/bookings/:id/status returns 403 for client token', async () => {
    const token = signClientToken(clientId, 'client_bookings');
    await request(app)
      .patch(`/barber/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'confirmed' })
      .expect(403);
  });

  it('PATCH /barber/bookings/:id/status returns 400 for invalid body', async () => {
    const token = signBarberToken(barberId, 'barber_bookings');
    const res = await request(app)
      .patch(`/barber/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'invalid' })
      .expect(400);
    expect(res.body.ok).toBe(false);
  });

  it('PATCH /barber/bookings/:id/status confirms pending booking', async () => {
    const token = signBarberToken(barberId, 'barber_bookings');
    const res = await request(app)
      .patch(`/barber/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'confirmed' })
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data.booking.status).toBe('confirmed');
  });

  it('PATCH /barber/bookings/:id/status returns 409 when not pending', async () => {
    const token = signBarberToken(barberId, 'barber_bookings');
    await request(app)
      .patch(`/barber/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'confirmed' })
      .expect(200);

    await request(app)
      .patch(`/barber/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'confirmed' })
      .expect(409);
  });

  it('returns 403 when barber is not approved', async () => {
    seedDoc(COLLECTIONS.BARBERS, barberId, {
      id: barberId,
      username: 'barber_bookings',
      password: 'x',
      firstName: 'B',
      lastName: 'B',
      phone: '+998901234567',
      location: { latitude: '0', longitude: '0' },
      birthDate: '1990-01-01',
      workingHours: '9-5',
      images: [],
      approvalStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = signBarberToken(barberId, 'barber_bookings');
    await request(app)
      .patch(`/barber/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'confirmed' })
      .expect(403);
  });

  it('POST /client/bookings/:id/cancel succeeds for client', async () => {
    const token = signClientToken(clientId, 'client_bookings');
    const res = await request(app)
      .post(`/client/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.booking.status).toBe('cancelled');
  });

  describe('arrival-confirm', () => {
    beforeEach(() => {
      seedDoc(COLLECTIONS.BOOKINGS, bookingId, {
        id: bookingId,
        barberId,
        clientId,
        timestamp: new Date().toISOString(),
        status: 'confirmed',
        declineReason: null,
        cancellationReason: null,
        previousTimestamp: null,
        cancelledBy: null,
        completedAt: null,
        serviceTotal: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('returns 400 for an invalid response value', async () => {
      const token = signClientToken(clientId, 'client_bookings');
      await request(app)
        .post(`/client/bookings/${bookingId}/arrival-confirm`)
        .set('Authorization', `Bearer ${token}`)
        .send({ response: 'maybe' })
        .expect(400);
    });

    it('returns 403 when a barber token hits the client route', async () => {
      const token = signBarberToken(barberId, 'barber_bookings');
      await request(app)
        .post(`/client/bookings/${bookingId}/arrival-confirm`)
        .set('Authorization', `Bearer ${token}`)
        .send({ response: 'yes' })
        .expect(403);
    });

    it('records the client arrival response', async () => {
      const token = signClientToken(clientId, 'client_bookings');
      const res = await request(app)
        .post(`/client/bookings/${bookingId}/arrival-confirm`)
        .set('Authorization', `Bearer ${token}`)
        .send({ response: 'yes' })
        .expect(200);
      expect(res.body.data.booking.client_arrival_response).toBe('yes');
    });

    it('records the barber arrival response', async () => {
      const token = signBarberToken(barberId, 'barber_bookings');
      const res = await request(app)
        .post(`/barber/bookings/${bookingId}/arrival-confirm`)
        .set('Authorization', `Bearer ${token}`)
        .send({ response: 'no' })
        .expect(200);
      expect(res.body.data.booking.barber_arrival_response).toBe('no');
    });

    it('returns 409 once the booking is no longer active', async () => {
      const barberToken = signBarberToken(barberId, 'barber_bookings');
      await request(app)
        .post(`/barber/bookings/${bookingId}/no-show`)
        .set('Authorization', `Bearer ${barberToken}`)
        .expect(200);

      const clientToken = signClientToken(clientId, 'client_bookings');
      await request(app)
        .post(`/client/bookings/${bookingId}/arrival-confirm`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ response: 'yes' })
        .expect(409);
    });

    it('GET /client/bookings/arrival-pending lists an unanswered reminder', async () => {
      seedDoc(COLLECTIONS.BOOKINGS, bookingId, {
        id: bookingId,
        barberId,
        clientId,
        timestamp: new Date().toISOString(),
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const token = signClientToken(clientId, 'client_bookings');
      const res = await request(app)
        .get('/client/bookings/arrival-pending')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.data.bookings.map((b: { id: string }) => b.id)).toEqual([
        bookingId,
      ]);
    });

    it('GET /barber/bookings/arrival-pending lists an unanswered reminder', async () => {
      seedDoc(COLLECTIONS.BOOKINGS, bookingId, {
        id: bookingId,
        barberId,
        clientId,
        timestamp: new Date().toISOString(),
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const token = signBarberToken(barberId, 'barber_bookings');
      const res = await request(app)
        .get('/barber/bookings/arrival-pending')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.data.bookings.map((b: { id: string }) => b.id)).toEqual([
        bookingId,
      ]);
    });
  });
});
