/* eslint-env jest */
import request from 'supertest';
import { createApp } from '../../appFactory';
import { COLLECTIONS } from '../../config/database';
import { seedDoc } from '../support/mockFirestore';
import { signBarberToken, signClientToken } from '../support/authHelpers';
import { clientService } from '../../services/clientService';

const app = createApp();

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

describe('client misc routes', () => {
  describe('GET /client/getMe', () => {
    it('returns the authenticated client', async () => {
      seedClient('me1');
      const token = signClientToken('me1', 'c_me1');

      const res = await request(app)
        .get('/client/getMe')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.id).toBe('me1');
    });

    it('returns 403 for barber tokens', async () => {
      seedApprovedBarber('b-block-client');
      const token = signBarberToken('b-block-client', 'b_b-block-client');

      await request(app)
        .get('/client/getMe')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('returns 404 when client doc missing', async () => {
      const token = signClientToken('ghost', 'ghost');

      await request(app)
        .get('/client/getMe')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('PUT /client/update', () => {
    it('updates client profile', async () => {
      seedClient('upd1');
      const token = signClientToken('upd1', 'c_upd1');

      const res = await request(app)
        .put('/client/update')
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'New' })
        .expect(200);
      expect(res.body.ok).toBe(true);
    });

    it('returns 400 on invalid phone', async () => {
      seedClient('upd2');
      const token = signClientToken('upd2', 'c_upd2');

      await request(app)
        .put('/client/update')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: 'no' })
        .expect(400);
    });
  });

  describe('POST /client/update-credentials', () => {
    it('updates credentials', async () => {
      seedClient('uc1');
      const token = signClientToken('uc1', 'c_uc1');

      const res = await request(app)
        .post('/client/update-credentials')
        .set('Authorization', `Bearer ${token}`)
        .send({ username: 'new_user', password: 'pass1234' })
        .expect(200);
      expect(res.body.ok).toBe(true);
    });

    it('returns 403 for barber', async () => {
      seedApprovedBarber('uc-bar');
      const token = signBarberToken('uc-bar', 'b_uc-bar');

      await request(app)
        .post('/client/update-credentials')
        .set('Authorization', `Bearer ${token}`)
        .send({ username: 'new_user', password: 'pass1234' })
        .expect(403);
    });

    it('rejects short username', async () => {
      seedClient('uc2');
      const token = signClientToken('uc2', 'c_uc2');

      await request(app)
        .post('/client/update-credentials')
        .set('Authorization', `Bearer ${token}`)
        .send({ username: 'a', password: 'pass1234' })
        .expect(400);
    });
  });

  describe('GET /client/bookings', () => {
    it('returns bookings for the requested barber', async () => {
      seedApprovedBarber('bo1');
      seedClient('cbo1');
      seedDoc(COLLECTIONS.BOOKINGS, 'ord-bo-1', {
        id: 'ord-bo-1',
        barberId: 'bo1',
        clientId: 'cbo1',
        timestamp: new Date().toISOString(),
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const token = signClientToken('cbo1', 'c_cbo1');

      const res = await request(app)
        .get('/client/bookings')
        .query({ barber_id: 'bo1' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
    });

    it('returns client booking history when barber_id is absent', async () => {
      // Without barber_id the endpoint now returns the authenticated client's own
      // booking history (all barbers, newest first) rather than a 400 error.
      seedClient('cbo2');
      seedApprovedBarber('bo-hist');
      seedDoc(COLLECTIONS.BOOKINGS, 'ord-hist-1', {
        id: 'ord-hist-1',
        barberId: 'bo-hist',
        clientId: 'cbo2',
        timestamp: new Date().toISOString(),
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const token = signClientToken('cbo2', 'c_cbo2');

      const res = await request(app)
        .get('/client/bookings')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.data.items).toBeDefined();
    });

    it('filters by ?status=upcoming', async () => {
      seedClient('cbo3');
      seedApprovedBarber('bo-upcoming');
      seedDoc(COLLECTIONS.BOOKINGS, 'ord-upcoming-1', {
        id: 'ord-upcoming-1',
        barberId: 'bo-upcoming',
        clientId: 'cbo3',
        timestamp: new Date().toISOString(),
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      seedDoc(COLLECTIONS.BOOKINGS, 'ord-past-1', {
        id: 'ord-past-1',
        barberId: 'bo-upcoming',
        clientId: 'cbo3',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const token = signClientToken('cbo3', 'c_cbo3');

      const res = await request(app)
        .get('/client/bookings')
        .query({ status: 'upcoming' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.ok).toBe(true);
      // Only the confirmed booking should appear; the completed one is filtered out
      expect(res.body.data.items.every((b: { status: string }) =>
        ['pending_confirmation', 'confirmed', 'rescheduled'].includes(b.status)
      )).toBe(true);
    });

    it('accepts legacy path GET /client/barber-bookings', async () => {
      seedApprovedBarber('bo-legacy');
      seedClient('cbo-legacy');
      seedDoc(COLLECTIONS.BOOKINGS, 'ord-bo-leg', {
        id: 'ord-bo-leg',
        barberId: 'bo-legacy',
        clientId: 'cbo-legacy',
        timestamp: new Date().toISOString(),
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const token = signClientToken('cbo-legacy', 'c_cbo-legacy');

      const res = await request(app)
        .get('/client/barber-bookings')
        .query({ barber_id: 'bo-legacy' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
    });
  });

  describe('POST /client/bookings', () => {
    it('creates a new booking', async () => {
      seedApprovedBarber('newo1');
      seedClient('cno1');
      const token = signClientToken('cno1', 'c_cno1');

      const res = await request(app)
        .post('/client/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          barberId: 'newo1',
          serviceIds: ['svc-1'],
          timestamp: '2099-09-01T10:00:00.000Z',
        })
        .expect(201);
      expect(res.body.data.booking).toBeDefined();
    });

    it('returns 403 when client is blocked by barber', async () => {
      seedApprovedBarber('block-bar');
      seedClient('block-cli');
      seedDoc(COLLECTIONS.BLOCKS, 'b-block-1', {
        id: 'b-block-1',
        blockerId: 'block-bar',
        blockedId: 'block-cli',
        createdAt: new Date(),
      });

      const token = signClientToken('block-cli', 'c_block-cli');

      const res = await request(app)
        .post('/client/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          barberId: 'block-bar',
          serviceIds: ['svc-1'],
          timestamp: '2099-09-01T10:00:00.000Z',
        })
        .expect(403);
      expect(res.body.error).toBe('Cannot book this barber');
    });

    it('returns 400 when serviceIds missing', async () => {
      seedClient('cno2');
      const token = signClientToken('cno2', 'c_cno2');

      await request(app)
        .post('/client/bookings')
        .set('Authorization', `Bearer ${token}`)
        .send({ barberId: 'whatever', timestamp: '2099-09-01T10:00:00.000Z' })
        .expect(400);
    });
  });

  describe('GET /client/booking-history', () => {
    it('returns booking contracts for the client (all barbers)', async () => {
      seedApprovedBarber('bh-b1');
      seedClient('bh-c1');
      seedDoc(COLLECTIONS.BARBER_SERVICES, 'bh-s1', {
        id: 'bh-s1',
        barberId: 'bh-b1',
        name: 'Cut',
        price: 50,
      });
      seedDoc(COLLECTIONS.BOOKINGS, 'bh-o1', {
        id: 'bh-o1',
        barberId: 'bh-b1',
        clientId: 'bh-c1',
        timestamp: new Date().toISOString(),
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      seedDoc(COLLECTIONS.BOOKING_SERVICES, 'bh-os1', {
        id: 'bh-os1',
        bookingId: 'bh-o1',
        serviceId: 'bh-s1',
      });
      const token = signClientToken('bh-c1', 'c_bh-c1');

      const res = await request(app)
        .get('/client/booking-history')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].id).toBe('bh-o1');
      expect(res.body.data.items[0].barber_id).toBe('bh-b1');
    });

    it('returns 403 for barber token', async () => {
      seedApprovedBarber('bh-bar');
      const token = signBarberToken('bh-bar', 'b_bh-bar');

      await request(app)
        .get('/client/booking-history')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('PUT /client/update-device-id and DELETE /client/push-token', () => {
    const validExpo =
      'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx]';

    it('stores a valid Expo token', async () => {
      seedClient('cdev1');
      const token = signClientToken('cdev1', 'c_cdev1');

      await request(app)
        .put('/client/update-device-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ deviceId: validExpo })
        .expect(200);

      const c = await clientService.getClientById('cdev1');
      expect(c?.deviceId).toBe(validExpo);
    });

    it('returns 422 for invalid Expo token shape', async () => {
      seedClient('cdev2');
      const token = signClientToken('cdev2', 'c_cdev2');

      await request(app)
        .put('/client/update-device-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ deviceId: 'nope' })
        .expect(422);
    });

    it('clears token on DELETE', async () => {
      seedDoc(COLLECTIONS.CLIENTS, 'cdev-del', {
        id: 'cdev-del',
        username: 'c_cdev-del',
        password: 'x',
        firstName: 'C',
        lastName: 'C',
        phone: '+998901234567',
        deviceId: validExpo,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const token = signClientToken('cdev-del', 'c_cdev-del');

      await request(app)
        .delete('/client/push-token')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const c = await clientService.getClientById('cdev-del');
      expect(c?.deviceId).toBeUndefined();
    });
  });

  describe('GET /client/banner', () => {
    it('returns top barbers', async () => {
      seedApprovedBarber('banner-1');
      seedApprovedBarber('banner-2');
      seedClient('banner-cli');
      const token = signClientToken('banner-cli', 'c_banner');

      const res = await request(app)
        .get('/client/banner')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('/client/favorites', () => {
    it('add, list, and remove a favorite barber', async () => {
      seedApprovedBarber('fav-barber-1');
      seedClient('fav-cli-1');
      const token = signClientToken('fav-cli-1', 'c_fav-cli-1');

      await request(app)
        .post('/client/favorites')
        .set('Authorization', `Bearer ${token}`)
        .send({ barberId: 'fav-barber-1' })
        .expect(200);

      const listRes = await request(app)
        .get('/client/favorites')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(listRes.body.ok).toBe(true);
      expect(Array.isArray(listRes.body.data)).toBe(true);
      expect(listRes.body.data).toHaveLength(1);
      expect(listRes.body.data[0].id).toBe('fav-barber-1');

      // Adding the same barber again is a no-op, not a duplicate.
      await request(app)
        .post('/client/favorites')
        .set('Authorization', `Bearer ${token}`)
        .send({ barberId: 'fav-barber-1' })
        .expect(200);
      const listAfterReAdd = await request(app)
        .get('/client/favorites')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(listAfterReAdd.body.data).toHaveLength(1);

      await request(app)
        .delete('/client/favorites/fav-barber-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const listAfterRemove = await request(app)
        .get('/client/favorites')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(listAfterRemove.body.data).toHaveLength(0);
    });

    it('rejects a missing barberId', async () => {
      seedClient('fav-cli-2');
      const token = signClientToken('fav-cli-2', 'c_fav-cli-2');

      await request(app)
        .post('/client/favorites')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
    });
  });
});
