/* eslint-env jest */
import request from 'supertest';
import { createApp } from '../../appFactory';
import { COLLECTIONS } from '../../config/database';
import { seedDoc } from '../support/mockFirestore';
import { signBarberToken, signClientToken } from '../support/authHelpers';

const app = createApp();

function seedApprovedBarber(id: string, username: string) {
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
    ratingAverage: 0,
    ratingCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function seedClient(id: string, username: string) {
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

describe('barber / client contract routes (coverage)', () => {
  const barberId = 'barber-cc';
  const clientId = 'client-cc';

  beforeEach(() => {
    seedApprovedBarber(barberId, 'barber_cc');
    seedClient(clientId, 'client_cc');
  });

  describe('POST /barber/bookings/:bookingId/cancel', () => {
    const bookingId = 'booking-barber-cancel';

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

    it('cancels a confirmed booking', async () => {
      const token = signBarberToken(barberId, 'barber_cc');
      const res = await request(app)
        .post(`/barber/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'busy' })
        .expect(200);
      expect(res.body.data.booking.status).toBe('cancelled');
    });
  });

  describe('POST /barber/bookings/:bookingId/reschedule', () => {
    const bookingId = 'booking-barber-resched';

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

    it('reschedules a confirmed booking', async () => {
      const token = signBarberToken(barberId, 'barber_cc');
      const res = await request(app)
        .post(`/barber/bookings/${bookingId}/reschedule`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          timestamp: '2099-06-15T10:00:00.000Z',
          reason: 'client asked',
        })
        .expect(200);
      expect(res.body.data.booking.status).toBe('rescheduled');
    });
  });

  describe('POST /barber/bookings/:bookingId/no-show', () => {
    const bookingId = 'booking-no-show';

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

    it('marks confirmed booking as no-show', async () => {
      const token = signBarberToken(barberId, 'barber_cc');
      const res = await request(app)
        .post(`/barber/bookings/${bookingId}/no-show`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.data.booking.status).toBe('no_show');
    });
  });

  describe('POST /barber/bookings/:bookingId/complete', () => {
    const bookingId = 'booking-complete';
    const serviceId = 'svc-cc-1';

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
      seedDoc(COLLECTIONS.BOOKING_SERVICES, 'os-cc-1', {
        id: 'os-cc-1',
        bookingId,
        serviceId,
      });
      seedDoc(COLLECTIONS.BARBER_SERVICES, serviceId, {
        id: serviceId,
        barberId,
        name: 'Haircut',
        price: 50000,
      });
    });

    it('completes a confirmed booking with service total', async () => {
      const token = signBarberToken(barberId, 'barber_cc');
      const res = await request(app)
        .post(`/barber/bookings/${bookingId}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.data.booking.status).toBe('completed');
      expect(res.body.data.booking.services.length).toBe(1);
      expect(res.body.data.booking.services[0].price).toBe(50000);
    });
  });

  describe('GET /barber/earnings', () => {
    const bookingId = 'booking-earnings';

    beforeEach(() => {
      seedDoc(COLLECTIONS.BOOKINGS, bookingId, {
        id: bookingId,
        barberId,
        clientId,
        timestamp: new Date().toISOString(),
        status: 'completed',
        declineReason: null,
        cancellationReason: null,
        previousTimestamp: null,
        cancelledBy: null,
        completedAt: '2026-05-15T12:00:00.000Z',
        serviceTotal: 10000,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('returns earnings for date range', async () => {
      const token = signBarberToken(barberId, 'barber_cc');
      const res = await request(app)
        .get('/barber/earnings')
        .query({ from: '2026-05-01', to: '2026-05-31' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.summary.completed_bookings).toBe(1);
      expect(res.body.data.summary.gross_total).toBe(10000);
    });

    it('returns 400 for invalid date query', async () => {
      const token = signBarberToken(barberId, 'barber_cc');
      const res = await request(app)
        .get('/barber/earnings')
        .query({ from: 'bad', to: '2026-05-31' })
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
      expect(res.body.ok).toBe(false);
    });

    it('returns 403 for client token', async () => {
      const token = signClientToken(clientId, 'client_cc');
      await request(app)
        .get('/barber/earnings')
        .query({ from: '2026-05-01', to: '2026-05-31' })
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('POST /client/bookings/:bookingId/reschedule', () => {
    const bookingId = 'booking-client-resched';

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

    it('reschedules as client', async () => {
      const token = signClientToken(clientId, 'client_cc');
      const res = await request(app)
        .post(`/client/bookings/${bookingId}/reschedule`)
        .set('Authorization', `Bearer ${token}`)
        .send({ timestamp: '2099-07-20T14:00:00.000Z' })
        .expect(200);
      expect(res.body.data.booking.status).toBe('rescheduled');
    });
  });

  describe('POST /client/bookings/:bookingId/review', () => {
    const bookingId = 'booking-review';

    beforeEach(() => {
      seedDoc(COLLECTIONS.BOOKINGS, bookingId, {
        id: bookingId,
        barberId,
        clientId,
        timestamp: new Date().toISOString(),
        status: 'completed',
        declineReason: null,
        cancellationReason: null,
        previousTimestamp: null,
        cancelledBy: null,
        completedAt: new Date().toISOString(),
        serviceTotal: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('creates a review then rejects duplicate', async () => {
      const token = signClientToken(clientId, 'client_cc');
      const first = await request(app)
        .post(`/client/bookings/${bookingId}/review`)
        .set('Authorization', `Bearer ${token}`)
        .send({ rating: 5, comment: 'Nice', service_ids: [] })
        .expect(201);
      expect(first.body.ok).toBe(true);

      const dup = await request(app)
        .post(`/client/bookings/${bookingId}/review`)
        .set('Authorization', `Bearer ${token}`)
        .send({ rating: 4, comment: 'Again', service_ids: [] })
        .expect(409);
      expect(dup.body.ok).toBe(false);
    });

    it('returns 409 when booking is not completed', async () => {
      const pendingBookingId = 'booking-review-pending';
      seedDoc(COLLECTIONS.BOOKINGS, pendingBookingId, {
        id: pendingBookingId,
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

      const token = signClientToken(clientId, 'client_cc');
      const res = await request(app)
        .post(`/client/bookings/${pendingBookingId}/review`)
        .set('Authorization', `Bearer ${token}`)
        .send({ rating: 5, comment: 'x' })
        .expect(409);
      expect(res.body.ok).toBe(false);
    });
  });
});
