import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminPage extends BasePage {
  readonly accessDenied: Locator;

  constructor(page: Page) {
    super(page);
    this.accessDenied = page.getByTestId('access-denied');
  }

  async open() {
    await this.goto('admin');
  }

  row(loanId: number): Locator {
    return this.page.getByTestId(`admin-loan-${loanId}`);
  }

  async approve(loanId: number) {
    await this.row(loanId).getByRole('button', { name: 'Approve' }).click();
    await expect(this.page.getByTestId(`admin-status-${loanId}`)).toHaveText('APPROVED');
  }
}
