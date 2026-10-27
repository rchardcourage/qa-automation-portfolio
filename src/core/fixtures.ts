import { test as base, expect } from '@playwright/test';
import { USERS, UserKey, apiLogin, resetState } from './data';

type Fixtures = {
  /** Resets the demo app before every test so tests never depend on each other. */
  cleanState: void;
  /** Signs in through the API and seeds the browser session (fast, keeps UI tests focused). */
  signInAs: (who: UserKey) => Promise<string>;
};

export const test = base.extend<Fixtures>({
  cleanState: [
    async ({ request }, use) => {
      await resetState(request);
      await use();
    },
    { auto: true },
  ],
  signInAs: async ({ page, request }, use) => {
    await use(async (who) => {
      const token = await apiLogin(request, who);
      await page.addInitScript(([t, r]) => {
        localStorage.setItem('pv_token', t);
        localStorage.setItem('pv_role', r);
      }, [token, USERS[who].role]);
      return token;
    });
  },
});

export { expect };
