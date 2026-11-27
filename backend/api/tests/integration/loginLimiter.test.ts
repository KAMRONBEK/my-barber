/* eslint-env jest */
import request from 'supertest';

describe('failed login limiter', () => {
  afterAll(() => {
    delete process.env.AUTH_RATE_LIMIT_MAX;
  });

  it('blocks repeated failures for one username only', async () => {
    process.env.AUTH_RATE_LIMIT_MAX = '2';
    // The limiter reads the setting when the routes are first loaded.
    const { createApp } = await import('../../appFactory');
    const app = createApp();
    const attempt = (username: string) =>
      request(app)
        .post('/auth/client/login')
        .send({ username, password: 'wrong-password' });

    await attempt('+998 90 111 22 33').expect(401);
    await attempt('+998901112233').expect(401);
    await attempt('+998901112233').expect(429);
    await attempt('+998904445566').expect(401);
  });
});
