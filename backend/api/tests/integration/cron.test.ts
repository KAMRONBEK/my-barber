import request from 'supertest';
import { createApp } from '../../appFactory';
import { COLLECTIONS } from '../../config/database';
import { seedDoc } from '../support/mockFirestore';

const app = createApp();
const CRON_KEY = process.env.CRON_API_KEY as string;

describe('GET /cron/booking-reminders', () => {
  const barberId = 'cron-barber-1';
  const clientId = 'cron-client-1';

  beforeEach(() => {
    seedDoc(COLLECTIONS.BARBERS, barberId, {
      id: barberId,
      username: 'cron_barber',
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
      username: 'cron_client',
      password: 'x',
      firstName: 'C',
      lastName: 'C',
      phone: '+998901234567',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('returns 401 without the cron API key', async () => {
    await request(app).get('/cron/booking-reminders').expect(401);
  });

  it('returns 401 with the wrong cron API key', async () => {
    await request(app)
      .get('/cron/booking-reminders')
      .set('X-Cron-Api-Key', 'wrong-key')
      .expect(401);
  });

  it('dispatches a reminder once for a booking in the lookahead window and skips it on a second run', async () => {
    const bookingId = 'cron-due-1';
    const inFiveMinutes = new Date(Date.now() + 5 * 60_000).toISOString();
    seedDoc(COLLECTIONS.BOOKINGS, bookingId, {
      id: bookingId,
      barberId,
      clientId,
      timestamp: inFiveMinutes,
      status: 'confirmed',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const first = await request(app)
      .get('/cron/booking-reminders')
      .set('X-Cron-Api-Key', CRON_KEY)
      .expect(200);
    expect(first.body.data.processed).toBe(1);

    const second = await request(app)
      .get('/cron/booking-reminders')
      .set('X-Cron-Api-Key', CRON_KEY)
      .expect(200);
    expect(second.body.data.processed).toBe(0);
  });

  it('ignores bookings outside the lookahead window or not active', async () => {
    seedDoc(COLLECTIONS.BOOKINGS, 'cron-too-far', {
      id: 'cron-too-far',
      barberId,
      clientId,
      timestamp: new Date(Date.now() + 60 * 60_000).toISOString(),
      status: 'confirmed',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    seedDoc(COLLECTIONS.BOOKINGS, 'cron-wrong-status', {
      id: 'cron-wrong-status',
      barberId,
      clientId,
      timestamp: new Date(Date.now() + 5 * 60_000).toISOString(),
      status: 'pending_confirmation',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .get('/cron/booking-reminders')
      .set('X-Cron-Api-Key', CRON_KEY)
      .expect(200);
    expect(res.body.data.processed).toBe(0);
  });
});
