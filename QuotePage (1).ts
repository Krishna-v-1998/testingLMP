/**
 * QuotePage.ts
 *
 * Page Object for the "Quote" tab within Exposures & Quotes.
 *
 * ── HOW TO REACH THIS PAGE ─────────────────────────────────────────────────
 *
 *   submissionOverview.navigateByUrl(submissionCtx.submissionUrl)
 *   submissionOverview.clickExposuresAndQuotes()   // opens to Quote tab by default
 *
 * ── URL PATTERN ────────────────────────────────────────────────────────────
 *
 *   https://allianz-qa-subhubplus-uatx.unqork.io/app/metric-ui/#/display/...
 *   ?metrixSubmissionId=<id>
 *
 * ── PAGE STRUCTURE ─────────────────────────────────────────────────────────
 *
 *   Top-level tabs: [ Quote ★ ] [ Binder ] [ Premium Booking ] [ Policy ]
 *
 *   Quote tab:
 *   ┌──────────────────────────────────────────────────────────────────────┐
 *   │  ● Active Quotes   ○ Archived Quotes                                 │
 *   │  [Search...]  [Filter]  [Clear All]  [Add New]  [Send To]            │
 *   │                                      [Mark as Sent] [Finalize Quote] │
 *   │                                      [Generate Binder]               │
 *   │  ┌──────────────────────────────────────────────────────────────────┐│
 *   │  │ ☐  Quote ID │ Description │ Product ID(s) │ Effective Date  ... ││
 *   │  │ ☐  Q-1      │ ...         │ ...           │ 01/01/2026      ... ││
 *   │  └──────────────────────────────────────────────────────────────────┘│
 *   └──────────────────────────────────────────────────────────────────────┘
 *
 * ── LOCATOR NOTES ──────────────────────────────────────────────────────────
 *
 *   All selectors marked PLACEHOLDER — replace after inspecting live DOM.
 *   Prefer: getByRole → getByLabel → getByText → data-testid → CSS last resort.
 */

import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage }                         from './BasePage';
import { QuoteData, QuoteSummary, QuoteStatus } from '../types/quote.types';

export class QuotePage extends BasePage {

  // ── Main lifecycle tabs ────────────────────────────────────────────────────

  get tabQuote():          Locator { return this.page.getByRole('tab', { name: 'Quote' }); }
  get tabBinder():         Locator { return this.page.getByRole('tab', { name: 'Binder' }); }
  get tabPremiumBooking(): Locator { return this.page.getByRole('tab', { name: 'Premium Booking' }); }
  get tabPolicy():         Locator { return this.page.getByRole('tab', { name: 'Policy' }); }

  // ── Quote list controls ───────────────────────────────────────────────────

  get radioActiveQuotes():   Locator { return this.page.getByRole('radio', { name: 'Active Quotes' }); }
  get radioArchivedQuotes(): Locator { return this.page.getByRole('radio', { name: 'Archived Quotes' }); }

  get inputSearch():      Locator { return this.page.getByPlaceholder('Search', { exact: false }); }
  get btnFilter():        Locator { return this.page.getByRole('button', { name: 'Filter' }); }
  get btnClearAll():      Locator { return this.page.getByRole('button', { name: 'Clear All' }); }
  get btnAddNew():        Locator { return this.page.getByRole('button', { name: 'Add New' }); }
  get btnSendTo():        Locator { return this.page.getByRole('button', { name: 'Send To' }); }
  get btnMarkAsSent():    Locator { return this.page.getByRole('button', { name: 'Mark as Sent' }); }
  get btnFinalizeQuote(): Locator { return this.page.getByRole('button', { name: 'Finalize Quote' }); }
  get btnGenerateBinder():Locator { return this.page.getByRole('button', { name: 'Generate Binder' }); }

  get emptyStateText():   Locator { return this.page.getByText('No Data Found'); }

  // ── Quote table ───────────────────────────────────────────────────────────

  /** Returns the row in the quote table for the given Quote ID */
  quoteRow(quoteId: string): Locator {
    return this.page.locator('table tbody tr, [role="row"]').filter({ hasText: quoteId });
  }

  /** Actions column eye/preview icon for a specific quote */
  quotePreviewIcon(quoteId: string): Locator {
    return this.quoteRow(quoteId).locator('button[aria-label*="Preview"], button[title*="Preview"]');  // PLACEHOLDER
  }

  /** Actions column download icon */
  quoteDownloadIcon(quoteId: string): Locator {
    return this.quoteRow(quoteId).locator('button[aria-label*="Download"], button[title*="Download"]');  // PLACEHOLDER
  }

  /** Actions column clone icon */
  quoteCloneIcon(quoteId: string): Locator {
    return this.quoteRow(quoteId).locator('button[aria-label*="Clone"], button[title*="Clone"]');  // PLACEHOLDER
  }

  /** Actions column archive icon (CUO role only) */
  quoteArchiveIcon(quoteId: string): Locator {
    return this.quoteRow(quoteId).locator('button[aria-label*="Archive"], button[title*="Archive"]');  // PLACEHOLDER
  }

  // ── Create Quote modal ────────────────────────────────────────────────────

  get modalCreateQuote():       Locator { return this.page.locator('[role="dialog"]').filter({ hasText: 'Quote ID' }); }   // PLACEHOLDER
  get modalQuoteIdField():      Locator { return this.modalCreateQuote.getByLabel('Quote ID'); }
  get modalEffectiveDateField():Locator { return this.modalCreateQuote.getByLabel('Effective Date'); }
  get modalProductDropdown():   Locator { return this.modalCreateQuote.getByLabel('Product'); }
  get modalSubSegmentDropdown():Locator { return this.modalCreateQuote.getByLabel('Sub-Segment'); }
  get modalDescriptionField():  Locator { return this.modalCreateQuote.getByLabel('Description'); }

  get modalBtnCreate():         Locator { return this.modalCreateQuote.getByRole('button', { name: 'Create' }); }
  get modalBtnCancel():         Locator { return this.modalCreateQuote.getByRole('button', { name: 'Cancel' }); }
  get modalBtnQuoteOptions():   Locator { return this.modalCreateQuote.getByRole('button', { name: 'Quote Options' }); }

  // Cancel confirmation dialog
  get confirmCancelModal():     Locator { return this.page.locator('[role="dialog"]').filter({ hasText: 'Cancelling will discard' }); }
  get confirmCancelBtnYes():    Locator { return this.confirmCancelModal.getByRole('button', { name: 'Yes' }); }
  get confirmCancelBtnNo():     Locator { return this.confirmCancelModal.getByRole('button', { name: 'No' }); }

  // ── High-level actions ─────────────────────────────────────────────────────

  /** Navigates to the Quote tab and waits for the list to load */
  async goToQuoteTab(): Promise<void> {
    this.log('Navigating to Quote tab');
    await this.tabQuote.click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Navigates to the Binder tab */
  async goToBinderTab(): Promise<void> {
    this.log('Navigating to Binder tab');
    await this.tabBinder.click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Navigates to the Premium Booking tab */
  async goToPremiumBookingTab(): Promise<void> {
    this.log('Navigating to Premium Booking tab');
    await this.tabPremiumBooking.click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Navigates to the Policy tab */
  async goToPolicyTab(): Promise<void> {
    this.log('Navigating to Policy tab');
    await this.tabPolicy.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Opens the "Add New" modal, fills the quote data, and clicks Create.
   * Returns the new Quote ID as a string.
   */
  async createQuote(data: QuoteData): Promise<string> {
    this.log(`Creating quote: Product="${data.product}" Sub-Segment="${data.subSegment}"`);

    await this.btnAddNew.click();
    await this.modalCreateQuote.waitFor({ state: 'visible', timeout: 15_000 });

    // Quote ID is auto-populated and read-only
    const quoteId = await this.modalQuoteIdField.inputValue();

    if (data.effectiveDate) {
      await this.modalEffectiveDateField.fill(data.effectiveDate);
      await this.modalEffectiveDateField.press('Tab');
    }

    // Select Product first (Sub-Segment options depend on Product)
    await this.modalProductDropdown.selectOption({ label: data.product });
    await this.page.waitForLoadState('networkidle');

    await this.modalSubSegmentDropdown.selectOption({ label: data.subSegment });

    if (data.insuredName) {
      await this.modalDescriptionField.fill(data.insuredName);
    }

    await this.modalBtnCreate.click();
    await this.page.waitForLoadState('networkidle');

    this.log(`Quote created: ${quoteId}`);
    return quoteId;
  }

  /**
   * Opens a quote from the list by clicking its row.
   * Returns when the quote detail page is loaded.
   */
  async openQuote(quoteId: string): Promise<void> {
    this.log(`Opening quote: ${quoteId}`);
    await this.quoteRow(quoteId).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Selects the checkbox for a quote (for bulk actions).
   */
  async selectQuoteCheckbox(quoteId: string): Promise<void> {
    await this.quoteRow(quoteId).getByRole('checkbox').click();
  }

  /**
   * Finalizes the selected quote (requires CUO role).
   * Call selectQuoteCheckbox() first.
   */
  async finalizeSelectedQuote(): Promise<void> {
    this.log('Clicking Finalize Quote');
    await this.btnFinalizeQuote.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Generates a binder from the selected finalized quote.
   * Call selectQuoteCheckbox() first.
   */
  async generateBinderFromSelected(): Promise<void> {
    this.log('Clicking Generate Binder');
    await this.btnGenerateBinder.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ── Assertions ─────────────────────────────────────────────────────────────

  /** Asserts the quote list shows the empty-state message */
  async assertEmptyState(): Promise<void> {
    await expect(this.emptyStateText, 'Empty state text "No Data Found" should be visible').toBeVisible();
  }

  /** Asserts a quote row exists in the table */
  async assertQuoteInList(quoteId: string): Promise<void> {
    await expect(this.quoteRow(quoteId), `Quote "${quoteId}" should be in the list`).toBeVisible();
  }

  /** Asserts the status cell for a quote shows the expected status */
  async assertQuoteStatus(quoteId: string, expectedStatus: QuoteStatus): Promise<void> {
    const statusCell = this.quoteRow(quoteId).locator('[data-col="status"], td:has-text("' + expectedStatus + '")');  // PLACEHOLDER
    await expect(statusCell, `Quote "${quoteId}" status should be "${expectedStatus}"`).toBeVisible();
    this.log(`✅ Quote ${quoteId} status = ${expectedStatus}`);
  }

  /** Asserts Active Quotes radio is selected by default */
  async assertActiveQuotesSelectedByDefault(): Promise<void> {
    await expect(this.radioActiveQuotes, 'Active Quotes should be selected by default').toBeChecked();
  }

  protected log(message: string): void {
    console.log(`[QuotePage] ${message}`);
  }
}
