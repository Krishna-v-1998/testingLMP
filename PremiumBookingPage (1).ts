/**
 * PremiumBookingPage.ts
 *
 * Page Object for the Premium Booking tab.
 * Handles Location/Coverage info tables and "Send to WINS" action.
 */

import { type Locator, expect } from '@playwright/test';
import { BasePage }             from './base/BasePage';

export class PremiumBookingPage extends BasePage {

  // ── Tables ────────────────────────────────────────────────────────────

  get tableLocationInfo(): Locator {
    return this.page.getByRole('table').filter({ hasText: /location\s*information/i }).first()
      .or(this.page.locator('[data-testid="location-info-table"]'));
  }

  get tableCoverageInfo(): Locator {
    return this.page.getByRole('table').filter({ hasText: /coverage\s*information/i }).first()
      .or(this.page.locator('[data-testid="coverage-info-table"]'));
  }

  // ── Action button ─────────────────────────────────────────────────────

  get btnSendToWINS(): Locator {
    return this.page.getByRole('button', { name: /send\s*to\s*wins/i });
  }

  get modalSendToWINSConfirm(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: /send\s*to\s*wins/i });
  }

  get btnSendToWINSConfirm(): Locator {
    return this.modalSendToWINSConfirm.getByRole('button', { name: /confirm|yes|send/i }).first();
  }

  // ── Loading indicator ─────────────────────────────────────────────────

  async waitUntilLoaded(timeout = 60_000): Promise<void> {
    this.log('Waiting for Premium Booking page to fully load');
    // Wait for one of the two tables to appear
    await this.page.waitForSelector(
      '[role="table"],[data-testid="location-info-table"],[data-testid="coverage-info-table"]',
      { timeout }
    );
    await this.page.waitForLoadState('networkidle');
  }

  // ── High-level actions ────────────────────────────────────────────────

  async sendToWINS(confirmModal = true): Promise<void> {
    this.log('Clicking Send to WINS');
    await this.btnSendToWINS.click();
    await this.page.waitForLoadState('networkidle');

    if (confirmModal) {
      const confirmBtn = this.btnSendToWINSConfirm;
      if (await confirmBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        this.log('Confirming Send to WINS modal');
        await confirmBtn.click();
        await this.page.waitForLoadState('networkidle');
      }
    }
  }

  // ── Assertions ────────────────────────────────────────────────────────

  async assertLocationInfoTableVisible(): Promise<void> {
    await expect(this.tableLocationInfo, 'Location Information table should be visible').toBeVisible();
  }

  async assertCoverageInfoTableVisible(): Promise<void> {
    await expect(this.tableCoverageInfo, 'Coverage Information table should be visible').toBeVisible();
  }

  async assertLocationInfoColumns(): Promise<void> {
    this.log('Asserting Location Information table column headers');
    const expectedColumns = ['Location', 'Address', 'Property Damage', 'BI/EE', 'Total'];
    for (const col of expectedColumns) {
      await expect(
        this.tableLocationInfo.getByText(col, { exact: false }).first(),
        `Location Info table should have column "${col}"`
      ).toBeVisible();
    }
  }

  async assertCoverageInfoColumns(): Promise<void> {
    this.log('Asserting Coverage Information table column headers');
    const expectedColumns = ['Coverage', 'Premium', 'TRIA'];
    for (const col of expectedColumns) {
      await expect(
        this.tableCoverageInfo.getByText(col, { exact: false }).first(),
        `Coverage Info table should have column "${col}"`
      ).toBeVisible();
    }
  }

  async assertSendToWINSEnabled(): Promise<void> {
    await expect(this.btnSendToWINS, '"Send to WINS" button should be enabled').toBeEnabled();
  }
}
