import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  readonly balance: Locator;
  readonly dailyUsage: Locator;
  readonly transactions: Locator;

  constructor(page: Page) {
    super(page);
    this.balance = page.getByTestId('balance');
    this.dailyUsage = page.getByTestId('daily-usage');
    this.transactions = page.getByTestId('tx-table');
  }

  async open() {
    await this.goto('dashboard');
  }

  async expectBalance(text: string) {
    await expect(this.balance).toHaveText(text);
  }
}
