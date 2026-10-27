import { APIRequestContext, expect } from '@playwright/test';

export type UserKey = 'ada' | 'tunde' | 'admin';

/** Seeded accounts in the demo app (see demo-app/server.js). */
export const USERS: Record<UserKey, { email: string; password: string; role: 'customer' | 'admin' }> = {
  ada: { email: 'ada@payvault.test', password: 'Passw0rd!', role: 'customer' }, // KYC verified, ₦1,000,000
  tunde: { email: 'tunde@payvault.test', password: 'Passw0rd!', role: 'customer' }, // KYC NOT verified, ₦50,000
  admin: { email: 'admin@payvault.test', password: 'Adm1nPass!', role: 'admin' },
};

export async function resetState(request: APIRequestContext): Promise<void> {
  const res = await request.post('/api/test/reset');
  expect(res.ok(), 'demo app reset endpoint should respond 200').toBeTruthy();
}

export async function apiLogin(request: APIRequestContext, who: UserKey): Promise<string> {
  const { email, password } = USERS[who];
  const res = await request.post('/api/login', { data: { email, password } });
  expect(res.status(), `login as ${who}`).toBe(200);
  return (await res.json()).token as string;
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
