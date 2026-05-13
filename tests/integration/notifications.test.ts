import request from 'supertest';
import { createApp } from '../../appFactory';
import { COLLECTIONS } from '../../config/database';
import { seedDoc } from '../support/mockFirestore';
import { signBarberToken } from '../support/authHelpers';

const app = createApp();

describe('notifications', () => {
  const barberId = 'barber-n1';
  const notifId = 'notif-1';

  beforeEach(() => {
    seedDoc(COLLECTIONS.NOTIFICATIONS, notifId, {
      id: notifId,
      recipientId: barberId,
      recipientType: 'barber',
      type: 'booking_request',
      title: 'T',
      body: 'B',
      readAt: null,
      createdAt: new Date(),
      metadata: {},
    });
  });

  it('GET /notifications returns 401 without token', async () => {
    await request(app).get('/notifications').expect(401);
  });

  it('GET /notifications lists inbox for barber', async () => {
    const token = signBarberToken(barberId, 'barber_n');
    const res = await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.unread_count).toBe(1);
  });

  it('PATCH /notifications/:id/read marks notification read', async () => {
    const token = signBarberToken(barberId, 'barber_n');
    await request(app)
      .patch(`/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const res = await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.unread_count).toBe(0);
  });

  it('POST /notifications/read-all clears unread', async () => {
    const token = signBarberToken(barberId, 'barber_n');
    await request(app)
      .post('/notifications/read-all')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const res = await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.unread_count).toBe(0);
  });
});
