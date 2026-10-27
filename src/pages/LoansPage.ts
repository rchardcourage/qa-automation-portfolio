import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoansPage extends BasePage {
  readonly amount: Locator;
  readonly tenure: Locator;
  readonly apply: Locator;
  readonly error: Locator;
  readonly status: Locator;
  readonly interest: Locator;
  readonly total: Locator;
  readonly monthly: Locator;

  constructor(page: Page) {
    super(page);
    this.amount = page.getByLabel('Loan amount (₦)');
    this.tenure = page.getByLabel('Tenure (months)');
    this.apply = page.getByRole('button', { name: 'Apply for loan' });
    this.error = page.getByTestId('loan-error');
    this.status = page.getByTestId('loan-status');
    this.interest = page.getByTestId('loan-interest');
    this.total = page.getByTestId('loan-total');
    this.monthly = page.getByTestId('loan-monthly');
  }

  async open() {
    await this.goto('loans');
    await expect(this.amount).toBeVisible();
  }

  async fill(amount: string | number, tenure: string | number) {
    await this.amount.fill(String(amount));
    await this.tenure.fill(String(tenure));
  }
}
