import { test, expect } from '../core/fixtures';
import { USERS, apiLogin, UserKey } from '../core/data';
import { AdminPage } from '../pages/AdminPage';
import { DashboardPage } from '../pages/DashboardPage';
import { LoansPage } from '../pages/LoansPage';

test.describe('Role-based access control and the loan lifecycle', () => {
  test('TC-RBAC-001 customers do not see the Admin link @sanity', async ({ page, signInAs }) => {
    await signInAs('ada');
    const dashboard = new DashboardPage(page);
    await dashboard.open();
    await expect(dashboard.nav.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(dashboard.nav.getByRole('link', { name: 'Admin' })).toHaveCount(0);
  });

  test('TC-RBAC-002 customers who open the admin URL directly are denied @smoke', async ({ page, signInAs }) => {
    await signInAs('ada');
    const admin = new AdminPage(page);
    await admin.open();
    await expect(admin.accessDenied).toBeVisible();
    await expect(page.getByRole('button', { name: 'Approve' })).toHaveCount(0);
  });

  test('TC-RBAC-003 admins see the Admin link and the applications list @sanity', async ({ page, signInAs }) => {
    await signInAs('admin');
    const admin = new AdminPage(page);
    await admin.open();
    await expect(admin.nav.getByRole('link', { name: 'Admin' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Loan applications' })).toBeVisible();
  });

  test('TC-E2E-001 loan journey: customer applies, admin approves, wallet is credited @smoke', async ({ browser, baseURL }) => {
    const customer = await browser.newContext({ baseURL });
    const adminCtx = await browser.newContext({ baseURL });
    const [cPage, aPage] = [await customer.newPage(), await adminCtx.newPage()];
    const sign = async (ctx: typeof customer, who: UserKey) => {
      const token = await apiLogin(ctx.request, who);
      await ctx.addInitScript(([t, r]) => { localStorage.setItem('pv_token', t); localStorage.setItem('pv_role', r); }, [token, USERS[who].role]);
    };
    await sign(customer, 'ada');
    await sign(adminCtx, 'admin');

    const loans = new LoansPage(cPage);
    await loans.open();
    await loans.fill(100000, 6);
    await loans.apply.click();
    await expect(loans.status).toHaveText('Application submitted. Status: PENDING');

    const admin = new AdminPage(aPage);
    await admin.open();
    await expect(admin.row(1)).toContainText('ada@payvault.test');
    await admin.approve(1);

    const dashboard = new DashboardPage(cPage);
    await dashboard.open();
    await dashboard.expectBalance('₦1,100,000.00');
    await expect(dashboard.transactions).toContainText('loan-disbursement');
    await customer.close();
    await adminCtx.close();
  });
});
