/**
 * AccountsReviewPage.ts
 *
 * Page Object for the Accounts Review screen.
 *
 * ── PLACEHOLDER STATUS ──────────────────────────────────────────────────────
 *
 *   This page is a PLACEHOLDER.  No screenshots or acceptance criteria have
 *   been provided for the Accounts Review screen yet.
 *
 *   Based on context, Accounts Review likely appears as part of the
 *   Quote or Binder approval workflow and may be accessed from:
 *     - A sub-tab within the Quote / Binder detail view, OR
 *     - A separate navigation item in the submission workflow
 *
 * ── TODO ───────────────────────────────────────────────────────────────────
 *
 *   □ Provide screenshots of the Accounts Review screen.
 *   □ Confirm navigation path: how is Accounts Review accessed?
 *      (tab on Quote page? separate menu? triggered by a button?)
 *   □ Document all field names, types, and read/write status.
 *   □ Document available actions (Approve, Reject, Request Changes, etc.).
 *   □ Confirm any role restrictions (CUO-only, UW-only, etc.).
 *   □ Update all PLACEHOLDER locators after inspecting live DOM.
 *   □ Implement fill/assertion methods once field names are confirmed.
 */

import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage }                         from './BasePage';

// ── Placeholder data types ─────────────────────────────────────────────────

/** PLACEHOLDER — replace with real Accounts Review field data type */
export interface AccountsReviewData {
  [key: string]: string | undefined;
}

// ══════════════════════════════════════════════════════════════════════════════
// AccountsReviewPage
// ══════════════════════════════════════════════════════════════════════════════

export class AccountsReviewPage extends BasePage {

  // ── Navigation ────────────────────────────────────────────────────────────

  /**
   * PLACEHOLDER: tab / link to open Accounts Review.
   * Update with the real navigation element once screenshots are provided.
   */
  get tabOrLinkAccountsReview(): Locator {
    return this.page.getByRole('tab', { name: 'Accounts Review' })
      .or(this.page.getByRole('link', { name: 'Accounts Review' }))
      .or(this.page.getByText('Accounts Review', { exact: false }));
  }

  // ── Page header / title ───────────────────────────────────────────────────

  /**
   * PLACEHOLDER: page heading or title text.
   */
  get pageHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Accounts Review' })
      .or(this.page.getByText('Accounts Review', { exact: false }).first());
  }

  // ── Status / review fields — PLACEHOLDER ──────────────────────────────────

  /**
   * PLACEHOLDER — review status field or badge.
   */
  get fieldReviewStatus(): Locator {
    return this.page.getByLabel('Review Status', { exact: false });  // PLACEHOLDER
  }

  /**
   * PLACEHOLDER — reviewer name / assigned reviewer.
   */
  get fieldReviewer(): Locator {
    return this.page.getByLabel('Reviewer', { exact: false });  // PLACEHOLDER
  }

  /**
   * PLACEHOLDER — review comments / notes text area.
   */
  get fieldComments(): Locator {
    return this.page.getByLabel('Comments', { exact: false })
      .or(this.page.getByLabel('Notes', { exact: false }));  // PLACEHOLDER
  }

  // ── Action buttons — PLACEHOLDER ──────────────────────────────────────────

  /**
   * PLACEHOLDER — Approve action button.
   */
  get btnApprove(): Locator {
    return this.page.getByRole('button', { name: 'Approve' });  // PLACEHOLDER
  }

  /**
   * PLACEHOLDER — Reject action button.
   */
  get btnReject(): Locator {
    return this.page.getByRole('button', { name: 'Reject' });  // PLACEHOLDER
  }

  /**
   * PLACEHOLDER — Request Changes action button.
   */
  get btnRequestChanges(): Locator {
    return this.page.getByRole('button', { name: /Request Changes/i });  // PLACEHOLDER
  }

  /**
   * PLACEHOLDER — Submit for Review action button.
   */
  get btnSubmitForReview(): Locator {
    return this.page.getByRole('button', { name: /Submit.*Review/i });  // PLACEHOLDER
  }

  // ── High-level actions — PLACEHOLDER ──────────────────────────────────────

  /**
   * PLACEHOLDER — navigates to the Accounts Review screen.
   * Update the navigation method once the real path is confirmed.
   */
  async goToAccountsReview(): Promise<void> {
    this.log('PLACEHOLDER: navigating to Accounts Review');
    await this.tabOrLinkAccountsReview.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * PLACEHOLDER — fills review fields and submits.
   *
   * Evidence needed:
   *   □ Screenshots showing all editable fields in Accounts Review
   *   □ Available action buttons and their expected outcomes
   */
  async submitReview(data: AccountsReviewData): Promise<void> {
    this.log('PLACEHOLDER: submitReview — fields not yet documented');
    throw new Error(
      'AccountsReviewPage.submitReview is a PLACEHOLDER.\n' +
      'Provide Accounts Review screenshots and AC to implement this method.'
    );
  }

  // ── Assertions — PLACEHOLDER ──────────────────────────────────────────────

  /**
   * Asserts the Accounts Review page or section is visible.
   */
  async assertPageLoaded(): Promise<void> {
    await expect(
      this.pageHeading,
      'Accounts Review heading should be visible',
    ).toBeVisible({ timeout: 15_000 });
    this.log('✅ Accounts Review page loaded');
  }

  /**
   * PLACEHOLDER — asserts the review status shows the expected value.
   */
  async assertReviewStatus(expectedStatus: string): Promise<void> {
    this.log(`PLACEHOLDER: assertReviewStatus("${expectedStatus}") — locator TBD`);
    await expect(
      this.fieldReviewStatus,
      `Review Status should be "${expectedStatus}"`,
    ).toContainText(expectedStatus);
  }

  protected log(message: string): void {
    console.log(`[AccountsReviewPage] ${message}`);
  }
}
