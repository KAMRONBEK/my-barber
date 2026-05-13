import request from 'supertest';
import { createApp } from '../../appFactory';

const app = createApp();

function barberRegisterBody() {
  return {
    username: `barber_${Math.random().toString(36).slice(2)}`,
    password: 'secret12',
    firstName: 'F',
    lastName: 'L',
    phone: '+998901234567',
    location: 'Tashkent',
    birthDate: '1990-01-15',
    workingHours: '9-5',
  };
}

describe('auth routes', () => {
  it('POST /auth/barber/register creates barber', async () => {
    const body = barberRegisterBody();
    const res = await request(app)
      .post('/auth/barber/register')
      .send(body)
      .expect(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.barber.approval_status).toBeDefined();
  });

  it('POST /auth/barber/login succeeds with valid credentials', async () => {
    const body = barberRegisterBody();
    await request(app).post('/auth/barber/register').send(body).expect(201);

    const res = await request(app)
      .post('/auth/barber/login')
      .send({ username: body.username, password: body.password })
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('POST /auth/barber/login rejects wrong password', async () => {
    const body = barberRegisterBody();
    await request(app).post('/auth/barber/register').send(body).expect(201);

    const res = await request(app)
      .post('/auth/barber/login')
      .send({ username: body.username, password: 'wrongpw12' })
      .expect(401);
    expect(res.body.ok).toBe(false);
  });

  it('POST /auth/barber/register rejects duplicate username', async () => {
    const body = barberRegisterBody();
    await request(app).post('/auth/barber/register').send(body).expect(201);

    const res = await request(app)
      .post('/auth/barber/register')
      .send(body)
      .expect(400);
    expect(res.body.ok).toBe(false);
  });

  it('POST /auth/client/register and login', async () => {
    const username = `client_${Math.random().toString(36).slice(2)}`;
    const reg = await request(app)
      .post('/auth/client/register')
      .send({
        username,
        password: 'secret12',
        firstName: 'C',
        lastName: 'L',
        phone: '+998901234567',
      })
      .expect(201);

    expect(reg.body.success).toBe(true);
    expect(reg.body.token).toBeDefined();

    const login = await request(app)
      .post('/auth/client/login')
      .send({ username, password: 'secret12' })
      .expect(200);

    expect(login.body.ok).toBe(true);
    expect(login.body.data.token).toBeDefined();
  });

  it('POST /auth/client/register rejects duplicate username', async () => {
    const username = `client_${Math.random().toString(36).slice(2)}`;
    const body = {
      username,
      password: 'secret12',
      firstName: 'C',
      lastName: 'L',
      phone: '+998901234567',
    };
    await request(app).post('/auth/client/register').send(body).expect(201);

    const res = await request(app)
      .post('/auth/client/register')
      .send(body)
      .expect(400);
    expect(res.body.ok).toBe(false);
  });

  it('POST /auth/client/login rejects unknown user', async () => {
    const res = await request(app)
      .post('/auth/client/login')
      .send({ username: 'no-such-user', password: 'pass1234' })
      .expect(401);
    expect(res.body.ok).toBe(false);
  });

  it('protected route returns 401 without Authorization header', async () => {
    await request(app).get('/notifications').expect(401);
  });

  it('protected route returns 401 with bearer-without-token', async () => {
    await request(app)
      .get('/notifications')
      .set('Authorization', 'Bearer ')
      .expect(401);
  });

  it('protected route returns 401 with malformed token', async () => {
    await request(app)
      .get('/notifications')
      .set('Authorization', 'Bearer not-a-jwt')
      .expect(401);
  });

  it('barber register validation error returns 400', async () => {
    const res = await request(app)
      .post('/auth/barber/register')
      .send({ username: 'a' })
      .expect(400);
    expect(res.body.ok).toBe(false);
  });

  it('client register validation error returns 400', async () => {
    const res = await request(app)
      .post('/auth/client/register')
      .send({})
      .expect(400);
    expect(res.body.ok).toBe(false);
  });

  it('barber login validation error returns 400', async () => {
    const res = await request(app)
      .post('/auth/barber/login')
      .send({})
      .expect(400);
    expect(res.body.ok).toBe(false);
  });

  it('client login validation error returns 400', async () => {
    const res = await request(app)
      .post('/auth/client/login')
      .send({})
      .expect(400);
    expect(res.body.ok).toBe(false);
  });
});
