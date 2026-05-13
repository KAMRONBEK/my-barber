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

describe('barber misc routes', () => {
  describe('GET /barber/ (list)', () => {
    it('returns paginated list', async () => {
      seedApprovedBarber('b1');
      seedApprovedBarber('b2');
      const token = signBarberToken('b1', 'b_b1');

      const res = await request(app)
        .get('/barber/')
        .query({ page: 0, limit: 10 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.data.barbers.length).toBeGreaterThanOrEqual(2);
    });

    it('rejects invalid limit', async () => {
      seedApprovedBarber('b1');
      const token = signBarberToken('b1', 'b_b1');

      await request(app)
        .get('/barber/')
        .query({ limit: 999 })
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('GET /barbers/ matches GET /barber/ list behavior', async () => {
      seedApprovedBarber('b-s1');
      const token = signBarberToken('b-s1', 'b_b-s1');

      const res = await request(app)
        .get('/barbers/')
        .query({ page: 0, limit: 10 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.data.barbers)).toBe(true);
    });
  });

  describe('GET /barber/getMe', () => {
    it('returns the authenticated barber', async () => {
      seedApprovedBarber('me1');
      const token = signBarberToken('me1', 'b_me1');

      const res = await request(app)
        .get('/barber/getMe')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.barber.id).toBe('me1');
      expect(res.body.data.services).toEqual([]);
    });

    it('returns 403 for client tokens', async () => {
      seedApprovedBarber('me2');
      seedClient('c1');
      const token = signClientToken('c1', 'c_c1');

      await request(app)
        .get('/barber/getMe')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('PUT /barber/update', () => {
    it('updates name fields', async () => {
      seedApprovedBarber('u1');
      const token = signBarberToken('u1', 'b_u1');

      const res = await request(app)
        .put('/barber/update')
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'New', lastName: 'Name' })
        .expect(200);

      expect(res.body.ok).toBe(true);
    });

    it('returns 400 on invalid phone', async () => {
      seedApprovedBarber('u2');
      const token = signBarberToken('u2', 'b_u2');

      await request(app)
        .put('/barber/update')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: 'not-a-phone' })
        .expect(400);
    });
  });

  describe('POST /barber/update-credentials', () => {
    it('updates credentials', async () => {
      seedApprovedBarber('uc1');
      const token = signBarberToken('uc1', 'b_uc1');

      const res = await request(app)
        .post('/barber/update-credentials')
        .set('Authorization', `Bearer ${token}`)
        .send({ username: 'newname', password: 'pass1234' })
        .expect(200);

      expect(res.body.ok).toBe(true);
    });

    it('rejects short password', async () => {
      seedApprovedBarber('uc2');
      const token = signBarberToken('uc2', 'b_uc2');

      await request(app)
        .post('/barber/update-credentials')
        .set('Authorization', `Bearer ${token}`)
        .send({ username: 'ok', password: '123' })
        .expect(400);
    });
  });

  describe('POST /barber/add-service', () => {
    it('accepts an array of services', async () => {
      seedApprovedBarber('s1');
      const token = signBarberToken('s1', 'b_s1');

      const res = await request(app)
        .post('/barber/add-service')
        .set('Authorization', `Bearer ${token}`)
        .send([{ name: 'Cut', price: 50000 }])
        .expect(200);

      expect(res.body.ok).toBe(true);
    });

    it('rejects invalid price', async () => {
      seedApprovedBarber('s2');
      const token = signBarberToken('s2', 'b_s2');

      await request(app)
        .post('/barber/add-service')
        .set('Authorization', `Bearer ${token}`)
        .send([{ name: 'Cut', price: -10 }])
        .expect(400);
    });
  });

  describe('DELETE /barber/delete-service/:id', () => {
    it('deletes service by id', async () => {
      seedApprovedBarber('del1');
      seedDoc(COLLECTIONS.BARBER_SERVICES, 'svc-del-1', {
        id: 'svc-del-1',
        barberId: 'del1',
        name: 'X',
        price: 1,
      });
      const token = signBarberToken('del1', 'b_del1');

      const res = await request(app)
        .delete('/barber/delete-service/svc-del-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe('GET /barber/bookings', () => {
    it('returns bookings without date filter', async () => {
      seedApprovedBarber('ord1');
      seedClient('cord1');
      seedDoc(COLLECTIONS.BOOKINGS, 'ord-list-1', {
        id: 'ord-list-1',
        barberId: 'ord1',
        clientId: 'cord1',
        timestamp: new Date().toISOString(),
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const token = signBarberToken('ord1', 'b_ord1');

      const res = await request(app)
        .get('/barber/bookings')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.data.length).toBe(1);
    });

    it('returns 400 for invalid date', async () => {
      seedApprovedBarber('ord2');
      const token = signBarberToken('ord2', 'b_ord2');

      await request(app)
        .get('/barber/bookings')
        .query({ date: 'not-a-date' })
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  describe('GET /barber/services contract', () => {
    it('returns empty services array', async () => {
      seedApprovedBarber('svc1');
      const token = signBarberToken('svc1', 'b_svc1');

      const res = await request(app)
        .get('/barber/services')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.data.services).toEqual([]);
    });

    it('returns 403 for client', async () => {
      seedClient('cs');
      const token = signClientToken('cs', 'c_cs');

      await request(app)
        .get('/barber/services')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('PUT /barber/services', () => {
    it('upserts catalog-linked services', async () => {
      seedApprovedBarber('upsert1');
      const token = signBarberToken('upsert1', 'b_upsert1');

      const res = await request(app)
        .put('/barber/services')
        .set('Authorization', `Bearer ${token}`)
        .send({
          services: [
            {
              catalog_service_id: 'haircut',
              name: 'Haircut',
              price: 50000,
              duration_minutes: 30,
              is_active: true,
            },
          ],
        })
        .expect(200);

      expect(res.body.data.services.length).toBe(1);
      expect(res.body.data.services[0].duration_minutes).toBe(30);
    });

    it('rejects empty services array', async () => {
      seedApprovedBarber('upsert2');
      const token = signBarberToken('upsert2', 'b_upsert2');

      await request(app)
        .put('/barber/services')
        .set('Authorization', `Bearer ${token}`)
        .send({ services: [] })
        .expect(400);
    });
  });

  describe('DELETE /barber/services/:serviceId', () => {
    it('soft-deletes service and returns updated list', async () => {
      seedApprovedBarber('softdel1');
      seedDoc(COLLECTIONS.BARBER_SERVICES, 'svc-soft-1', {
        id: 'svc-soft-1',
        barberId: 'softdel1',
        name: 'X',
        price: 1,
        isActive: true,
      });
      const token = signBarberToken('softdel1', 'b_softdel1');

      const res = await request(app)
        .delete('/barber/services/svc-soft-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.data.services[0].is_active).toBe(false);
    });

    it('returns 404 for unknown service', async () => {
      seedApprovedBarber('softdel2');
      const token = signBarberToken('softdel2', 'b_softdel2');

      await request(app)
        .delete('/barber/services/nope')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('PUT /barber/update-device-id', () => {
    const validExpo = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx]';

    it('updates Expo push token', async () => {
      seedApprovedBarber('dev1');
      const token = signBarberToken('dev1', 'b_dev1');

      const res = await request(app)
        .put('/barber/update-device-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ deviceId: validExpo })
        .expect(200);
      expect(res.body.ok).toBe(true);
    });

    it('rejects malformed Expo tokens with 422', async () => {
      seedApprovedBarber('dev3');
      const token = signBarberToken('dev3', 'b_dev3');

      await request(app)
        .put('/barber/update-device-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ deviceId: 'not-an-expo-token' })
        .expect(422);
    });

    it('rejects empty device id', async () => {
      seedApprovedBarber('dev2');
      const token = signBarberToken('dev2', 'b_dev2');

      await request(app)
        .put('/barber/update-device-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ deviceId: '' })
        .expect(400);
    });
  });

  describe('DELETE /barber/push-token', () => {
    it('clears stored push token', async () => {
      const validExpo =
        'ExponentPushToken[yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy]';

      seedDoc(COLLECTIONS.BARBERS, 'bdev-d', {
        id: 'bdev-d',
        username: 'b_bdev-d',
        password: 'x',
        firstName: 'B',
        lastName: 'B',
        phone: '+998901234567',
        location: { latitude: '0', longitude: '0' },
        birthDate: '1990-01-01',
        workingHours: '9-5',
        images: [],
        deviceId: validExpo,
        approvalStatus: 'approved',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const token = signBarberToken('bdev-d', 'b_bdev-d');
      await request(app)
        .delete('/barber/push-token')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const { barberService } = await import('../../services/barberService');
      const b = await barberService.getBarberById('bdev-d');
      expect(b?.deviceId).toBeUndefined();
    });
  });
});
