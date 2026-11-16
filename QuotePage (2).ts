/**
 * QuotePage.ts
 *
 * Page Object for the Exposures & Quotes page.
 * Covers the Quote / Binder / Premium Booking / Policy tab strip
 * and all actions within the Quote tab.
 */

import { type Locator, expect }  from '@playwright/test';
import { BasePage }              from './base/BasePage';
import type { QuoteData }        from '../types/quote.types';

export class QuotePage extends BasePage {

  // ── Main tabs ─────────────────────────────────────────────────────────

  get tabQuote(): Locator {
    return this.page.getByRole('tab', { name: /^quote$/i });
  }

  get tabBinder(): Locator {
    return this.page.getByRole('tab', { name: /^binder$/i });
  }

  get tabPremiumBooking(): Locator {
    return this.page.getByRole('tab', { name: /premium\s*booking/i });
  }

  get tabPolicy(): Locator {
    return this.page.getByRole('tab', { name: /^policy$/i });
  }

  // ── Quote tab controls ────────────────────────────────────────────────

  get btnAddNew(): Locator {
    return this.page.getByRole('button', { name: /add\s*new/i });
  }

  get modalNewQuote(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: /new\s*quote|create\s*quote/i });
  }

  get btnGenerateQuote(): Locator {
    return this.page.getByRole('button', { name: /generate\s*quote/i });
  }

  get btnFinalizeQuote(): Locator {
    return this.page.getByRole('button', { name: /finalize\s*quote/i });
  }

  get btnGenerateBinder(): Locator {
    return this.page.getByRole('button', { name: /generate\s*binder/i });
  }

  // ── High-level actions ────────────────────────────────────────────────

  async goToQuoteTab(): Promise<void> {
    this.log('Going to Quote tab');
    await this.tabQuote.click();
    await this.page.waitForLoadState('networkidle');
  }

  async goToBinderTab(): Promise<void> {
    this.log('Going to Binder tab');
    await this.tabBinder.click();
    await this.page.waitForLoadState('networkidle');
  }

  async goToPremiumBookingTab(): Promise<void> {
    this.log('Going to Premium Booking tab');
    await this.tabPremiumBooking.click();
    await this.page.waitForLoadState('networkidle');
  }

  async goToPolicyTab(): Promise<void> {
    this.log('Going to Policy tab');
    await this.tabPolicy.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Creates a new quote via the Add New modal.
   * Returns the quote ID from the resulting row.
   */
  async createQuote(data: QuoteData): Promise<string> {
    this.log(`Creating quote: product=${data.product}, subSegment=${data.subSegment}`);
    await this.btnAddNew.click();
    await this.page.waitForLoadState('networkidle');

    // Fill the modal
    const dialog = this.page.getByRole('dialog');

    // Product
    await dialog.getByLabel(/product/i).selectOption({ label: data.product });

    // Sub-segment
    await dialog.getByLabel(/sub.?segment/i).selectOption({ label: data.subSegment });

    // Effective date
    if (data.effectiveDate) {
      await dialog.getByLabel(/effective\s*date/i).fill(data.effectiveDate);
    }

    // Click Create / OK
    await dialog.getByRole('button', { name: /create|ok|confirm/i }).first().click();
    await this.page.waitForLoadState('networkidle');

    // Extract the first quote row ID
    const firstRow = this.page.getByRole('row').filter({ hasText: data.product }).first();
    const idCell   = firstRow.getByRole('cell').first();
    const quoteId  = (await idCell.textContent() ?? '').trim();
    this.log(`Created quote ID: ${quoteId}`);
    return quoteId;
  }

  /**
   * Opens a quote row by ID.
   */
  async openQuote(quoteId: string): Promise<void> {
    this.log(`Opening quote ${quoteId}`);
    await this.quoteRow(quoteId).click();
    await this.page.waitForLoadState('networkidle');
  }

  quoteRow(quoteId: string): Locator {
    return this.page.getByRole('row').filter({ hasText: quoteId }).first();
  }

  get firstQuoteRow(): Locator {
    return this.page.getByRole('row').nth(1); // skip header row
  }

  async finalizeSelectedQuote(): Promise<void> {
    this.log('Finalizing selected quote');
    await this.btnFinalizeQuote.click();
    await this.page.waitForLoadState('networkidle');
    // Handle confirmation modal if present
    const confirmBtn = this.page.getByRole('button', { name: /confirm|yes|ok/i }).first();
    if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmBtn.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * Clicks "Generate Binder" from the Quote tab, which opens a drawer.
   */
  async generateBinderFromSelected(): Promise<void> {
    this.log('Clicking Generate Binder from Quote tab');
    await this.btnGenerateBinder.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ── Assertions ────────────────────────────────────────────────────────

  async assertQuoteStatus(quoteId: string, expectedStatus: string): Promise<void> {
    this.log(`Asserting quote ${quoteId} status = "${expectedStatus}"`);
    const row = this.quoteRow(quoteId);
    await expect(row.getByText(expectedStatus, { exact: false }),
      `Quote ${quoteId} should have status "${expectedStatus}"`
    ).toBeVisible({ timeout: 15_000 });
  }

  async assertFirstQuoteStatus(expectedStatus: string): Promise<void> {
    this.log(`Asserting first quote status = "${expectedStatus}"`);
    await expect(
      this.firstQuoteRow.getByText(expectedStatus, { exact: false }),
      `First quote should have status "${expectedStatus}"`
    ).toBeVisible({ timeout: 15_000 });
  }
}
