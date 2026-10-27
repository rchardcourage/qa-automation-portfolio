import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class TransferPage extends BasePage {
  readonly recipient: Locator;
  readonly amount: Locator;
  readonly send: Locator;
  readonly error: Locator;
  readonly success: Locator;
  readonly available: Locator;

  constructor(page: Page) {
    super(page);
    this.recipient = page.getByLabel('Recipient email');
    this.amount = page.getByLabel('Amount (₦)');
    this.send = page.getByRole('button', { name: 'Send money' });
    this.error = page.getByTestId('transfer-error');
    this.success = page.getByTestId('transfer-success');
    this.available = page.getByTestId('available');
  }

  async open() {
    await this.goto('transfer');
    await expect(this.available).toBeVisible();
  }

  async transfer(to: string, amount: string | number) {
    await this.recipient.fill(to);
    await this.amount.fill(String(amount));
    await this.send.click();
  }

  async expectError(text: string | RegExp) {
    await expect(this.error).toBeVisible();
    await expect(this.error).toContainText(text);
    await expect(this.success).toBeHidden();
  }
}
