import { test, expect } from '../core/fixtures';
import { USERS, apiLogin, bearer } from '../core/data';
import { TransferPage } from '../pages/TransferPage';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('Wallet transfers', () => {
  test('TC-TRF-001 successful transfer debits the sender and shows a reference @smoke', async ({ page, signInAs }) => {
    await signInAs('ada');
    const transfer = new TransferPage(page);
    await transfer.open();
    await transfer.transfer(USERS.tunde.email, 5000);
    await expect(transfer.success).toContainText(/Reference: PV[0-9A-F]{10}/);
    await expect(transfer.available).toHaveText('Available: ₦995,000.00');
  });

  test('TC-TRF-002 recipient is credited and sees the transfer in their activity @regression', async ({ request }) => {
    const send = await request.post('/api/transfer', { headers: bearer(await apiLogin(request, 'ada')), data: { to: USERS.tunde.email, amount: 2500.5 } });
    expect(send.status()).toBe(201);
    const wallet = await request.get('/api/wallet', { headers: bearer(await apiLogin(request, 'tunde')) });
    expect((await wallet.json()).balance).toBe(52500.5);
    const tx = await request.get('/api/transactions', { headers: bearer(await apiLogin(request, 'tunde')) });
    expect((await tx.json()).transactions[0]).toMatchObject({ type: 'transfer-in', counterparty: USERS.ada.email, amount: 2500.5 });
  });

  test('TC-TRF-003 completed transfer appears in the sender activity table @sanity', async ({ page, signInAs }) => {
    await signInAs('ada');
    const transfer = new TransferPage(page);
    await transfer.open();
    await transfer.transfer(USERS.tunde.email, 1200);
    await expect(transfer.success).toBeVisible();
    const dashboard = new DashboardPage(page);
    await dashboard.open();
    await expect(dashboard.transactions).toContainText('transfer-out');
    await expect(dashboard.transactions).toContainText('₦1,200.00');
  });

  const invalidAmounts: Array<[string, string | number, RegExp]> = [
    ['zero', 0, /greater than zero|Minimum transfer/],
    ['negative', -50, /greater than zero|Minimum transfer/],
    ['below the ₦100 minimum', 99.99, /Minimum transfer is ₦100/],
    ['more than 2 decimal places', 12.345, /2 decimal places/],
  ];
  for (const [label, amount, message] of invalidAmounts) {
    test(`TC-TRF-004 rejects an amount that is ${label} @regression`, async ({ page, signInAs }) => {
      await signInAs('ada');
      const transfer = new TransferPage(page);
      await transfer.open();
      await transfer.transfer(USERS.tunde.email, amount);
      await transfer.expectError(message);
      await expect(transfer.available).toHaveText('Available: ₦1,000,000.00');
    });
  }

  test('TC-TRF-005 empty amount is rejected @regression', async ({ page, signInAs }) => {
    await signInAs('ada');
    const transfer = new TransferPage(page);
    await transfer.open();
    await transfer.recipient.fill(USERS.tunde.email);
    await transfer.send.click();
    await transfer.expectError('Amount must be a number');
  });

  test('TC-TRF-006 the ₦100 minimum is accepted (boundary) @regression', async ({ page, signInAs }) => {
    await signInAs('ada');
    const transfer = new TransferPage(page);
    await transfer.open();
    await transfer.transfer(USERS.tunde.email, 100);
    await expect(transfer.success).toBeVisible();
    await expect(transfer.available).toHaveText('Available: ₦999,900.00');
  });

  test('TC-TRF-007 cannot send more than the available balance @regression', async ({ page, signInAs }) => {
    await signInAs('tunde'); // seeded with ₦50,000
    const transfer = new TransferPage(page);
    await transfer.open();
    await transfer.transfer(USERS.ada.email, 60000);
    await transfer.expectError('Insufficient funds.');
  });

  test('TC-TRF-008 exactly the ₦300,000 daily limit is allowed, any further transfer that day is not @regression', async ({ page, signInAs }) => {
    await signInAs('ada');
    const transfer = new TransferPage(page);
    await transfer.open();
    await transfer.transfer(USERS.tunde.email, 300000);
    await expect(transfer.success).toBeVisible();
    await transfer.transfer(USERS.tunde.email, 100);
    await transfer.expectError('Daily transfer limit of ₦300,000.00 exceeded.');
    const dashboard = new DashboardPage(page);
    await dashboard.open();
    await expect(dashboard.balance).toHaveText('₦700,000.00');
    await expect(dashboard.dailyUsage).toContainText('₦300,000.00 of ₦300,000.00');
  });

  test('TC-TRF-009 cannot send money to yourself @regression', async ({ page, signInAs }) => {
    await signInAs('ada');
    const transfer = new TransferPage(page);
    await transfer.open();
    await transfer.transfer(USERS.ada.email, 500);
    await transfer.expectError('You cannot send money to yourself.');
  });

  test('TC-TRF-010 unknown recipient is rejected and no money moves @regression', async ({ page, signInAs }) => {
    await signInAs('ada');
    const transfer = new TransferPage(page);
    await transfer.open();
    await transfer.transfer('ghost@payvault.test', 500);
    await transfer.expectError('Recipient not found.');
    await expect(transfer.available).toHaveText('Available: ₦1,000,000.00');
  });
});
