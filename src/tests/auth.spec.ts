import { test, expect } from '../core/fixtures';
import { USERS } from '../core/data';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('Authentication and session handling', () => {
  test('TC-AUTH-001 valid customer signs in and lands on the wallet dashboard @smoke', async ({ page }) => {
    const login = new LoginPage(page);
    await login.open();
    await login.signIn(USERS.ada.email, USERS.ada.password);
    await expect(page).toHaveURL(/#\/dashboard/);
    await new DashboardPage(page).expectBalance('₦1,000,000.00');
  });

  test('TC-AUTH-002 wrong password shows a generic error and keeps the user signed out @regression', async ({ page }) => {
    const login = new LoginPage(page);
    await login.open();
    await login.signIn(USERS.ada.email, 'wrong-password');
    await login.expectMessage('Invalid email or password.');
    await expect(page).toHaveURL(/#\/login/);
  });

  test('TC-AUTH-003 unknown email gets the same message as a wrong password (no user enumeration) @regression', async ({ page }) => {
    const login = new LoginPage(page);
    await login.open();
    await login.signIn('nobody@payvault.test', 'Passw0rd!');
    await login.expectMessage('Invalid email or password.');
  });

  test('TC-AUTH-004 empty form is rejected before any request is sent @regression', async ({ page }) => {
    const login = new LoginPage(page);
    let loginCalls = 0;
    page.on('request', (r) => { if (r.url().endsWith('/api/login')) loginCalls++; });
    await login.open();
    await login.submit.click();
    await login.expectMessage('Email and password are required.');
    expect(loginCalls).toBe(0);
  });

  test('TC-AUTH-005 account locks after three failed attempts, even for the correct password @regression', async ({ page }) => {
    const login = new LoginPage(page);
    await login.open();
    for (let i = 0; i < 3; i++) await login.signIn(USERS.tunde.email, 'bad-password');
    await login.expectMessage('Account locked');
    await login.signIn(USERS.tunde.email, USERS.tunde.password);
    await login.expectMessage('Account locked');
    await expect(page).toHaveURL(/#\/login/);
  });

  test('TC-AUTH-006 signing out ends the session and protects pages @sanity', async ({ page, signInAs }) => {
    await signInAs('ada');
    const dashboard = new DashboardPage(page);
    await dashboard.open();
    await dashboard.signOut.click();
    await expect(page).toHaveURL(/#\/login/);
    expect(await page.evaluate(() => localStorage.getItem('pv_token'))).toBeNull();
    await page.evaluate(() => { location.hash = '#/transfer'; });
    await expect(page).toHaveURL(/#\/login/);
  });

  test('TC-AUTH-007 protected pages redirect anonymous visitors to sign in @sanity', async ({ page }) => {
    await page.goto('/#/dashboard');
    await expect(page).toHaveURL(/#\/login/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('TC-AUTH-008 expired session redirects to sign in with a clear message @regression', async ({ page, request, signInAs }) => {
    await signInAs('ada');
    const dashboard = new DashboardPage(page);
    await dashboard.open();
    await expect(dashboard.balance).toBeVisible();

    await request.post('/api/test/expire-session');
    await dashboard.nav.getByRole('link', { name: 'Transfer' }).click();

    await expect(page).toHaveURL(/#\/login/);
    await new LoginPage(page).expectMessage('Your session has expired. Please sign in again.');
  });
});
