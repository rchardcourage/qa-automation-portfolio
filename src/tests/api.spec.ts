import { test, expect } from '../core/fixtures';
import { USERS, apiLogin, bearer } from '../core/data';

test.describe('REST API contract and security @api', () => {
  test('TC-API-001 login returns a token, role and name @smoke', async ({ request }) => {
    const res = await request.post('/api/login', { data: { email: USERS.ada.email, password: USERS.ada.password } });
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ token: expect.stringMatching(/^[0-9a-f]{32}$/), role: 'customer', name: 'Ada Obi' });
  });

  test('TC-API-002 protected endpoints return 401 without a token @regression', async ({ request }) => {
    for (const path of ['/api/wallet', '/api/transactions', '/api/loans', '/api/admin/loans']) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(401);
      expect((await res.json()).error.code).toBe('UNAUTHENTICATED');
    }
  });

  test('TC-API-003 customer token cannot use admin endpoints (403) @regression', async ({ request }) => {
    const headers = bearer(await apiLogin(request, 'ada'));
    expect((await request.get('/api/admin/loans', { headers })).status()).toBe(403);
    expect((await request.get('/api/admin/users', { headers })).status()).toBe(403);
    expect((await request.post('/api/admin/loans/1/approve', { headers })).status()).toBe(403);
  });

  test('TC-API-004 a transfer response has the documented shape @regression', async ({ request }) => {
    const headers = bearer(await apiLogin(request, 'ada'));
    const res = await request.post('/api/transfer', { headers, data: { to: USERS.tunde.email, amount: 750 } });
    expect(res.status()).toBe(201);
    expect(await res.json()).toEqual({ reference: expect.stringMatching(/^PV[0-9A-F]{10}$/), amount: 750, to: USERS.tunde.email, balance: 999250 });
  });

  test('TC-API-005 repeating a transfer with the same Idempotency-Key debits once @regression', async ({ request }) => {
    const headers = { ...bearer(await apiLogin(request, 'ada')), 'Idempotency-Key': 'order-42' };
    const first = await request.post('/api/transfer', { headers, data: { to: USERS.tunde.email, amount: 1000 } });
    const second = await request.post('/api/transfer', { headers, data: { to: USERS.tunde.email, amount: 1000 } });
    expect(first.status()).toBe(201);
    expect(second.status()).toBe(200);
    expect(second.headers()['x-idempotent-replay']).toBe('true');
    expect((await second.json()).reference).toBe((await first.json()).reference);
    const wallet = await request.get('/api/wallet', { headers: bearer(await apiLogin(request, 'ada')) });
    expect((await wallet.json()).balance).toBe(999000);
  });

  test('TC-API-006 malformed JSON is rejected with 400, not a server error @regression', async ({ request }) => {
    const res = await request.post('/api/login', { headers: { 'Content-Type': 'application/json' }, data: Buffer.from('{"email": ') });
    expect(res.status()).toBe(400);
    expect((await res.json()).error.code).toBe('INVALID_JSON');
  });

  test('TC-API-007 amounts are validated by type and precision @regression', async ({ request }) => {
    const headers = bearer(await apiLogin(request, 'ada'));
    for (const amount of ['500', null, 10.005]) {
      const res = await request.post('/api/transfer', { headers, data: { to: USERS.tunde.email, amount } });
      expect(res.status(), `amount ${JSON.stringify(amount)}`).toBe(400);
    }
  });

  test('TC-API-008 approving a loan twice returns 409 and credits only once @regression', async ({ request }) => {
    const ada = bearer(await apiLogin(request, 'ada'));
    const admin = bearer(await apiLogin(request, 'admin'));
    const created = await request.post('/api/loans', { headers: ada, data: { amount: 40000, tenure: 4 } });
    expect(created.status()).toBe(201);
    const { id } = await created.json();
    expect((await request.post(`/api/admin/loans/${id}/approve`, { headers: admin })).status()).toBe(200);
    expect((await request.post(`/api/admin/loans/${id}/approve`, { headers: admin })).status()).toBe(409);
    expect((await (await request.get('/api/wallet', { headers: ada })).json()).balance).toBe(1040000);
  });

  test('TC-API-009 an expired token is rejected with 401 @regression', async ({ request }) => {
    const headers = bearer(await apiLogin(request, 'ada'));
    expect((await request.get('/api/wallet', { headers })).status()).toBe(200);
    await request.post('/api/test/expire-session');
    expect((await request.get('/api/wallet', { headers })).status()).toBe(401);
  });
});
