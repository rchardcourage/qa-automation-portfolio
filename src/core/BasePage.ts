import { Page, Locator, expect } from '@playwright/test';

export abstract class BasePage {
  readonly page: Page;
  readonly headerTitle: Locator;
  readonly userMenu: Locator;

  constructor(page: Page) {
    this.page = page;
    this.headerTitle = page.locator('header h1, header h2, [data-testid="header-title"]');
    this.userMenu = page.locator('[data-testid="user-profile-menu"]');
  }

  async navigateTo(path: string) {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
  }

  async waitForNetworkIdle() {
    await this.page.waitForLoadState('networkidle');
  }
}
