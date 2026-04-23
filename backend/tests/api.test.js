/**
 * API tests for EcoBosque Hotel System.
 * Uses Vitest + Supertest to test all endpoints.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

// Set test environment before importing server
process.env.NODE_ENV = 'test';

let app;
let server;

beforeAll(async () => {
  const serverModule = await import('../server.js');
  app = serverModule.app;
  server = serverModule.server;
});

describe('EcoBosque Hotel API', () => {
  let authToken;

  // ── Health Check Tests ──
  describe('GET /', () => {
    it('should return service info', async () => {
      const res = await request(app).get('/');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('service', 'EcoBosque API');
      expect(res.body).toHaveProperty('version');
      expect(res.body).toHaveProperty('docs', '/api-docs');
    });
  });

  describe('GET /health', () => {
    it('should return basic health status', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status', 'healthy');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /health/detailed', () => {
    it('should return detailed health metrics', async () => {
      const res = await request(app).get('/health/detailed');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('memory');
      expect(res.body).toHaveProperty('cache');
      expect(res.body).toHaveProperty('dataFiles');
    });

    it('should include memory metrics', async () => {
      const res = await request(app).get('/health/detailed');
      expect(res.body.memory).toHaveProperty('rss');
      expect(res.body.memory).toHaveProperty('heapUsed');
      expect(res.body.memory).toHaveProperty('heapTotal');
    });
  });

  describe('GET /health/metrics', () => {
    it('should return system metrics', async () => {
      const res = await request(app).get('/health/metrics');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('memory');
      expect(res.body).toHaveProperty('cache');
    });
  });

  // ── Rooms Tests ──
  describe('GET /rooms', () => {
    it('should return all rooms', async () => {
      const res = await request(app).get('/rooms');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should return rooms with required fields', async () => {
      const res = await request(app).get('/rooms');
      const room = res.body[0];
      expect(room).toHaveProperty('id');
      expect(room).toHaveProperty('numero');
      expect(room).toHaveProperty('tipo');
      expect(room).toHaveProperty('estado');
    });
  });

  describe('GET /rooms/stats', () => {
    it('should return room statistics', async () => {
      const res = await request(app).get('/rooms/stats');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('disponibles');
      expect(res.body).toHaveProperty('ocupadas');
    });
  });

  // ── Auth Tests ──
  describe('POST /auth/login', () => {
    it('should fail with wrong password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ password: 'wrongpassword' });
      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should succeed with correct password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ password: process.env.ADMIN_PASSWORD || 'ecobosque2024' });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      authToken = res.body.token;
    });
  });

  // ── Protected Routes Tests ──
  describe('GET /prices (protected)', () => {
    it('should reject without token', async () => {
      const res = await request(app).get('/prices');
      expect(res.statusCode).toBe(401);
    });

    it('should accept with valid token', async () => {
      const res = await request(app)
        .get('/prices')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('hotel');
    });
  });

  // ── Consumos Tests ──
  describe('GET /consumos/:roomId', () => {
    it('should return empty array for non-existent room', async () => {
      const res = await request(app).get('/consumos/test-room');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ── History Tests (protected) ──
  describe('GET /history (protected)', () => {
    it('should reject without token', async () => {
      const res = await request(app).get('/history');
      expect(res.statusCode).toBe(401);
    });

    it('should accept with valid token', async () => {
      const res = await request(app)
        .get('/history')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
      // History endpoint returns { reservas: [...] }
      expect(res.body).toHaveProperty('reservas');
      expect(Array.isArray(res.body.reservas)).toBe(true);
    });
  });

  // ── Security Tests ──
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

  // Cleanup
  afterAll(() => {
    server.close();
  });
});
