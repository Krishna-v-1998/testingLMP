/**
 * PremiumBookingPage.ts
 *
 * Page Object for the "Premium Booking" tab within Exposures & Quotes.
 *
 * ── LIFECYCLE POSITION ────────────────────────────────────────────────────────
 *
 *   Quote → Binder → [Finalize Binder] → In-Processing → Premium Booking → Policy
 *
 * ── PAGE STRUCTURE (from UI screenshots) ─────────────────────────────────────
 *
 *   Two tables visible when submission is In-Processing:
 *
 *   TABLE 1 — Location Information:
 *     LOCATION NO | BUILDING NO | ADDRESS | CITY | STATE | ZIP CODE |
 *     TERRITORY | TAX TERRITORY | FUNGI MOLD | CAUSE OF LOSS |
 *     TOTAL EXPOSURE (TIV) | OCCURRENCE LIMIT
 *
 *   TABLE 2 — Coverage Information:
 *     PRODUCT | LOCATION NO | LOCATION | MCLASS | COVERAGE EXPIRATION DATE |
 *     OCCURRENCE LIMIT | RATE MOD | COMMISSION | PREMIUM ORIGINAL |
 *     PREMIUM PRORATED | DEDUCTIBLE | PART OF | TOTAL EXPO
 *
 *   Action button: [ Send to WINS → ]
 *
 * ── LOCATOR NOTES ─────────────────────────────────────────────────────────────
 *
 *   Selectors marked PLACEHOLDER — confirm against live DOM.
 */

import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage }                         from './BasePage';

export class PremiumBookingPage extends BasePage {

  // ── Main lifecycle tab ─────────────────────────────────────────────────────

  get tabPremiumBooking(): Locator {
    return this.page.getByRole('tab', { name: /premium\s+booking/i });
  }

  // ── Location Information table ────────────────────────────────────────────

  /** The whole Location Information table */
  get tableLocationInfo(): Locator {
    return this.page
      .locator('table, [role="table"]')
      .filter({ hasText: /location\s+no/i })
      .first();  // PLACEHOLDER — refine if multiple tables
  }

  /** Column header cell by name */
  locationInfoHeader(colName: string): Locator {
    return this.tableLocationInfo.locator('th, [role="columnheader"]').filter({ hasText: colName });
  }

  /** A specific data cell in Location Info table: row by locationNo, col by header */
  locationInfoCell(locationNo: string, colName: string): Locator {
    return this.tableLocationInfo
      .locator('tbody tr, [role="row"]')
      .filter({ hasText: locationNo })
      .locator(`td:nth-child(${this._colIndex(this.tableLocationInfo, colName)})`);  // PLACEHOLDER
  }

  // ── Coverage Information table ────────────────────────────────────────────

  /** The whole Coverage Information table */
  get tableCoverageInfo(): Locator {
    return this.page
      .locator('table, [role="table"]')
      .filter({ hasText: /coverage\s+expiration\s+date|mclass/i })
      .first();  // PLACEHOLDER
  }

  coverageInfoHeader(colName: string): Locator {
    return this.tableCoverageInfo.locator('th, [role="columnheader"]').filter({ hasText: colName });
  }

  // ── Action buttons ────────────────────────────────────────────────────────

  /** "Send to WINS →" — submits the premium booking to the WINS system */
  get btnSendToWINS(): Locator {
    return this.page.getByRole('button', { name: /send\s+to\s+wins/i })
      .or(this.page.getByRole('link', { name: /send\s+to\s+wins/i }));
  }

  /** Confirmation modal that may appear after clicking Send to WINS */
  get modalSendToWINSConfirm(): Locator {
    return this.page.locator('[role="dialog"]').filter({ hasText: /wins|confirm|send/i });
  }

  get modalBtnConfirm(): Locator {
    return this.modalSendToWINSConfirm.getByRole('button', { name: /confirm|yes|ok/i });
  }

  get modalBtnCancel(): Locator {
    return this.modalSendToWINSConfirm.getByRole('button', { name: /cancel|no/i });
  }

  // ── High-level actions ─────────────────────────────────────────────────────

  /** Navigates to the Premium Booking tab */
  async goToPremiumBookingTab(): Promise<void> {
    this.log('Navigating to Premium Booking tab');
    await this.tabPremiumBooking.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Waits for the page to fully render (both tables visible).
   */
  async waitUntilLoaded(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await expect(
      this.tableLocationInfo,
      'Location Information table should be visible on Premium Booking tab'
    ).toBeVisible({ timeout: 15_000 });
  }

  /**
   * Clicks "Send to WINS →" and optionally confirms the modal.
   * After this the submission transitions from In-Processing toward Issued.
   */
  async sendToWINS(confirmModal = true): Promise<void> {
    this.log('Clicking Send to WINS →');
    await this.btnSendToWINS.click();
    await this.page.waitForLoadState('networkidle');

    if (confirmModal) {
      const isModalVisible = await this.modalSendToWINSConfirm
        .isVisible()
        .catch(() => false);
      if (isModalVisible) {
        this.log('Confirming Send to WINS modal');
        await this.modalBtnConfirm.click();
        await this.page.waitForLoadState('networkidle');
      }
    }

    this.log('Send to WINS completed');
  }

  // ── Assertions ─────────────────────────────────────────────────────────────

  /** Asserts Location Information table is visible and has data */
  async assertLocationInfoTableVisible(): Promise<void> {
    await expect(
      this.tableLocationInfo,
      'Location Information table should be visible'
    ).toBeVisible();
    this.log('✅ Location Information table is visible');
  }

  /** Asserts Coverage Information table is visible and has data */
  async assertCoverageInfoTableVisible(): Promise<void> {
    await expect(
      this.tableCoverageInfo,
      'Coverage Information table should be visible'
    ).toBeVisible();
    this.log('✅ Coverage Information table is visible');
  }

  /** Asserts "Send to WINS →" button is visible and enabled */
  async assertSendToWINSEnabled(): Promise<void> {
    await expect(
      this.btnSendToWINS,
      '"Send to WINS →" button should be visible'
    ).toBeVisible();
    await expect(
      this.btnSendToWINS,
      '"Send to WINS →" button should be enabled'
    ).toBeEnabled();
    this.log('✅ Send to WINS button is enabled');
  }

  /**
   * Asserts expected Location Info columns are present in the table header.
   */
  async assertLocationInfoColumns(): Promise<void> {
    const expectedCols = [
      'LOCATION NO', 'BUILDING NO', 'ADDRESS', 'CITY', 'STATE',
      'ZIP CODE', 'TERRITORY', 'TOTAL EXPOSURE (TIV)', 'OCCURRENCE LIMIT',
    ];
    for (const col of expectedCols) {
      await expect(
        this.locationInfoHeader(col),
        `Column "${col}" should be in Location Information table`
      ).toBeVisible();
    }
    this.log('✅ Location Information columns verified');
  }

  /**
   * Asserts expected Coverage Info columns are present in the table header.
   */
  async assertCoverageInfoColumns(): Promise<void> {
    const expectedCols = [
      'PRODUCT', 'LOCATION NO', 'MCLASS',
      'OCCURRENCE LIMIT', 'COMMISSION', 'PREMIUM ORIGINAL',
    ];
    for (const col of expectedCols) {
      await expect(
        this.coverageInfoHeader(col),
        `Column "${col}" should be in Coverage Information table`
      ).toBeVisible();
    }
    this.log('✅ Coverage Information columns verified');
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /** Placeholder for future dynamic column-index lookup */
  private _colIndex(_table: Locator, _colName: string): number {
    // TODO: implement if column index is needed dynamically
    return 1;
  }

  protected log(message: string): void {
    console.log(`[PremiumBookingPage] ${message}`);
  }
}
