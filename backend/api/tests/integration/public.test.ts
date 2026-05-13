import request from 'supertest';
import { createApp } from '../../appFactory';
import { COLLECTIONS } from '../../config/database';
import { seedDoc } from '../support/mockFirestore';

const app = createApp();

describe('public routes', () => {
  it('GET /services/catalog returns catalog', async () => {
    const res = await request(app).get('/services/catalog').expect(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.services)).toBe(true);
    expect(res.body.data.services.length).toBeGreaterThan(0);
  });

  it('GET /barbers/:id/reviews returns seeded reviews', async () => {
    const barberId = 'barber-rev-1';
    seedDoc(COLLECTIONS.REVIEWS, 'rev-1', {
      id: 'rev-1',
      bookingId: 'ord-1',
      barberId,
      clientId: 'c1',
      rating: 5,
      comment: 'Great',
      serviceIds: [],
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
    });

    const res = await request(app)
      .get(`/barbers/${barberId}/reviews`)
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].rating).toBe(5);
  });

  it('GET /barbers/:id/reviews rejects invalid limit', async () => {
    const res = await request(app)
      .get('/barbers/x/reviews')
      .query({ limit: 99 })
      .expect(400);
    expect(res.body.ok).toBe(false);
  });
});
