/* eslint-env jest */
import request from 'supertest';
import { createApp } from '../../appFactory';

const app = createApp();

describe('system routes', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.environment).toBe('test');
  });

  it('GET / returns API info envelope', async () => {
    const res = await request(app).get('/').expect(200);
    expect(res.body.name).toBe('My Barber API');
    expect(res.body.endpoints.barber.base).toBe('/barber');
    expect(res.body.endpoints.barber.alsoMountedAt).toBe('/barbers');
    expect(res.body.links.documentation).toContain('/docs');
    expect(res.body.links.openApiJson).toContain('/docs.json');
    expect(res.body.endpoints.openApiJson).toBe('/docs.json');
  });

  it('GET /metrics returns prometheus content', async () => {
    await request(app).get('/health').expect(200);

    const res = await request(app).get('/metrics').expect(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toContain('barber_http_request_duration_seconds');
  });

  it('GET /docs.json returns swagger spec', async () => {
    const res = await request(app).get('/docs.json').expect(200);
    expect(res.body.openapi || res.body.swagger).toBeDefined();
  });

  it('GET /docs returns swagger UI HTML', async () => {
    const res = await request(app).get('/docs').expect(200);
    expect(res.text).toContain('swagger-ui');
  });

  it('JSON parsing error returns 400 envelope', async () => {
    const res = await request(app)
      .post('/auth/client/login')
      .set('Content-Type', 'application/json')
      .send('{not-valid-json')
      .expect(400);
    expect(res.body.ok).toBe(false);
  });
});
