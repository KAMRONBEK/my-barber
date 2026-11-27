/* eslint-env jest */
import request from 'supertest';
import { createApp } from '../../appFactory';
import { config } from '../../config/config';
import { COLLECTIONS, db } from '../../config/database';
import { getBookingLifecycleDeliveries } from '../../services/bookingLifecycleNotifications';
import { normalizePhone } from '../../utils/phone';
import { parseWorkingWindow } from '../../utils/bookingRules';
import { seedDoc } from '../support/mockFirestore';
import { signBarberToken, signClientToken } from '../support/authHelpers';

const app = createApp();

const BARBER = 'af-barber';
const CLIENT = 'af-client';
/** 10:00 in Tashkent */
const AT_10 = '2099-03-02T05:00:00.000Z';
const AT_10_30 = '2099-03-02T05:30:00.000Z';
const AT_12 = '2099-03-02T07:00:00.000Z';

function seedBarber(id: string, extra: Record<string, unknown> = {}) {
  seedDoc(COLLECTIONS.BARBERS, id, {
    username: `login_${id}`,
    password: 'hash',
    firstName: 'Bob',
    lastName: 'Barber',
    phone: '+998901000000',
    location: 'Tashkent',
    birthDate: '1990-01-01',
    workingHours: '09:00 - 18:00',
    images: [],
    approvalStatus: 'approved',
    ...extra,
  });
}

function seedClient(id: string, extra: Record<string, unknown> = {}) {
  seedDoc(COLLECTIONS.CLIENTS, id, {
    username: `login_${id}`,
    firstName: 'Carl',
    lastName: 'Client',
    phone: '+998902000000',
    ...extra,
  });
}

function seedService(id: string, barberId: string, extra = {}) {
  seedDoc(COLLECTIONS.BARBER_SERVICES, id, {
    barberId,
    name: 'Cut',
    price: 1000,
    durationMinutes: 40,
    ...extra,
  });
}

function seedBooking(
  id: string,
  timestamp: string,
  status: string,
  barberId = BARBER
) {
  seedDoc(COLLECTIONS.BOOKINGS, id, {
    barberId,
    clientId: CLIENT,
    timestamp,
    status,
    updatedAt: new Date(),
  });
  seedDoc(COLLECTIONS.BOOKING_SERVICES, `link-${id}`, {
    bookingId: id,
    serviceId: 'svc',
  });
}

const asClient = (id = CLIENT) => `Bearer ${signClientToken(id, 'c')}`;
const asBarber = (id = BARBER) => `Bearer ${signBarberToken(id, 'b')}`;

const book = (timestamp: string, extra: Record<string, unknown> = {}) =>
  request(app)
    .post('/client/bookings')
    .set('Authorization', asClient())
    .send({ barberId: BARBER, serviceIds: ['svc'], timestamp, ...extra });

async function stored(collection: string, id: string) {
  return (await db.getFirestore().collection(collection).doc(id).get()).data();
}

beforeEach(() => {
  seedBarber(BARBER);
  seedClient(CLIENT);
  seedService('svc', BARBER);
});

describe('security', () => {
  it('ignores protected fields on PUT /barber/update', async () => {
    seedBarber('af-pending', { approvalStatus: 'pending' });
    await request(app)
      .put('/barber/update')
      .set('Authorization', asBarber('af-pending'))
      .send({
        firstName: 'New',
        lastName: '',
        approvalStatus: 'approved',
        ratingAverage: 5,
        ratingCount: 9999,
        username: 'hijack',
        password: 'plain',
      })
      .expect(200);

    const doc = await stored(COLLECTIONS.BARBERS, 'af-pending');
    expect(doc).toMatchObject({
      firstName: 'New',
      lastName: '',
      approvalStatus: 'pending',
      username: 'login_af-pending',
      password: 'hash',
    });
    expect(doc?.ratingCount).toBeUndefined();
  });

  it("does not delete another barber's service, and keeps own history", async () => {
    seedBarber('af-other');
    await request(app)
      .delete('/barber/delete-service/svc')
      .set('Authorization', asBarber('af-other'))
      .expect(404);
    expect((await stored(COLLECTIONS.BARBER_SERVICES, 'svc'))?.isActive).toBe(
      undefined
    );

    await request(app)
      .delete('/barber/delete-service/svc')
      .set('Authorization', asBarber())
      .expect(200);
    expect((await stored(COLLECTIONS.BARBER_SERVICES, 'svc'))?.isActive).toBe(
      false
    );
  });

  it('hides unapproved barbers and private fields from clients', async () => {
    seedBarber('af-pending', { approvalStatus: 'pending' });
    seedBarber('af-legacy', { approvalStatus: undefined });
    seedService('old', BARBER, { isActive: false });
    for (const barberId of [BARBER, 'af-pending']) {
      seedDoc(COLLECTIONS.FAVORITES, `${CLIENT}_${barberId}`, {
        clientId: CLIENT,
        barberId,
        createdAt: new Date(),
      });
    }

    for (const path of [
      '/client/barbers',
      '/client/banner',
      '/client/favorites',
    ]) {
      const res = await request(app)
        .get(path)
        .set('Authorization', asClient())
        .expect(200);
      const ids = res.body.data.map((b: { id: string }) => b.id);
      expect(ids).toContain(BARBER);
      expect(ids).not.toContain('af-pending');
      for (const barber of res.body.data) {
        expect(barber.username).toBeUndefined();
        expect(barber.birthDate).toBeUndefined();
        expect(barber.password).toBeUndefined();
        expect(barber.phone).toBeDefined();
        expect(barber.services.map((s: { id: string }) => s.id)).not.toContain(
          'old'
        );
      }
    }
  });

  it('keeps usernames unique, even for simultaneous requests', async () => {
    const body = {
      username: 'same_name',
      password: 'password1',
      firstName: 'A',
      lastName: 'B',
      phone: '+998901234567',
      location: 'Tashkent',
      birthDate: '1990-01-01',
      workingHours: '09:00 - 18:00',
    };
    const results = await Promise.all([
      request(app).post('/auth/barber/register').send(body),
      request(app).post('/auth/barber/register').send(body),
    ]);
    expect(results.map(r => r.status).sort()).toEqual([201, 400]);
    const created = results.find(r => r.status === 201)!;
    expect(created.body.data.barber.approval_status).toBe('pending');

    const taken = await request(app)
      .post('/barber/update-credentials')
      .set('Authorization', asBarber())
      .send({ username: 'same_name', password: 'password1' })
      .expect(400);
    expect(taken.body.error).toBe('Username already exists');

    await request(app)
      .post('/client/update-credentials')
      .set('Authorization', asClient())
      .send({ username: `login_${CLIENT}`, password: 'password1' })
      .expect(200);
    seedClient('af-client-2');
    await request(app)
      .post('/client/update-credentials')
      .set('Authorization', asClient('af-client-2'))
      .send({ username: `login_${CLIENT}`, password: 'password1' })
      .expect(400);
  });

  it('rejects negative prices and an image index out of range', async () => {
    await request(app)
      .put('/barber/services')
      .set('Authorization', asBarber())
      .send({
        services: [
          {
            catalog_service_id: 'x',
            name: 'X',
            price: -1,
            duration_minutes: 30,
            is_active: true,
          },
        ],
      })
      .expect(400);
    await request(app)
      .delete('/barber/images/7')
      .set('Authorization', asBarber())
      .expect(400);
  });

  it('does not send CORS credentials with a wildcard origin', async () => {
    const res = await request(app).get('/health').set('Origin', 'https://x.y');
    expect(res.headers['access-control-allow-origin']).toBe('*');
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('closes /test and /metrics in production', async () => {
    const originalEnv = config.nodeEnv;
    Object.assign(config, { nodeEnv: 'production' });
    process.env.ADMIN_API_KEY = 'key-1';
    try {
      const prod = createApp();
      await request(prod).post('/test/send-notification').send({}).expect(404);
      await request(prod).get('/metrics').expect(404);
      await request(prod)
        .get('/metrics')
        .set('X-Admin-Api-Key', 'key-1')
        .expect(200);
      const root = await request(prod).get('/').expect(200);
      expect(root.body.endpoints.development).toBeUndefined();
    } finally {
      Object.assign(config, { nodeEnv: originalEnv });
      delete process.env.ADMIN_API_KEY;
    }
  });
});

describe('client sign-up with a phone number', () => {
  it('creates an account and signs in with any phone format', async () => {
    const reg = await request(app)
      .post('/auth/client/register')
      .send({
        phone: '90 777-11-22',
        password: 'password1',
        firstName: ' Ali ',
      })
      .expect(201);
    expect(reg.body.token).toBeDefined();
    expect(reg.body.data.client).toMatchObject({
      username: '+998907771122',
      phone: '+998907771122',
      firstName: 'Ali',
      lastName: '',
    });

    for (const username of ['+998907771122', '907771122', '998907771122']) {
      await request(app)
        .post('/auth/client/login')
        .send({ username, password: 'password1' })
        .expect(200);
    }

    const again = await request(app)
      .post('/auth/client/register')
      .send({
        phone: '+998 90 777 11 22',
        password: 'password1',
        firstName: 'Ali',
      })
      .expect(400);
    expect(again.body.error).toBe('Phone already registered');
  });

  it('moves the phone sign-in along when the number is changed', async () => {
    const signUp = async (phone: string) =>
      (
        await request(app)
          .post('/auth/client/register')
          .send({ phone, password: 'password1', firstName: 'Ali' })
          .expect(201)
      ).body.data;
    const ali = await signUp('+998901110001');
    await signUp('+998901110002');
    const change = (phone: string) =>
      request(app)
        .put('/client/update')
        .set('Authorization', `Bearer ${ali.token}`)
        .send({ firstName: 'Ali', phone });
    const signIn = (username: string) =>
      request(app)
        .post('/auth/client/login')
        .send({ username, password: 'password1' });

    const taken = await change('+998901110002').expect(400);
    expect(taken.body.error).toBe('Phone already registered');

    await change('90 111 00 03').expect(200);
    await signIn('+998901110003').expect(200);
    await signIn('+998901110001').expect(401);
    // The old number is free again.
    await signUp('+998901110001');
  });

  it('leaves an older username sign-in unchanged', async () => {
    await request(app)
      .put('/client/update')
      .set('Authorization', asClient())
      .send({ phone: '+998901110009' })
      .expect(200);
    expect(await stored(COLLECTIONS.CLIENTS, CLIENT)).toMatchObject({
      username: `login_${CLIENT}`,
      phone: '+998901110009',
    });
  });

  it('creates one account for simultaneous sign-ups', async () => {
    const send = () =>
      request(app).post('/auth/client/register').send({
        phone: '+998907770000',
        password: 'password1',
        firstName: 'Ali',
      });
    const results = await Promise.all([send(), send()]);
    expect(results.map(r => r.status).sort()).toEqual([201, 400]);
  });

  it.each([
    ['a bad phone', { phone: '123' }],
    ['a short password', { password: 'short1' }],
    ['no name', { firstName: undefined }],
    ['a blank name', { firstName: '   ' }],
  ])('rejects %s', async (_name, override) => {
    await request(app)
      .post('/auth/client/register')
      .send({
        phone: '+998907771122',
        password: 'password1',
        firstName: 'Ali',
        ...override,
      })
      .expect(400);
  });

  it('does not let a client erase the first name', async () => {
    const update = (body: Record<string, string>) =>
      request(app)
        .put('/client/update')
        .set('Authorization', asClient())
        .send(body);
    await update({ firstName: '  ' }).expect(400);
    await update({ firstName: 'Ali', lastName: '' }).expect(200);
  });

  it('normalises phone numbers and ignores usernames', () => {
    expect(normalizePhone('(90) 123-45-67')).toBe('+998901234567');
    expect(normalizePhone('+7 916 123 45 67')).toBe('+79161234567');
    expect(normalizePhone('+99890123456')).toBeNull();
    expect(normalizePhone('client@test.local')).toBeNull();
    expect(normalizePhone('barber1')).toBeNull();
  });
});

describe('barber application', () => {
  const body = (location: unknown) => ({
    username: `loc_${Math.random().toString(36).slice(2)}`,
    password: 'password1',
    firstName: 'A',
    lastName: 'B',
    phone: '+998901234567',
    location,
    birthDate: '1990-01-01',
    workingHours: '09:00 - 18:00',
  });
  const point = {
    address: 'Amir Temur 1',
    coords: { latitude: 41.3, longitude: 69.2 },
  };

  it('accepts an address with a map point', async () => {
    const res = await request(app)
      .post('/auth/barber/register')
      .send(body(point))
      .expect(201);
    expect(res.body.data.barber.location).toEqual(point);
  });

  it.each([
    [''],
    [{ address: 'x' }],
    [{ coords: { latitude: 100, longitude: 0 } }],
  ])('rejects the location %j', async location => {
    await request(app)
      .post('/auth/barber/register')
      .send(body(location))
      .expect(400);
  });

  it('lets a pending barber sync language and push token, nothing more', async () => {
    seedBarber('af-wait', { approvalStatus: 'pending' });
    const auth = asBarber('af-wait');
    await request(app)
      .put('/barber/locale')
      .set('Authorization', auth)
      .send({ locale: 'ru' })
      .expect(200);
    await request(app)
      .delete('/barber/push-token')
      .set('Authorization', auth)
      .expect(200);
    await request(app)
      .get('/barber/bookings')
      .set('Authorization', auth)
      .expect(403);
  });

  it('drops the old review note when the status changes', async () => {
    seedBarber('af-wait', {
      approvalStatus: 'pending',
      approvalMessage: 'Your account is under review',
    });
    process.env.ADMIN_API_KEY = 'key-2';
    try {
      const res = await request(app)
        .patch('/admin/barbers/af-wait/approval')
        .set('X-Admin-Api-Key', 'key-2')
        .send({ status: 'rejected' })
        .expect(200);
      expect(res.body.data.approvalMessage ?? null).toBeNull();
    } finally {
      delete process.env.ADMIN_API_KEY;
    }
  });
});

describe('booking statuses', () => {
  beforeEach(() => {
    seedBooking('live', AT_10, 'confirmed');
    seedBooking('gone', AT_12, 'cancelled');
    seedBooking('no', '2099-03-02T08:00:00.000Z', 'declined');
  });

  it('returns status to the barber', async () => {
    const res = await request(app)
      .get('/barber/bookings?date=2099-03-02')
      .set('Authorization', asBarber())
      .expect(200);
    const byId = Object.fromEntries(
      res.body.data.map((b: { bookingId: string; status: string }) => [
        b.bookingId,
        b.status,
      ])
    );
    expect(byId).toEqual({
      live: 'confirmed',
      gone: 'cancelled',
      no: 'declined',
    });
  });

  it('lists only busy times, without client names', async () => {
    const res = await request(app)
      .get(`/client/bookings?barber_id=${BARBER}&date=2099-03-02`)
      .set('Authorization', asClient())
      .expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      bookingId: 'live',
      status: 'confirmed',
      clientFirstName: '',
      clientLastName: '',
    });
  });

  it('frees the slot of a cancelled booking', async () => {
    await book(AT_12).expect(201);
  });

  it('treats an unanswered past request as expired', async () => {
    seedBooking('stale', '2026-01-05T05:00:00.000Z', 'pending_confirmation');

    const past = await request(app)
      .get('/client/bookings?status=past')
      .set('Authorization', asClient())
      .expect(200);
    const stale = past.body.data.items.find(
      (b: { id: string }) => b.id === 'stale'
    );
    expect(stale).toMatchObject({
      status: 'cancelled',
      cancellation_reason: 'expired',
    });

    const upcoming = await request(app)
      .get('/client/bookings?status=upcoming')
      .set('Authorization', asClient())
      .expect(200);
    expect(
      upcoming.body.data.items.map((b: { id: string }) => b.id)
    ).not.toContain('stale');

    await request(app)
      .patch('/barber/bookings/stale/status')
      .set('Authorization', asBarber())
      .send({ status: 'confirmed' })
      .expect(409);
  });
});

describe('booking validation', () => {
  it('stores the time in UTC and reads a bare time as Tashkent', async () => {
    const res = await book('2099-03-02T10:00:00').expect(201);
    expect(res.body.data.booking.timestamp).toBe(AT_10);
  });

  it('rejects overlapping bookings but allows the next free time', async () => {
    await book(AT_10).expect(201);
    expect((await book(AT_10).expect(409)).body.code).toBe('SLOT_TAKEN');
    // 40 minutes round up to a 60-minute slot.
    await book(AT_10_30).expect(409);
    await book('2099-03-02T04:30:00.000Z').expect(409);
    await book('2099-03-02T06:00:00.000Z').expect(201);
  });

  it('lets only one of two simultaneous requests win', async () => {
    const results = await Promise.all([book(AT_10), book(AT_10)]);
    expect(results.map(r => r.status).sort()).toEqual([201, 409]);
  });

  it.each([
    ['a past time', '2020-01-01T05:00:00.000Z', {}, 400, 'PAST_TIME'],
    ['a date without time', '2099-03-02', {}, 400, 'INVALID_TIME'],
    [
      'before opening',
      '2099-03-02T03:00:00.000Z',
      {},
      400,
      'OUTSIDE_WORKING_HOURS',
    ],
    [
      'ending after closing',
      '2099-03-02T12:30:00.000Z',
      {},
      400,
      'OUTSIDE_WORKING_HOURS',
    ],
    [
      'an unknown barber',
      AT_10,
      { barberId: 'nobody' },
      404,
      'BARBER_NOT_AVAILABLE',
    ],
    [
      'an unknown service',
      AT_10,
      { serviceIds: ['nope'] },
      400,
      'INVALID_SERVICES',
    ],
  ])('rejects %s', async (_name, timestamp, extra, status, code) => {
    const res = await book(timestamp, extra).expect(status);
    expect(res.body.code).toBe(code);
  });

  it("rejects another barber's or a removed service", async () => {
    seedBarber('af-other');
    seedService('theirs', 'af-other');
    seedService('removed', BARBER, { isActive: false });
    await book(AT_10, { serviceIds: ['theirs'] }).expect(400);
    await book(AT_10, { serviceIds: ['removed'] }).expect(400);
  });

  it('rejects an unapproved barber', async () => {
    seedBarber(BARBER, { approvalStatus: 'pending' });
    await book(AT_10).expect(404);
  });

  it('never blocks a booking because working hours are free text', async () => {
    seedBarber(BARBER, { workingHours: 'Every day, call me' });
    await book('2099-03-02T01:00:00.000Z').expect(201);
    expect(parseWorkingWindow('9-5')).toBeNull();
    expect(parseWorkingWindow('09:00-13:00, 14:00-18:00')).toBeNull();
    expect(parseWorkingWindow('Mon-Sat 09:00 – 18:00')).toEqual({
      open: 540,
      close: 1080,
    });
  });

  it('applies the same rules to rescheduling', async () => {
    seedBooking('mine', AT_10, 'confirmed');
    seedBooking('other', AT_12, 'confirmed');
    const move = (timestamp: string) =>
      request(app)
        .post('/client/bookings/mine/reschedule')
        .set('Authorization', asClient())
        .send({ timestamp });

    await move(AT_12).expect(409);
    await move('2020-01-01T05:00:00.000Z').expect(400);
    await move('2099-03-02T15:00:00.000Z').expect(400);
    // Overlapping its own current time is fine.
    await move(AT_10_30).expect(200);
  });

  it.each(['complete', 'no-show'])(
    'refuses to %s a visit that has not started',
    async action => {
      seedBooking('future', AT_10, 'confirmed');
      const res = await request(app)
        .post(`/barber/bookings/future/${action}`)
        .set('Authorization', asBarber())
        .expect(409);
      expect(res.body.code).toBe('NOT_STARTED');
    }
  );
});

describe('notification time', () => {
  it('is written in Tashkent time', () => {
    const deliveries = getBookingLifecycleDeliveries('booking_rescheduled', {
      id: 'x',
      barberId: BARBER,
      clientId: CLIENT,
      timestamp: '2026-11-28T09:00:00.000Z',
    });
    expect(JSON.stringify(deliveries)).toContain('28.11.2026, 14:00');
  });
});
