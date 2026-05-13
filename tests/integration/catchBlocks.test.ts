/* eslint-env jest */
import request from 'supertest';
import { createApp } from '../../appFactory';
import { COLLECTIONS } from '../../config/database';
import { seedDoc } from '../support/mockFirestore';
import { signBarberToken, signClientToken } from '../support/authHelpers';
import { barberService } from '../../services/barberService';
import { clientService } from '../../services/clientService';
import { bookingService } from '../../services/bookingService';
import { authService } from '../../services/authService';
import { reviewService } from '../../services/reviewService';
import { earningsService } from '../../services/earningsService';
import { trustService } from '../../services/trustService';
import { blockService } from '../../services/blockService';
import { notificationInboxService } from '../../services/notificationInboxService';

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
  status = 'confirmed'
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

const barberId = 'cb-b';
const clientId = 'cb-c';

describe('route catch-block coverage via spied service errors', () => {
  beforeEach(() => {
    seedApprovedBarber(barberId);
    seedClient(clientId);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('GET /barber/ returns 500 when service throws', async () => {
    jest.spyOn(barberService, 'getAllBarbers').mockRejectedValueOnce(
      new Error('boom')
    );
    const token = signBarberToken(barberId);
    const res = await request(app)
      .get('/barber/')
      .set('Authorization', `Bearer ${token}`)
      .expect(500);
    expect(res.body.ok).toBe(false);
  });

  it('GET /barber/getMe returns 500 when service throws', async () => {
    jest.spyOn(barberService, 'getBarberWithServices').mockRejectedValueOnce(
      new Error('boom')
    );
    const token = signBarberToken(barberId);
    await request(app)
      .get('/barber/getMe')
      .set('Authorization', `Bearer ${token}`)
      .expect(500);
  });

  it('PUT /barber/update returns 500 when service throws', async () => {
    jest.spyOn(barberService, 'updateBarberProfile').mockRejectedValueOnce(
      new Error('boom')
    );
    const token = signBarberToken(barberId);
    await request(app)
      .put('/barber/update')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'New' })
      .expect(500);
  });

  it('POST /barber/update-credentials returns 500 when service throws', async () => {
    jest
      .spyOn(authService, 'barberUpdateCredentials')
      .mockRejectedValueOnce(new Error('boom'));
    const token = signBarberToken(barberId);
    await request(app)
      .post('/barber/update-credentials')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'newname', password: 'pass1234' })
      .expect(500);
  });

  it('POST /barber/update-credentials returns 400 when authService returns ok=false', async () => {
    jest
      .spyOn(authService, 'barberUpdateCredentials')
      .mockResolvedValueOnce({ ok: false, error: 'taken' });
    const token = signBarberToken(barberId);
    await request(app)
      .post('/barber/update-credentials')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'newname', password: 'pass1234' })
      .expect(400);
  });

  it('POST /barber/add-service returns 500 when service throws', async () => {
    jest.spyOn(barberService, 'addBarberServices').mockRejectedValueOnce(
      new Error('boom')
    );
    const token = signBarberToken(barberId);
    await request(app)
      .post('/barber/add-service')
      .set('Authorization', `Bearer ${token}`)
      .send([{ name: 'X', price: 1 }])
      .expect(500);
  });

  it('DELETE /barber/delete-service/:id returns 500 when service throws', async () => {
    jest.spyOn(barberService, 'deleteBarberService').mockRejectedValueOnce(
      new Error('boom')
    );
    const token = signBarberToken(barberId);
    await request(app)
      .delete('/barber/delete-service/x')
      .set('Authorization', `Bearer ${token}`)
      .expect(500);
  });

  it('GET /barber/bookings returns 500 when service throws', async () => {
    jest.spyOn(barberService, 'getBarberBookings').mockRejectedValueOnce(
      new Error('boom')
    );
    const token = signBarberToken(barberId);
    await request(app)
      .get('/barber/bookings')
      .set('Authorization', `Bearer ${token}`)
      .expect(500);
  });

  it('PATCH /barber/bookings/:id/status returns 500 on unexpected error', async () => {
    seedBooking('cb-o-status', barberId, clientId, 'pending_confirmation');
    jest
      .spyOn(bookingService, 'patchBarberBookingStatus')
      .mockRejectedValueOnce(new Error('boom'));
    const token = signBarberToken(barberId);
    await request(app)
      .patch('/barber/bookings/cb-o-status/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'confirmed' })
      .expect(500);
  });

  it('POST /barber/bookings/:id/cancel returns 500 on unexpected error', async () => {
    seedBooking('cb-o-cancel', barberId, clientId);
    jest.spyOn(bookingService, 'cancelBooking').mockRejectedValueOnce(
      new Error('boom')
    );
    const token = signBarberToken(barberId);
    await request(app)
      .post('/barber/bookings/cb-o-cancel/cancel')
      .set('Authorization', `Bearer ${token}`)
      .expect(500);
  });

  it('POST /barber/bookings/:id/reschedule returns 500 on unexpected error', async () => {
    seedBooking('cb-o-resched', barberId, clientId);
    jest
      .spyOn(bookingService, 'rescheduleBooking')
      .mockRejectedValueOnce(new Error('boom'));
    const token = signBarberToken(barberId);
    await request(app)
      .post('/barber/bookings/cb-o-resched/reschedule')
      .set('Authorization', `Bearer ${token}`)
      .send({ timestamp: '2099-01-01T00:00:00.000Z' })
      .expect(500);
  });

  it('POST /barber/bookings/:id/no-show returns 500 on unexpected error', async () => {
    seedBooking('cb-o-noshow', barberId, clientId);
    jest.spyOn(bookingService, 'markNoShow').mockRejectedValueOnce(
      new Error('boom')
    );
    const token = signBarberToken(barberId);
    await request(app)
      .post('/barber/bookings/cb-o-noshow/no-show')
      .set('Authorization', `Bearer ${token}`)
      .expect(500);
  });

  it('POST /barber/bookings/:id/complete returns 500 on unexpected error', async () => {
    seedBooking('cb-o-complete', barberId, clientId);
    jest.spyOn(bookingService, 'completeBooking').mockRejectedValueOnce(
      new Error('boom')
    );
    const token = signBarberToken(barberId);
    await request(app)
      .post('/barber/bookings/cb-o-complete/complete')
      .set('Authorization', `Bearer ${token}`)
      .expect(500);
  });

  it('GET /barber/earnings returns 500 when service throws', async () => {
    jest.spyOn(earningsService, 'getBarberEarnings').mockRejectedValueOnce(
      new Error('boom')
    );
    const token = signBarberToken(barberId);
    await request(app)
      .get('/barber/earnings')
      .query({ from: '2026-05-01', to: '2026-05-31' })
      .set('Authorization', `Bearer ${token}`)
      .expect(500);
  });

  it('GET /barber/services returns 500 when service throws', async () => {
    jest
      .spyOn(barberService, 'listBarberServicesContract')
      .mockRejectedValueOnce(new Error('boom'));
    const token = signBarberToken(barberId);
    await request(app)
      .get('/barber/services')
      .set('Authorization', `Bearer ${token}`)
      .expect(500);
  });

  it('PUT /barber/services returns 500 when service throws', async () => {
    jest
      .spyOn(barberService, 'upsertBarberServicesLineItems')
      .mockRejectedValueOnce(new Error('boom'));
    const token = signBarberToken(barberId);
    await request(app)
      .put('/barber/services')
      .set('Authorization', `Bearer ${token}`)
      .send({
        services: [
          {
            catalog_service_id: 'c1',
            name: 'X',
            price: 1,
            duration_minutes: 30,
            is_active: true,
          },
        ],
      })
      .expect(500);
  });

  it('DELETE /barber/services/:id returns 500 when service throws', async () => {
    jest
      .spyOn(barberService, 'softDeleteBarberService')
      .mockRejectedValueOnce(new Error('boom'));
    const token = signBarberToken(barberId);
    await request(app)
      .delete('/barber/services/abc')
      .set('Authorization', `Bearer ${token}`)
      .expect(500);
  });

  it('PUT /barber/update-device-id returns 500 when service throws', async () => {
    jest.spyOn(barberService, 'updateBarberDeviceId').mockRejectedValueOnce(
      new Error('boom')
    );
    const token = signBarberToken(barberId);
    await request(app)
      .put('/barber/update-device-id')
      .set('Authorization', `Bearer ${token}`)
      .send({
        deviceId: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx]',
      })
      .expect(500);
  });

  it('GET /client/getMe returns 500 when service throws', async () => {
    jest.spyOn(clientService, 'getClientById').mockRejectedValueOnce(
      new Error('boom')
    );
    const token = signClientToken(clientId);
    await request(app)
      .get('/client/getMe')
      .set('Authorization', `Bearer ${token}`)
      .expect(500);
  });

  it('PUT /client/update returns 500 when service throws', async () => {
    jest.spyOn(clientService, 'updateClientProfile').mockRejectedValueOnce(
      new Error('boom')
    );
    const token = signClientToken(clientId);
    await request(app)
      .put('/client/update')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'X' })
      .expect(500);
  });

  it('POST /client/update-credentials returns 500 when service throws', async () => {
    jest
      .spyOn(authService, 'clientUpdateCredentials')
      .mockRejectedValueOnce(new Error('boom'));
    const token = signClientToken(clientId);
    await request(app)
      .post('/client/update-credentials')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'newname', password: 'pass1234' })
      .expect(500);
  });

  it('POST /client/update-credentials returns 400 when authService returns ok=false', async () => {
    jest
      .spyOn(authService, 'clientUpdateCredentials')
      .mockResolvedValueOnce({ ok: false, error: 'taken' });
    const token = signClientToken(clientId);
    await request(app)
      .post('/client/update-credentials')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'newname', password: 'pass1234' })
      .expect(400);
  });

  it('GET /client/bookings returns 500 when service throws', async () => {
    jest.spyOn(clientService, 'getClientBookings').mockRejectedValueOnce(
      new Error('boom')
    );
    const token = signClientToken(clientId);
    await request(app)
      .get('/client/bookings')
      .query({ barber_id: 'b' })
      .set('Authorization', `Bearer ${token}`)
      .expect(500);
  });

  it('POST /client/bookings returns 500 when service throws unexpected', async () => {
    jest.spyOn(bookingService, 'createBooking').mockRejectedValueOnce(
      new Error('boom')
    );
    const token = signClientToken(clientId);
    await request(app)
      .post('/client/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        barberId: 'b',
        serviceIds: ['s'],
        timestamp: '2099-01-01T00:00:00.000Z',
      })
      .expect(500);
  });

  it('POST /client/bookings/:id/cancel returns 500 on unexpected error', async () => {
    seedBooking('cb-cli-cancel', barberId, clientId);
    jest.spyOn(bookingService, 'cancelBooking').mockRejectedValueOnce(
      new Error('boom')
    );
    const token = signClientToken(clientId);
    await request(app)
      .post('/client/bookings/cb-cli-cancel/cancel')
      .set('Authorization', `Bearer ${token}`)
      .expect(500);
  });

  it('POST /client/bookings/:id/reschedule returns 500 on unexpected error', async () => {
    seedBooking('cb-cli-resched', barberId, clientId);
    jest
      .spyOn(bookingService, 'rescheduleBooking')
      .mockRejectedValueOnce(new Error('boom'));
    const token = signClientToken(clientId);
    await request(app)
      .post('/client/bookings/cb-cli-resched/reschedule')
      .set('Authorization', `Bearer ${token}`)
      .send({ timestamp: '2099-01-01T00:00:00.000Z' })
      .expect(500);
  });

  it('POST /client/bookings/:id/review returns 500 on unexpected error', async () => {
    seedBooking('cb-cli-rev', barberId, clientId, 'completed');
    jest.spyOn(reviewService, 'createReview').mockRejectedValueOnce(
      new Error('boom')
    );
    const token = signClientToken(clientId);
    await request(app)
      .post('/client/bookings/cb-cli-rev/review')
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 5, comment: 'good' })
      .expect(500);
  });

  it('GET /client/banner returns 500 when service throws', async () => {
    jest.spyOn(barberService, 'getAllBarbers').mockRejectedValueOnce(
      new Error('boom')
    );
    const token = signClientToken(clientId);
    await request(app)
      .get('/client/banner')
      .set('Authorization', `Bearer ${token}`)
      .expect(500);
  });

  it('GET /notifications returns 500 when service throws', async () => {
    jest.spyOn(notificationInboxService, 'listForUser').mockRejectedValueOnce(
      new Error('boom')
    );
    const token = signClientToken(clientId);
    await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${token}`)
      .expect(500);
  });

  it('PATCH /notifications/:id/read returns 500 when service throws', async () => {
    jest.spyOn(notificationInboxService, 'markRead').mockRejectedValueOnce(
      new Error('boom')
    );
    const token = signClientToken(clientId);
    await request(app)
      .patch('/notifications/x/read')
      .set('Authorization', `Bearer ${token}`)
      .expect(500);
  });

  it('POST /notifications/read-all returns 500 when service throws', async () => {
    jest
      .spyOn(notificationInboxService, 'markAllRead')
      .mockRejectedValueOnce(new Error('boom'));
    const token = signClientToken(clientId);
    await request(app)
      .post('/notifications/read-all')
      .set('Authorization', `Bearer ${token}`)
      .expect(500);
  });

  it('POST /reports returns 500 when service throws', async () => {
    jest.spyOn(trustService, 'createReport').mockRejectedValueOnce(
      new Error('boom')
    );
    const token = signClientToken(clientId);
    await request(app)
      .post('/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        target_type: 'client',
        target_id: 'a',
        reason: 'b',
      })
      .expect(500);
  });

  it('POST /blocks returns 500 when service throws non-INVALID error', async () => {
    jest.spyOn(blockService, 'addBlock').mockRejectedValueOnce(
      new Error('boom')
    );
    const token = signClientToken(clientId);
    await request(app)
      .post('/blocks')
      .set('Authorization', `Bearer ${token}`)
      .send({ blocked_user_id: 'a' })
      .expect(500);
  });

  it('DELETE /blocks/:id returns 500 when service throws', async () => {
    jest.spyOn(blockService, 'removeBlock').mockRejectedValueOnce(
      new Error('boom')
    );
    const token = signClientToken(clientId);
    await request(app)
      .delete('/blocks/x')
      .set('Authorization', `Bearer ${token}`)
      .expect(500);
  });
});

describe('authService catch blocks', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('barberRegister returns Registration failed on unexpected error', async () => {
    jest.spyOn(barberService, 'getBarberByUsername').mockRejectedValueOnce(
      new Error('boom')
    );
    const out = await authService.barberRegister({
      username: 'x',
      password: 'pass1234',
      firstName: 'F',
      lastName: 'L',
      phone: '+1',
      location: { latitude: '0', longitude: '0' },
      birthDate: '1990-01-01',
      workingHours: '9-5',
    });
    expect(out.ok).toBe(false);
    expect(out.error).toBe('Registration failed');
  });

  it('barberLogin returns Login failed on unexpected error', async () => {
    jest.spyOn(barberService, 'getBarberByUsername').mockRejectedValueOnce(
      new Error('boom')
    );
    const out = await authService.barberLogin({
      username: 'x',
      password: 'pass1234',
    });
    expect(out.ok).toBe(false);
    expect(out.error).toBe('Login failed');
  });

  it('clientRegister returns Registration failed on unexpected error', async () => {
    jest.spyOn(clientService, 'getClientByUsername').mockRejectedValueOnce(
      new Error('boom')
    );
    const out = await authService.clientRegister({
      username: 'x',
      password: 'pass1234',
      firstName: 'F',
      lastName: 'L',
      phone: '+1',
    });
    expect(out.ok).toBe(false);
    expect(out.error).toBe('Registration failed');
  });

  it('clientLogin returns Login failed on unexpected error', async () => {
    jest.spyOn(clientService, 'getClientByUsername').mockRejectedValueOnce(
      new Error('boom')
    );
    const out = await authService.clientLogin({
      username: 'x',
      password: 'pass1234',
    });
    expect(out.ok).toBe(false);
    expect(out.error).toBe('Login failed');
  });

  it('barberUpdateCredentials returns error on failure', async () => {
    jest
      .spyOn(barberService, 'updateBarberCredentials')
      .mockRejectedValueOnce(new Error('boom'));
    const out = await authService.barberUpdateCredentials('x', 'u', 'p');
    expect(out.ok).toBe(false);
  });

  it('clientUpdateCredentials returns error on failure', async () => {
    jest
      .spyOn(clientService, 'updateClientCredentials')
      .mockRejectedValueOnce(new Error('boom'));
    const out = await authService.clientUpdateCredentials('x', 'u', 'p');
    expect(out.ok).toBe(false);
  });

  it('verifyToken returns null on invalid token', () => {
    expect(authService.verifyToken('not-a-jwt')).toBeNull();
  });

  it('barberLogin succeeds via real flow (covers happy authService.barberLogin path)', async () => {
    const username = `bl_${Date.now()}`;
    await authService.barberRegister({
      username,
      password: 'secret12',
      firstName: 'F',
      lastName: 'L',
      phone: '+1',
      location: { latitude: '0', longitude: '0' },
      birthDate: '1990-01-01',
      workingHours: '9-5',
    });
    const out = await authService.barberLogin({ username, password: 'secret12' });
    expect(out.ok).toBe(true);
  });

  it('barberLogin returns invalid credentials when user missing', async () => {
    const out = await authService.barberLogin({
      username: 'no-such-user',
      password: 'p',
    });
    expect(out.ok).toBe(false);
    expect(out.error).toBe('Invalid credentials');
  });
});
