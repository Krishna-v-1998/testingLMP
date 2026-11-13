/**
 * AccountsReviewPage.ts
 *
 * Page Object for the Account Review screen.
 *
 * ── NAVIGATION PATH (confirmed from screenshots) ────────────────────────────
 *
 *   Submission left-sidebar navigation:
 *
 *     NB-2026-XXXXX
 *     ├── SUBMISSION
 *     │     └── General Information
 *     ├── RISK & PRICING
 *     │     └── Underwriting File
 *     │           ├── Location Management
 *     │           ├── Exposures & Quotes
 *     │           ├── CAT Modeling
 *     │           ├── Reinsurance
 *     │           └── Account Review   ← this page
 *     ├── ARC
 *     │     └── Manage ARC Requests
 *     ├── REFERRALS
 *     │     └── Manage Referrals
 *     └── TRANSACTIONS
 *
 *   "Account Review" is a left-sidebar nav link under "Underwriting File",
 *   NOT a tab within the Quote/Binder wizard.
 *
 * ── PLACEHOLDER STATUS ──────────────────────────────────────────────────────
 *
 *   Navigation path confirmed. Page content (fields, actions, statuses) is
 *   still a PLACEHOLDER — no content screenshots have been provided.
 *
 * ── TODO ───────────────────────────────────────────────────────────────────
 *
 *   □ Provide screenshots of the Account Review page content.
 *   □ Document all field names, types, and read/write status.
 *   □ Document available actions (Approve, Reject, Request Changes, etc.).
 *   □ Confirm any role restrictions (CUO-only, UW-only, etc.).
 *   □ Update all PLACEHOLDER locators after inspecting live DOM.
 */

import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage }                         from './BasePage';

// ── Placeholder data types ─────────────────────────────────────────────────

/** PLACEHOLDER — replace with real Account Review field data type */
export interface AccountsReviewData {
  [key: string]: string | undefined;
}

// ══════════════════════════════════════════════════════════════════════════════
// AccountsReviewPage
// ══════════════════════════════════════════════════════════════════════════════

export class AccountsReviewPage extends BasePage {

  // ── Sidebar navigation link ───────────────────────────────────────────────

  /**
   * "Account Review" sidebar nav link, found inside the left-side
   * Underwriting File accordion under RISK & PRICING.
   *
   * DOM notes (from screenshots):
   *   - The left nav renders as a hierarchical list
   *   - "Underwriting File" is a collapsible parent item (accordion)
   *   - "Account Review" is a child link/item under it
   *   - Clicking it loads the Account Review screen in the main content area
   */
  get sidebarLinkAccountReview(): Locator {
    return this.page
      .locator('nav, [role="navigation"], [class*="sidebar"], [class*="nav"]')
      .getByText('Account Review', { exact: true })
      .or(
        this.page.getByRole('link', { name: 'Account Review', exact: true })
      );
  }

  /**
   * Broader fallback: any element with text "Account Review" that acts as
   * a navigation target. Useful when the sidebar is rendered as `<li>` items
   * or `<button>` elements rather than `<a>` links.
   */
  get navItemAccountReview(): Locator {
    return this.page
      .getByRole('link', { name: 'Account Review' })
      .or(this.page.getByRole('button', { name: 'Account Review' }))
      .or(this.page.getByText('Account Review', { exact: true }).first());
  }

  // ── Page heading ──────────────────────────────────────────────────────────

  /**
   * Page heading / section title once Account Review is loaded.
   * PLACEHOLDER — confirm exact text from live DOM.
   */
  get pageHeading(): Locator {
    return this.page.getByRole('heading', { name: /Account Review/i })
      .or(this.page.getByText('Account Review', { exact: false }).first());
  }

  // ── Status / review fields — PLACEHOLDER ──────────────────────────────────
  //
  // Add individual field locators here once content screenshots are provided.
  //
  // Example pattern:
  //   get fieldReviewStatus(): Locator {
  //     return this.page.getByLabel('Review Status');
  //   }

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

  // ── High-level actions ─────────────────────────────────────────────────────

  /**
   * Navigates to the Account Review page via the left sidebar.
   *
   * The sidebar link is under:
   *   RISK & PRICING → Underwriting File → Account Review
   *
   * If the "Underwriting File" accordion is collapsed, clicking
   * it first should expand it and reveal "Account Review".
   */
  async goToAccountReview(): Promise<void> {
    this.log('Navigating to Account Review via sidebar');

    // Ensure the Underwriting File accordion is expanded
    const underwrtingFileLink = this.page.getByText('Underwriting File', { exact: true });
    if (await underwrtingFileLink.isVisible()) {
      // Check if accordion is collapsed — look for the Account Review child
      const accountReviewVisible = await this.navItemAccountReview.isVisible();
      if (!accountReviewVisible) {
        this.log('Expanding Underwriting File accordion');
        await underwrtingFileLink.click();
        await this.page.waitForLoadState('domcontentloaded');
      }
    }

    await this.navItemAccountReview.click();
    await this.page.waitForLoadState('networkidle');
    this.log('Account Review page loaded');
  }

  /**
   * PLACEHOLDER — fills review fields and submits.
   *
   * Evidence needed:
   *   □ Screenshots showing all editable fields in Account Review
   *   □ Available action buttons and their expected outcomes
   */
  async submitReview(data: AccountsReviewData): Promise<void> {
    this.log('PLACEHOLDER: submitReview — fields not yet documented');
    throw new Error(
      'AccountsReviewPage.submitReview is a PLACEHOLDER.\n' +
      'Provide Account Review page screenshots and AC to implement this method.'
    );
  }

  // ── Assertions ─────────────────────────────────────────────────────────────

  /**
   * Asserts the Account Review page is loaded by checking the heading.
   */
  async assertPageLoaded(): Promise<void> {
    await expect(
      this.pageHeading,
      'Account Review heading should be visible',
    ).toBeVisible({ timeout: 15_000 });
    this.log('✅ Account Review page loaded');
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
