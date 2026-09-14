import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../../../core/BasePage';

export class GovernanceOverviewPage extends BasePage {
  readonly postureGauge: Locator;
  readonly scoreIndicator: Locator;
  readonly signalsCard: Locator;
  readonly frameworksNavLink: Locator;
  readonly risksNavLink: Locator;
  readonly actionsNavLink: Locator;

  constructor(page: Page) {
    super(page);
    this.postureGauge = page.locator('[data-testid="posture-score-gauge"], .posture-gauge');
    this.scoreIndicator = page.locator('[data-testid="posture-score-value"]');
    this.signalsCard = page.locator('[data-testid="signals-summary-card"]');
    this.frameworksNavLink = page.getByRole('link', { name: /frameworks/i });
    this.risksNavLink = page.getByRole('link', { name: /risks/i });
    this.actionsNavLink = page.getByRole('link', { name: /actions/i });
  }

  async verifyDashboardKPIs() {
    await expect(this.postureGauge).toBeVisible();
    await expect(this.signalsCard).toBeVisible();
  }

  async navigateToFrameworks() {
    await this.frameworksNavLink.click();
    await expect(this.page).toHaveURL(/frameworks/);
  }
}
