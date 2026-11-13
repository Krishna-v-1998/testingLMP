/**
 * PolicyPage.ts
 *
 * Page Object for the "Policy" tab within Exposures & Quotes.
 *
 * ── LIFECYCLE POSITION ─────────────────────────────────────────────────────────
 *
 *   Quote → Binder → Premium Booking → Policy
 *                                         ↑
 *                                       here
 *
 * ── PLACEHOLDER STATUS ────────────────────────────────────────────────────────
 *
 *   This page requires detailed screenshots and acceptance criteria before
 *   full locators and assertions can be authored.
 *
 *   From the specification:
 *   - Policy tab is the final stage of the lifecycle.
 *   - After Premium Booking is processed, the submission status transitions
 *     from "In-Processing" to "Issued".
 *   - Policy Activities screen is accessible from the Issued state.
 *   - Quote and Binder Forms are carried forward to Policy.
 *   - Detailed fields, actions, and statuses for Policy differ from Quote/Binder
 *     — the user noted "Having Different, will explain later".
 *
 * ── TODO ───────────────────────────────────────────────────────────────────────
 *
 *   □ Provide screenshots of the Policy tab list view.
 *   □ Confirm available actions: view policy, download, void, cancel, etc.
 *   □ Confirm Policy Activity Screen structure and what it shows.
 *   □ Confirm Forms workflow on Policy (same as Binder or different?).
 *   □ Confirm submission status transitions: In-Processing → Issued.
 *   □ Update all PLACEHOLDER selectors after inspecting live DOM.
 *   □ Implement full assertions once acceptance criteria are supplied.
 *
 * ── LOCATOR STRATEGY ──────────────────────────────────────────────────────────
 *
 *   Prefer (most stable → least stable):
 *     1. getByRole + accessible name
 *     2. getByLabel
 *     3. getByText with { exact: true }
 *     4. data-testid attribute
 *     5. CSS selector as absolute last resort (comment why)
 */

import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage }                         from './BasePage';
import { PolicyStatus, SubmissionStatus }   from '../types/quote.types';

export class PolicyPage extends BasePage {

  // ── Main lifecycle tab ─────────────────────────────────────────────────────

  get tabPolicy(): Locator {
    return this.page.getByRole('tab', { name: 'Policy' });
  }

  // ── Policy list controls ──────────────────────────────────────────────────

  /** Search box in the Policy list */
  get inputSearch(): Locator {
    return this.page.getByPlaceholder('Search', { exact: false });
  }

  /** Empty-state text when no policies exist */
  get emptyStateText(): Locator {
    return this.page.getByText('No Data Found');
  }

  // ── Policy table / list ───────────────────────────────────────────────────

  /**
   * Returns the table row for the given Policy ID.
   * PLACEHOLDER: adjust row selector once the real DOM is inspected.
   */
  policyRow(policyId: string): Locator {
    return this.page
      .locator('table tbody tr, [role="row"]')
      .filter({ hasText: policyId });
  }

  /**
   * View / open action button for a policy row.
   * PLACEHOLDER: update aria-label / button name from DOM inspection.
   */
  policyViewBtn(policyId: string): Locator {
    return this.policyRow(policyId)
      .locator(
        'button[aria-label*="View"], button[aria-label*="Open"], button[title*="View"]'
      );  // PLACEHOLDER
  }

  // ── Policy detail ─────────────────────────────────────────────────────────
  //
  // The following locators are for the Policy detail / activity screen.
  // These are PLACEHOLDER until screenshots and DOM inspection are provided.

  /** Policy ID displayed on the detail view (read-only) */
  get detailPolicyId(): Locator {
    return this.page.getByLabel('Policy ID');  // PLACEHOLDER
  }

  /** Policy status badge / field */
  get detailPolicyStatus(): Locator {
    return this.page.locator('[data-field="policyStatus"], [aria-label="Policy Status"]');  // PLACEHOLDER
  }

  /** Submission status badge / field */
  get detailSubmissionStatus(): Locator {
    return this.page.locator('[data-field="submissionStatus"], [aria-label="Submission Status"]');  // PLACEHOLDER
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
    return this.page.getByRole(
      'button',
      { name: /void|cancel/i }
    );  // PLACEHOLDER
  }

  // ── High-level actions ─────────────────────────────────────────────────────

  /** Navigates to the Policy tab and waits for the list to stabilise */
  async goToPolicyTab(): Promise<void> {
    this.log('Navigating to Policy tab');
    await this.tabPolicy.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Opens a policy detail by clicking its row.
   * PLACEHOLDER: assumes clicking the row opens the detail.
   */
  async openPolicy(policyId: string): Promise<void> {
    this.log(`Opening policy: ${policyId}`);
    await this.policyRow(policyId).click();
    await this.page.waitForLoadState('networkidle');
  }

  // ── Assertions ─────────────────────────────────────────────────────────────

  /** Asserts the Policy list shows the empty-state message */
  async assertEmptyState(): Promise<void> {
    await expect(
      this.emptyStateText,
      'Policy tab: "No Data Found" should be visible when empty'
    ).toBeVisible();
  }

  /** Asserts a policy row exists in the table */
  async assertPolicyInList(policyId: string): Promise<void> {
    await expect(
      this.policyRow(policyId),
      `Policy "${policyId}" should appear in the Policy list`
    ).toBeVisible();
  }

  /**
   * Asserts the Policy status on the detail screen.
   * PLACEHOLDER: adjust the locator once real DOM is known.
   */
  async assertPolicyStatus(expectedStatus: PolicyStatus): Promise<void> {
    await expect(
      this.detailPolicyStatus,
      `Policy status should be "${expectedStatus}"`
    ).toContainText(expectedStatus);
    this.log(`✅ Policy status = ${expectedStatus}`);
  }

  /**
   * Asserts the submission status on the detail screen.
   * PLACEHOLDER: adjust the locator once real DOM is known.
   */
  async assertSubmissionStatus(expectedStatus: SubmissionStatus): Promise<void> {
    await expect(
      this.detailSubmissionStatus,
      `Submission status should be "${expectedStatus}"`
    ).toContainText(expectedStatus);
    this.log(`✅ Submission status = ${expectedStatus}`);
  }

  /**
   * Asserts the Policy Activity section is visible.
   * PLACEHOLDER: update once the actual section header text is confirmed.
   */
  async assertPolicyActivityVisible(): Promise<void> {
    await expect(
      this.policyActivitySection,
      'Policy Activity section should be visible on Policy detail screen'
    ).toBeVisible();
    this.log('✅ Policy Activity section is visible');
  }

  protected log(message: string): void {
    console.log(`[PolicyPage] ${message}`);
  }
}
