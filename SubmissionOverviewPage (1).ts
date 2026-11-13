/**
 * SubmissionOverviewPage.ts
 *
 * Page Object for the Submission Overview / Hub page.
 *
 * ── HOW TO REACH THIS PAGE ─────────────────────────────────────────────────
 *
 *   await page.goto(submissionCtx.submissionUrl);
 *   — OR —
 *   await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);
 *
 * ── URL PATTERN ────────────────────────────────────────────────────────────
 *
 *   https://allianz-qa-subhubplus-uatx.unqork.io/app/metrix-ui/#/display/<id>
 *     ?metrixSubmissionId=<submissionId>
 *
 * ── PAGE STRUCTURE ─────────────────────────────────────────────────────────
 *
 *   Left navigation / sub-tabs typically include:
 *   [ Submission Details ]
 *   [ Exposures & Quotes ]   ← leads to Quote | Binder | Premium Booking | Policy
 *   [ Accounts Review ]
 *   [ Checklist ]
 *   [ Documents ]
 *   [ Notes ]
 *
 * ── LOCATOR NOTES ──────────────────────────────────────────────────────────
 *
 *   All selectors marked PLACEHOLDER — replace after inspecting live DOM.
 *   Prefer: getByRole → getByLabel → getByText → data-testid → CSS last resort.
 */

import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage }                         from './BasePage';

export class SubmissionOverviewPage extends BasePage {

  constructor(page: Page) {
    super(page);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  /** Navigate directly to a submission URL */
  async navigateByUrl(url: string): Promise<void> {
    this.log('navigateByUrl:', url);
    await this.page.goto(url);
    await this.waitUntilLoaded();
  }

  /**
   * Wait until the submission page has finished loading.
   * Waits for the page heading or a known stable element to be visible.
   */
  async waitUntilLoaded(): Promise<void> {
    // Wait for the network to settle and the app shell to render
    await this.page.waitForLoadState('networkidle');
    // Then wait for a recognizable element — adjust selector once you inspect the DOM
    await this.page.waitForSelector(
      '[class*="submission"], [class*="subhub"], [data-module*="submission"], h1, h2',
      { timeout: 15_000 }
    );
  }

  // ── Left-nav / sub-tab links ──────────────────────────────────────────────

  /** "Submission Details" left-nav link */
  get linkSubmissionDetails(): Locator {
    return this.page.getByRole('link', { name: /submission\s+details/i });  // PLACEHOLDER
  }

  /**
   * "Exposures & Quotes" left-nav link.
   * Clicking this reveals the Quote | Binder | Premium Booking | Policy tabs.
   */
  get linkExposuresAndQuotes(): Locator {
    return this.page.getByRole('link', { name: /exposures.*quotes/i });  // PLACEHOLDER
  }

  get linkAccountsReview(): Locator {
    return this.page.getByRole('link', { name: /accounts\s+review/i });  // PLACEHOLDER
  }

  get linkChecklist(): Locator {
    return this.page.getByRole('link', { name: /checklist/i });  // PLACEHOLDER
  }

  get linkDocuments(): Locator {
    return this.page.getByRole('link', { name: /documents/i });  // PLACEHOLDER
  }

  get linkNotes(): Locator {
    return this.page.getByRole('link', { name: /notes/i });  // PLACEHOLDER
  }

  // ── Submission header info ────────────────────────────────────────────────

  /** Submission ID shown at the top of the page */
  get submissionIdDisplay(): Locator {
    return this.page.locator('[data-label*="Submission ID"], [class*="submission-id"]');  // PLACEHOLDER
  }

  /** Submission status badge */
  get submissionStatus(): Locator {
    return this.page.locator('[class*="status-badge"], [data-field*="status"]');  // PLACEHOLDER
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Clicks "Exposures & Quotes" in the left navigation.
   * After this call, the Quote tab is typically active.
   */
  async clickExposuresAndQuotes(): Promise<void> {
    this.log('clickExposuresAndQuotes');
    await this.linkExposuresAndQuotes.click();
    // Wait for the Quote tab to be visible — indicates the sub-view loaded
    await expect(
      this.page.getByRole('tab', { name: 'Quote' }),
      '"Quote" tab should appear after clicking Exposures & Quotes'
    ).toBeVisible({ timeout: 10_000 });
  }

  /**
   * Reads the submission ID from the page header.
   * Returns empty string if the element is not found.
   */
  async getSubmissionId(): Promise<string> {
    try {
      return (await this.submissionIdDisplay.textContent()) ?? '';
    } catch {
      return '';
    }
  }

  /**
   * Reads the current submission status from the status badge.
   */
  async getSubmissionStatus(): Promise<string> {
    try {
      return (await this.submissionStatus.textContent()) ?? '';
    } catch {
      return '';
    }
  }
}
