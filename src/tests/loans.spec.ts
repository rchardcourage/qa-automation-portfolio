import { test, expect } from '../core/fixtures';
import { apiLogin } from '../core/data';
import { LoansPage } from '../pages/LoansPage';

test.describe('Loan quotes and applications', () => {
  // Flat 4% per month: total = amount + amount x 0.04 x months; monthly = total / months (2 dp).
  const quotes = [
    { amount: 10000, tenure: 1, interest: '₦400.00', total: '₦10,400.00', monthly: '₦10,400.00' },
    { amount: 100000, tenure: 6, interest: '₦24,000.00', total: '₦124,000.00', monthly: '₦20,666.67' },
    { amount: 500000, tenure: 12, interest: '₦240,000.00', total: '₦740,000.00', monthly: '₦61,666.67' },
  ];
  for (const q of quotes) {
    test(`TC-LOAN-001 repayment maths is correct for ₦${q.amount} over ${q.tenure} month(s) @sanity`, async ({ page, signInAs }) => {
      await signInAs('ada');
      const loans = new LoansPage(page);
      await loans.open();
      await loans.fill(q.amount, q.tenure);
      await expect(loans.interest).toHaveText(q.interest);
      await expect(loans.total).toHaveText(q.total);
      await expect(loans.monthly).toHaveText(q.monthly);
    });
  }

  const invalid: Array<[string, number, number, RegExp]> = [
    ['amount just below the ₦10,000 minimum', 9999, 3, /between ₦10,000 and ₦500,000/],
    ['amount just above the ₦500,000 maximum', 500001, 3, /between ₦10,000 and ₦500,000/],
    ['tenure above 12 months', 50000, 13, /between 1 and 12/],
    ['tenure of zero months', 50000, 0, /between 1 and 12/],
    ['fractional tenure', 50000, 2.5, /whole number of months/],
  ];
  for (const [label, amount, tenure, message] of invalid) {
    test(`TC-LOAN-002 rejects ${label} @regression`, async ({ page, signInAs }) => {
      await signInAs('ada');
      const loans = new LoansPage(page);
      await loans.open();
      await loans.fill(amount, tenure);
      await loans.apply.click();
      await expect(loans.error).toContainText(message);
      await expect(loans.status).toBeHidden();
    });
  }

  test('TC-LOAN-003 verified customer can apply and the loan is Pending @smoke', async ({ page, signInAs }) => {
    await signInAs('ada');
    const loans = new LoansPage(page);
    await loans.open();
    await loans.fill(100000, 6);
    await loans.apply.click();
    await expect(loans.status).toHaveText('Application submitted. Status: PENDING');
  });

  test('TC-LOAN-004 customer without KYC verification is blocked from applying @regression', async ({ page, signInAs }) => {
    await signInAs('tunde');
    const loans = new LoansPage(page);
    await loans.open();
    await loans.fill(50000, 3);
    await loans.apply.click();
    await expect(loans.error).toContainText('Complete identity verification (KYC)');
  });

  test('TC-LOAN-005 a second application is blocked while one is pending @regression', async ({ page, signInAs }) => {
    await signInAs('ada');
    const loans = new LoansPage(page);
    await loans.open();
    await loans.fill(20000, 2);
    await loans.apply.click();
    await expect(loans.status).toBeVisible();
    await loans.apply.click();
    await expect(loans.error).toContainText('already have an active or pending loan');
  });

  test('TC-LOAN-006 a failed application does not create a loan record @regression', async ({ request }) => {
    const token = await apiLogin(request, 'tunde');
    const res = await request.post('/api/loans', { headers: { Authorization: `Bearer ${token}` }, data: { amount: 50000, tenure: 3 } });
    expect(res.status()).toBe(403);
    const mine = await request.get('/api/loans', { headers: { Authorization: `Bearer ${token}` } });
    expect((await mine.json()).loans).toHaveLength(0);
  });
});
