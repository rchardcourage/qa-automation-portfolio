import { Page, Locator } from '@playwright/test';

export abstract class BasePage {
  readonly nav: Locator;
  readonly signOut: Locator;

  constructor(protected readonly page: Page) {
    this.nav = page.getByRole('navigation', { name: 'Main' });
    this.signOut = page.getByRole('button', { name: 'Sign out' });
  }

  async goto(hash: string) {
    await this.page.goto(`/#/${hash}`);
  }
}
