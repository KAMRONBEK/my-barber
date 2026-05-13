import request from 'supertest';
import { createApp } from '../../appFactory';
import { COLLECTIONS } from '../../config/database';
import { seedDoc } from '../support/mockFirestore';
import { signClientToken } from '../support/authHelpers';

const app = createApp();

describe('trust & blocks', () => {
  const clientId = 'client-t1';

  beforeEach(() => {
    seedDoc(COLLECTIONS.CLIENTS, clientId, {
      id: clientId,
      username: 't1',
      password: 'x',
      firstName: 'a',
      lastName: 'b',
      phone: '+998901234567',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('POST /reports returns 401 without auth', async () => {
    await request(app)
      .post('/reports')
      .send({ target_type: 'barber', target_id: 'x', reason: 'spam' })
      .expect(401);
  });

  it('POST /reports creates report', async () => {
    const token = signClientToken(clientId, 't1');
    const res = await request(app)
      .post('/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({
        target_type: 'barber',
        target_id: 'some-barber',
        reason: 'spam',
        description: '',
        attachments: [],
      })
      .expect(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.report.id).toBeDefined();
  });

  it('POST /blocks rejects self-block', async () => {
    const token = signClientToken(clientId, 't1');
    const res = await request(app)
      .post('/blocks')
      .set('Authorization', `Bearer ${token}`)
      .send({ blocked_user_id: clientId })
      .expect(400);
    expect(res.body.ok).toBe(false);
  });

  it('DELETE /blocks/:userId returns 404 when block missing', async () => {
    const token = signClientToken(clientId, 't1');
    await request(app)
      .delete('/blocks/nobody')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});
