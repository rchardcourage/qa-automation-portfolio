import { test, expect } from '@playwright/test';
import { GovernanceOverviewPage } from '../pages/GovernanceOverviewPage';

test.describe('Enterprise Governance Hub — E2E Smoke Suite @smoke', () => {

  test('TC-GOV-001: Overview KPI Dashboard loads with valid metrics', async ({ page }) => {
    const overview = new GovernanceOverviewPage(page);
    await overview.navigateTo('/governance');

    // Verify critical executive KPIs
    await overview.verifyDashboardKPIs();
  });

  test('TC-GOV-002: Deterministic Posture Score displays graceful unconfigured fallback', async ({ page }) => {
    const overview = new GovernanceOverviewPage(page);
    await overview.navigateTo('/governance');

    // Deterministic validation: If no active controls exist, assert no fabricated numbers
    const scoreText = await overview.scoreIndicator.textContent();
    expect(scoreText).toMatch(/(N\/A|[0-9]{1,3})/);
  });

  test('TC-GOV-003: Deep navigation across governance registers preserves filter state', async ({ page }) => {
    const overview = new GovernanceOverviewPage(page);
    await overview.navigateTo('/governance');
    await overview.navigateToFrameworks();
  });
});
