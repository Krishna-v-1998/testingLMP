/**
 * PolicyPage.ts
 *
 * Page Object for the "Policy" tab within Exposures & Quotes.
 *
 * ── TAB NAVIGATION (confirmed from screenshots) ─────────────────────────────
 *
 *   Exposures & Quotes outer tab bar (confirmed from screenshots):
 *
 *     ┌─────────┬──────────┬─────────────────┬────────┐
 *     │  Quote  │  Binder  │ Premium Booking  │ Policy │  ← active here
 *     └─────────┴──────────┴─────────────────┴────────┘
 *
 *   These are the same outer tabs seen in the Quote list view.
 *
 * ── LIFECYCLE POSITION ─────────────────────────────────────────────────────
 *
 *   Quote → Binder → Premium Booking → Policy
 *                                         ↑
 *                                       here
 *
 *   - After Premium Booking is processed ("Send to WINS"), submission status
 *     transitions from "In-Processing" to "Issued".
 *   - Policy Activities screen is accessible from the Issued state.
 *
 * ── PLACEHOLDER STATUS ──────────────────────────────────────────────────────
 *
 *   Tab confirmed. Policy list table columns, toolbar buttons, policy detail
 *   fields, and status values are UNCONFIRMED — no screenshots of the Policy
 *   tab content have been provided.
 *
 * ── TODO ───────────────────────────────────────────────────────────────────
 *
 *   □ Provide screenshots of the Policy tab list view.
 *   □ Confirm Policy list table columns (similar to Quote list?).
 *   □ Confirm toolbar actions (Generate Policy, Finalize Policy, etc.).
 *   □ Confirm Policy Activity Screen structure.
 *   □ Confirm Forms workflow on Policy (tabs similar to Quote wizard?).
 *   □ Confirm submission status transitions: In-Processing → Issued.
 *   □ Update all PLACEHOLDER selectors after inspecting live DOM.
 */

import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage }                         from './BasePage';
import { PolicyStatus, SubmissionStatus }   from '../types/quote.types';

export class PolicyPage extends BasePage {

  // ── Main lifecycle tab (confirmed) ────────────────────────────────────────

  /**
   * "Policy" tab in the Exposures & Quotes outer tab bar.
   * Confirmed from screenshots: tab label is exactly "Policy".
   */
  get tabPolicy(): Locator {
    return this.page.getByRole('tab', { name: 'Policy', exact: true });
  }

  // ── Policy list toolbar — PLACEHOLDER ────────────────────────────────────
  //
  // The Quote tab toolbar shows: Finalize Quote | Send To | + Add New | Generate Binder
  // The Policy tab toolbar is likely similar but with policy-specific actions.
  // Update once a screenshot of the Policy tab toolbar is confirmed.

  /**
   * PLACEHOLDER — Generate Policy button in the toolbar.
   * (May correspond to "Generate Binder" on the Binder tab.)
   */
  get btnGeneratePolicy(): Locator {
    return this.page.getByRole('button', { name: /Generate Policy/i });  // PLACEHOLDER
  }

  /**
   * PLACEHOLDER — Finalize Policy button in the toolbar.
   */
  get btnFinalizePolicy(): Locator {
    return this.page.getByRole('button', { name: /Finalize Policy/i });  // PLACEHOLDER
  }

  // ── Policy list filter controls — PLACEHOLDER ────────────────────────────
  //
  // The Quote tab has: Keyword input, FILTER, Clear All, Active/Archived toggle.
  // Assuming the Policy tab has the same controls.

  /** Keyword search input in the Policy list */
  get inputKeyword(): Locator {
    return this.page.getByPlaceholder('Keyword', { exact: false });
  }

  /** FILTER button */
  get btnFilter(): Locator {
    return this.page.getByRole('button', { name: 'FILTER' })
      .or(this.page.getByRole('button', { name: 'Filter' }));
  }

  /** "Active Policies" radio button */
  get radioActivePolicies(): Locator {
    return this.page.getByRole('radio', { name: /Active/i });
  }

  /** "Archived Policies" radio button */
  get radioArchivedPolicies(): Locator {
    return this.page.getByRole('radio', { name: /Archived/i });
  }

  /** Empty-state text when no policies exist */
  get emptyStateText(): Locator {
    // Confirmed from screenshots: Quote tab shows "No data found" (lowercase "data found")
    return this.page.getByText('No data found', { exact: false });
  }

  // ── Policy list table ─────────────────────────────────────────────────────
  //
  // PLACEHOLDER — column names for the Policy list table are not confirmed
  // from screenshots. Assumed to be similar to the Quote list which shows:
  //   QUOTE ID | CLONED FROM | PRODUCT ID(S) | DESCRIPTION | STATE | EFFECTIVE DATE | STATUS | ACTIONS
  // Replace with real column names once a Policy tab screenshot is provided.

  /**
   * Returns the table row for a given Policy ID.
   * PLACEHOLDER — adjust selector once real DOM is inspected.
   */
  policyRow(policyId: string): Locator {
    return this.page
      .locator('table tbody tr, [role="row"]')
      .filter({ hasText: policyId });
  }

  /**
   * Checkbox within a policy row (for selecting to run actions on it).
   * PLACEHOLDER — confirm checkbox selector from DOM.
   */
  policyRowCheckbox(policyId: string): Locator {
    return this.policyRow(policyId)
      .locator('input[type="checkbox"]');  // PLACEHOLDER
  }

  /**
   * View / open action link/button for a policy row.
   * PLACEHOLDER — update aria-label / button name from DOM inspection.
   */
  policyViewBtn(policyId: string): Locator {
    return this.policyRow(policyId)
      .locator(
        'button[aria-label*="View"], ' +
        'button[aria-label*="Open"], ' +
        'a[href*="policy"]'
      );  // PLACEHOLDER
  }

  // ── Policy detail view ────────────────────────────────────────────────────
  //
  // The following locators are for the Policy detail / activity screen.
  // PLACEHOLDER until screenshots of the Policy detail view are provided.

  /** Policy ID displayed on the detail view (read-only) */
  get detailPolicyId(): Locator {
    return this.page.getByLabel('Policy ID');  // PLACEHOLDER
  }

  /** Policy status badge / field (Draft | Generated | Finalized) */
  get detailPolicyStatus(): Locator {
    // PLACEHOLDER — adjust once real DOM field for policy status is confirmed
    return this.page
      .locator('[data-field="policyStatus"], [aria-label="Policy Status"]')
      .or(this.page.getByLabel(/Policy Status/i));
  }

  /** Submission status badge / field (In-Processing | Issued) */
  get detailSubmissionStatus(): Locator {
    // PLACEHOLDER — adjust once real DOM field for submission status is confirmed.
    // The submission status header bar (shown in all screenshots) may be a better
    // source for this value — it shows "POLICY NO", "SUBMISSION NO", etc.
    return this.page
      .locator('[data-field="submissionStatus"], [aria-label="Submission Status"]')
      .or(this.page.getByLabel(/Submission Status/i));
  }

  /** "Policy Activity" header or section */
  get policyActivitySection(): Locator {
    return this.page.getByText('Policy Activity', { exact: false });  // PLACEHOLDER
  }

  // ── Policy Activity Screen controls (PLACEHOLDER) ─────────────────────────

  /** Download policy documents button */
  get btnDownload(): Locator {
    return this.page.getByRole('button', { name: 'Download' });  // PLACEHOLDER
  }

  /**
   * Any "Void Policy" or "Cancel Policy" action.
   * PLACEHOLDER — confirm button label from DOM.
   */
  get btnVoidOrCancel(): Locator {
    return this.page.getByRole('button', { name: /void|cancel/i });  // PLACEHOLDER
  }

  // ── High-level actions ─────────────────────────────────────────────────────

  /**
   * Navigates to the Policy tab and waits for the list to settle.
   */
  async goToPolicyTab(): Promise<void> {
    this.log('Navigating to Policy tab');
    await this.tabPolicy.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Opens a policy by clicking its row in the list.
   * PLACEHOLDER — assumes clicking the row opens the policy detail view.
   * Update if policies are opened via a link in a specific column instead.
   */
  async openPolicy(policyId: string): Promise<void> {
    this.log(`Opening policy: ${policyId}`);
    await this.policyRow(policyId).click();
    await this.page.waitForLoadState('networkidle');
  }

  // ── Assertions ─────────────────────────────────────────────────────────────

  /** Asserts the Policy list tab is visible */
  async assertTabVisible(): Promise<void> {
    await expect(
      this.tabPolicy,
      'Policy tab should be visible in Exposures & Quotes',
    ).toBeVisible();
    this.log('✅ Policy tab is visible');
  }

  /** Asserts the Policy list shows the empty-state message */
  async assertEmptyState(): Promise<void> {
    await expect(
      this.emptyStateText,
      'Policy tab: "No data found" should be visible when empty',
    ).toBeVisible();
  }

  /** Asserts a policy row is present in the list */
  async assertPolicyInList(policyId: string): Promise<void> {
    await expect(
      this.policyRow(policyId),
      `Policy "${policyId}" should appear in the Policy list`,
    ).toBeVisible();
  }

  /**
   * Asserts the Policy status on the detail screen.
   * PLACEHOLDER — locator needs live DOM confirmation.
   */
  async assertPolicyStatus(expectedStatus: PolicyStatus): Promise<void> {
    await expect(
      this.detailPolicyStatus,
      `Policy status should be "${expectedStatus}"`,
    ).toContainText(expectedStatus);
    this.log(`✅ Policy status = ${expectedStatus}`);
  }

  /**
   * Asserts the submission status on the detail screen.
   * PLACEHOLDER — locator needs live DOM confirmation.
   */
  async assertSubmissionStatus(expectedStatus: SubmissionStatus): Promise<void> {
    await expect(
      this.detailSubmissionStatus,
      `Submission status should be "${expectedStatus}"`,
    ).toContainText(expectedStatus);
    this.log(`✅ Submission status = ${expectedStatus}`);
  }

  /**
   * Asserts the Policy Activity section is visible.
   * PLACEHOLDER — update section header text once confirmed.
   */
  async assertPolicyActivityVisible(): Promise<void> {
    await expect(
      this.policyActivitySection,
      'Policy Activity section should be visible on Policy detail screen',
    ).toBeVisible();
    this.log('✅ Policy Activity section is visible');
  }

  protected log(message: string): void {
    console.log(`[PolicyPage] ${message}`);
  }
}
