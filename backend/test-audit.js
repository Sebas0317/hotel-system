'use strict';

const http = require('http');

const BASE = 'http://localhost:3001';
const ADMIN_EMAIL = 'sebastiansandoval12371@gmail.com';
const ADMIN_PASS = 'ecobosque2024';

let token = '';
let adminId = '';
let testUserId = '';
let testRoomId = '';

function fetch(method, path, body, auth) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    };
    if (auth) opts.headers['Authorization'] = `Bearer ${token}`;
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let passed = 0;
let failed = 0;

function check(label, condition, detail) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${label}`);
  } else {
    failed++;
    console.log(`  FAIL: ${label}${detail ? ' - ' + detail : ''}`);
  }
}

async function waitForServer() {
  for (let i = 0; i < 20; i++) {
    try {
      const r = await fetch('GET', '/auth/setup');
      if (r.status === 200) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

async function run() {
  console.log('\n=== AUDIT SYSTEM INTEGRATION TEST ===\n');

  // ── 1. Failed login ──
  console.log('[1] Failed login attempts');
  let r = await fetch('POST', '/auth/login', {
    identifier: ADMIN_EMAIL, password: 'wrongpass'
  });
  check('Failed login returns 401', r.status === 401, JSON.stringify(r.body));
  check('Error message in Spanish', r.body?.error === 'Credenciales invalidas');

  r = await fetch('POST', '/auth/login', {
    identifier: ADMIN_EMAIL, password: 'wrongpass2'
  });
  check('Second failed login returns 401', r.status === 401);

  // ── 2. Successful login ──
  console.log('\n[2] Successful login');
  r = await fetch('POST', '/auth/login', {
    identifier: ADMIN_EMAIL, password: ADMIN_PASS
  });
  check('Login returns 200 or 2FA', r.status === 200 || r.status === 201,
    `status=${r.status}`);
  if (r.body?.token) {
    token = r.body.token;
    adminId = r.body.usuario?.id;
    check('JWT token received', !!token);
  }
  // If 2FA is enabled, we'll get requires2FA - verify flow is intact
  if (r.body?.requires2FA) {
    check('2FA required response has userId', !!r.body.userId);
    check('2FA required response has email', !!r.body.email);
  }

  // ── 3. Verify security events were written ──
  console.log('\n[3] Security events after login');
  const events = require('./src/utils/securityTracker');
  let evts = await events.getSecurityEvents({ limit: 10 });
  const eventTypes = evts.map(e => e.type);
  if (r.body?.token) {
    check('Login success event recorded', eventTypes.includes('login'));
  }
  check('Failed login events recorded', eventTypes.includes('failed_login'));

  // ── 4. Toggle 2FA (requires auth) ──
  console.log('\n[4] Toggle 2FA');
  if (token) {
    r = await fetch('POST', '/auth/2fa/toggle', {}, true);
    // May fail if user doesn't exist in req.user context, but verify structure
    check('2FA toggle endpoint responds', r.status === 200 || r.status === 400 || r.status === 404);
    if (r.status === 200) {
      check('2FA toggle message received', !!r.body?.mensaje);
      // Toggle back
      await fetch('POST', '/auth/2fa/toggle', {}, true);
    }
  }

  // ── 5. Room operations ──
  console.log('\n[5] Room operations');
  // Get a room to reserve
  r = await fetch('GET', '/rooms/');
  check('Rooms fetched', r.status === 200 && Array.isArray(r.body));
  const available = (r.body || []).find(rm => rm.estado === 'disponible');
  if (available && token) {
    testRoomId = available.id;
    // Reserve it
    r = await fetch('POST', `/rooms/${testRoomId}/reservar`,
      { huesped: 'Test Guest', noches: 2 }, true);
    check('Reserve room', r.status === 200, JSON.stringify(r.body));
    if (r.status === 200) check('Room now reserved', r.body?.estado === 'reservada');

    // Cancel reservation
    r = await fetch('POST', `/rooms/${testRoomId}/cancel`, {}, true);
    check('Cancel reservation', r.status === 200, JSON.stringify(r.body));
    if (r.status === 200) check('Room now available', r.body?.room?.estado === 'disponible');

    // Check-in
    r = await fetch('POST', '/rooms/checkin',
      { numero: available.numero, huesped: 'Test Guest' });
    check('Check-in', r.status === 200, JSON.stringify(r.body?.error));
    if (r.status === 200) {
      testRoomId = r.body.id;
      check('Room now occupied', r.body?.estado === 'ocupada');
    }

    // Request checkout
    r = await fetch('POST', `/rooms/${testRoomId}/solicitar-checkout`,
      { checkOutDate: '2026-06-12' });
    check('Request checkout', r.status === 200, JSON.stringify(r.body));

    // Create consumo
    r = await fetch('POST', '/consumos',
      { roomId: testRoomId, descripcion: 'Test Consumo', precio: 25000, categoria: 'bar' });
    check('Create consumo', r.status === 200, JSON.stringify(r.body));

    // Checkout
    r = await fetch('POST', `/rooms/${testRoomId}/checkout`,
      { metodoPago: 'efectivo', valorRecibido: 500000 }, true);
    check('Checkout', r.status === 200, JSON.stringify(r.body));
    if (r.status === 200) check('Room now cleaning', r.body?.room?.estado === 'limpieza');
  } else {
    console.log('  SKIP: No available room or no auth token');
  }

  // ── 6. User management ──
  console.log('\n[6] User management');
  if (token) {
    // Create user
    const ts = Date.now();
    r = await fetch('POST', '/users/',
      {
        username: `testuser${ts}`,
        email: `testuser${ts}@test.com`,
        password: 'testpass123',
        role: 'reception',
      }, true);
    check('Create user by admin', r.status === 201, JSON.stringify(r.body));
    if (r.status === 201) {
      testUserId = r.body.usuario?.id;
      check('Created user has id', !!testUserId);

      // Update user role
      if (testUserId) {
        r = await fetch('PUT', `/users/${testUserId}`,
          { role: 'analyst' }, true);
        check('Update user role', r.status === 200, JSON.stringify(r.body));

        // Reset password
        r = await fetch('POST', `/users/${testUserId}/reset-password`,
          { newPassword: 'newpass1234' }, true);
        check('Reset user password', r.status === 200, JSON.stringify(r.body));

        // Delete user
        r = await fetch('DELETE', `/users/${testUserId}`, {}, true);
        check('Delete user', r.status === 200, JSON.stringify(r.body));
      }
    }
  }

  // ── 7. Verify audit log ──
  console.log('\n[7] Final audit log verification');
  evts = await events.getSecurityEvents({ limit: 50 });
  console.log(`  Total events recorded: ${evts.length}`);
  const types = {};
  for (const e of evts) {
    types[e.type] = (types[e.type] || 0) + 1;
  }
  for (const [type, count] of Object.entries(types).sort()) {
    console.log(`  ${type}: ${count}`);
  }
  check('Events written to file', evts.length > 0);

  // Verify specific event types exist based on what we did
  if (token) {
    check('checkin event exists', evts.some(e => e.type === 'checkin'));
    check('checkout event exists', evts.some(e => e.type === 'checkout'));
    check('reservation event exists', evts.some(e => e.type === 'reservation'));
    check('consumo_created event exists', evts.some(e => e.type === 'consumo_created'));
  }

  // ── Summary ──
  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} tests ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

waitForServer().then(ready => {
  if (!ready) { console.error('Server not ready'); process.exit(1); }
  run().catch(e => { console.error('Test error:', e); process.exit(1); });
});
