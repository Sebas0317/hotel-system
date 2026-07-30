/**
 * API tests for EcoBosque Hotel System.
 * Tests core endpoints: health, rooms, security, rate limiting.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

process.env.NODE_ENV = 'test';

const TEST_USER = {
  username: `test_${Date.now()}`,
  email: `test_${Date.now()}@test.com`,
  password: 'TestUser123!',
};

let app;
let serverModule;
let authCookie;

beforeAll(async () => {
  serverModule = await import('../server.js');
  app = serverModule.app;
});

// ── Health Check ──
describe('GET /', () => {
  it('should return service info', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('service', 'EcoBosque API');
  });
});

describe('GET /health', () => {
  it('should return basic health status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
  });
});

describe('GET /health/detailed', () => {
  it('should return detailed health metrics', async () => {
    const res = await request(app).get('/health/detailed');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('memory');
  });
});

// ── Rooms Tests ──
describe('GET /rooms', () => {
  it('should return rooms array', async () => {
    const res = await request(app).get('/rooms');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ── Auth & Protected Routes ──
describe('Authentication flow', () => {
  it('should fail login with wrong password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ identifier: 'admin@ecobosque.com', password: 'wrongpassword' })
    expect(res.statusCode).toBe(401);
  });

  it('should register a test user', { timeout: 20000 }, async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ ...TEST_USER })
    expect(res.statusCode).toBe(201);
  });

  it('should login as test user and get cookie', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ identifier: TEST_USER.email, password: TEST_USER.password })
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    // Extract the httpOnly cookie for subsequent requests
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    authCookie = cookies.find(c => c.startsWith('token='));
    expect(authCookie).toBeDefined();
  });

  it('should set httpOnly cookie on login', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ identifier: TEST_USER.email, password: TEST_USER.password })
    expect(res.statusCode).toBe(200);
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const tokenCookie = cookies.find(c => c.startsWith('token='));
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie).toContain('HttpOnly');
    expect(tokenCookie).toContain('SameSite=Strict');
  });

  it('should reject protected routes without token', async () => {
    const res = await request(app).get('/prices');
    expect(res.statusCode).toBe(401);
  });

  it('should accept protected routes with valid cookie', async () => {
    const res = await request(app)
      .get('/prices')
      .set('Cookie', authCookie);
    expect(res.statusCode).toBe(200);
  });

  it('should reject /users without token', async () => {
    const res = await request(app).get('/users');
    expect(res.statusCode).toBe(401);
  });

  it('should reject /users for non-admin role', async () => {
    const res = await request(app)
      .get('/users')
      .set('Cookie', authCookie);
    expect(res.statusCode).toBe(403);
  });
});

// ── Security Headers ──
describe('Security headers', () => {
  it('should include security headers', async () => {
    const res = await request(app).get('/');
    expect(res.headers).toHaveProperty('strict-transport-security');
    expect(res.headers).toHaveProperty('x-content-type-options', 'nosniff');
    expect(res.headers).toHaveProperty('x-frame-options');
  });

  it('should NOT expose X-Powered-By', async () => {
    const res = await request(app).get('/');
    expect(res.headers).not.toHaveProperty('x-powered-by');
  });
});

// ── Rate Limiting ──
describe('Rate Limiting', () => {
  it('should rate-limit login attempts', async () => {
    const promises = Array.from({ length: 8 }, () =>
      request(app)
        .post('/auth/login')
        .send({ identifier: 'test@test.com', password: 'wrong' })
    );
    const results = await Promise.all(promises);
    const rateLimited = results.some(r => r.statusCode === 429);
    expect(rateLimited).toBe(true);
  });
});

// ── Cleanup ──
afterAll(() => {
  if (serverModule.server) serverModule.server.close();
});
