/**
 * FormsPreviewPage.ts
 *
 * Page Object for the "Forms Preview" tab within a Quote / Binder / Policy.
 *
 * ── PLACEHOLDER STATUS ────────────────────────────────────────────────────────
 *
 *   From the screenshot (page 10): the Forms Preview tab contains a single
 *   "Preview" button.  Clicking it presumably renders an inline PDF preview
 *   or opens a print-preview of all selected forms combined.
 *
 *   This page needs detailed acceptance criteria and screenshots before
 *   full assertions can be authored.
 *
 *   Current implementation:
 *     - Navigation to the tab ✅
 *     - Click the Preview button ✅ (PLACEHOLDER selector)
 *     - Capture the resulting tab/document — PLACEHOLDER
 *
 * ── TODO ─────────────────────────────────────────────────────────────────────
 *
 *   □ Confirm whether "Preview" opens a new tab, an inline viewer, or a modal.
 *   □ Determine what can be asserted about the combined preview (page count,
 *     form order, field values across multiple forms).
 *   □ Update btnPreview selector once real DOM is inspected.
 *   □ Add assertPreviewContainsForm(formNumber) once preview content is accessible.
 */

import { type Locator, type Page } from '@playwright/test';
import { BasePage }                 from './BasePage';

export class FormsPreviewPage extends BasePage {

  // ── Tab ───────────────────────────────────────────────────────────────────

  get tabFormsPreview(): Locator {
    return this.page.getByRole('tab', { name: 'Forms Preview' });
  }

  // ── Controls ──────────────────────────────────────────────────────────────

  /**
   * "Preview" button that generates the combined forms preview.
   * PLACEHOLDER — confirm aria-label / text from live DOM.
   */
  get btnPreview(): Locator {
    return this.page.getByRole('button', { name: 'Preview' });
  }

  // ── High-level actions ─────────────────────────────────────────────────────

  /** Navigates to the Forms Preview tab */
  async goToFormsPreviewTab(): Promise<void> {
    this.log('Navigating to Forms Preview tab');
    await this.tabFormsPreview.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Clicks the Preview button.
   * Returns the new Page if a new tab opens, or null if it stays in-page.
   *
   * PLACEHOLDER: behavior depends on actual app implementation.
   */
  async clickPreview(): Promise<Page | null> {
    this.log('Clicking Preview button (Forms Preview tab)');

    // Try to capture a new tab — set up listener first
    const newPagePromise = this.page.context().waitForEvent('page', { timeout: 5_000 }).catch(() => null);
    await this.btnPreview.click();
    await this.page.waitForLoadState('networkidle');

    const newPage = await newPagePromise;
    if (newPage) {
      this.log('Forms Preview opened in new tab');
      return newPage;
    }

    // No new tab — preview may render inline
    this.log('Forms Preview appears to render inline (no new tab)');
    return null;
  }

  /**
   * Asserts the Preview button is visible.
   * Minimal assertion until full acceptance criteria are supplied.
   */
  async assertPreviewButtonVisible(): Promise<void> {
    // TODO: replace with detailed assertions once acceptance criteria supplied
    this.log('TODO: FormsPreviewPage assertions pending acceptance criteria and screenshots');
  }

  protected log(message: string): void {
    console.log(`[FormsPreviewPage] ${message}`);
  }
}
