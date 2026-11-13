/**
 * FormSetOrderPage.ts
 *
 * Page Object for the "04 Form Set Order" step within a Quote.
 *
 * ── TAB WIZARD STRUCTURE (confirmed from screenshots) ───────────────────────
 *
 *   The Quote detail view has a 4-step wizard displayed as numbered circles:
 *
 *     ① Quote Details  →  ② Forms  →  ③ Forms Preview  →  ④ Form Set Order
 *
 *   Each step is rendered as a clickable circle+label element.
 *   Steps become active/clickable as the workflow progresses.
 *
 *   Navigating to "Form Set Order" (step 04) requires:
 *     1. Creating a quote (step 01 saved)
 *     2. Selecting forms (step 02 saved)
 *     3. Completing Forms Preview (step 03)
 *     4. The Form Set Order step (step 04) becomes clickable
 *
 * ── LIFECYCLE POSITION ──────────────────────────────────────────────────────
 *
 *   Quote Details → Forms → Forms Preview → [Form Set Order] → Finalize
 *                                                               ↓
 *                                                    Quote status = Finalized
 *
 * ── PLACEHOLDER STATUS ──────────────────────────────────────────────────────
 *
 *   Tab navigation confirmed. The content of step 04 (the form-order list,
 *   reorder controls, and Finalize button placement) is UNCONFIRMED — the
 *   tab was visible in screenshots but was never shown as the active step.
 *
 * ── TODO ───────────────────────────────────────────────────────────────────
 *
 *   □ Screenshot of Form Set Order tab content (the active/open state).
 *   □ Confirm whether reordering uses drag-and-drop, up/down arrow buttons,
 *     or numbered input fields.
 *   □ Confirm "Finalize" button label and any confirmation dialog.
 *   □ Update form-row and reorder-control selectors after DOM inspection.
 */

import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage }                         from './BasePage';
import { FormOrder }                        from '../types/quote.types';

export class FormSetOrderPage extends BasePage {

  // ── Tab wizard step 04 ────────────────────────────────────────────────────

  /**
   * "04 Form Set Order" step in the wizard.
   *
   * From screenshots: steps are shown as numbered circles followed by text.
   * The step label text is "Form Set Order" (the number "04" may or may not
   * be part of the accessible name depending on how the DOM renders it).
   *
   * Try the more-specific label first; fall back to text search.
   */
  get tabFormSetOrder(): Locator {
    return this.page.getByRole('tab', { name: /Form Set Order/i })
      .or(this.page.getByRole('button', { name: /Form Set Order/i }))
      .or(this.page.getByText('Form Set Order', { exact: true }));
  }

  /**
   * Active/highlighted step indicator for Form Set Order.
   * Useful for asserting the user has reached this step.
   */
  get activeStepFormSetOrder(): Locator {
    // The active step circle is typically styled differently (blue filled vs grey)
    // PLACEHOLDER: adjust selector once DOM is inspected on the active state.
    return this.page
      .locator('[class*="step"][class*="active"], [class*="wizard"][class*="active"]')
      .filter({ hasText: 'Form Set Order' });
  }

  // ── Finalize button ───────────────────────────────────────────────────────

  /**
   * "Finalize" button that submits the form order and transitions the
   * quote status to "Finalized".
   *
   * PLACEHOLDER — confirm button label from live DOM; it may read
   * "Finalize", "Finalize Quote", or "Submit".
   */
  get btnFinalize(): Locator {
    return this.page.getByRole('button', { name: 'Finalize' })
      .or(this.page.getByRole('button', { name: 'Finalize Quote' }));
  }

  // ── Form-order list items ─────────────────────────────────────────────────
  //
  // These selectors are PLACEHOLDER until a screenshot of the active
  // Form Set Order step is provided.

  /**
   * Row in the form-order list identified by form number or name.
   * PLACEHOLDER — selector depends on actual DOM rendering.
   */
  formOrderRow(formNumberOrName: string): Locator {
    return this.page
      .locator(
        // Try common list-item patterns; update after DOM inspection
        '[data-section="form-order-list"] li, ' +
        '[class*="form-order"] [role="listitem"], ' +
        '[role="listitem"]'
      )
      .filter({ hasText: formNumberOrName });
  }

  /**
   * "Move Up" / up-arrow button within a form row.
   * PLACEHOLDER — confirm aria-label / title from live DOM.
   */
  moveUpBtn(formNumberOrName: string): Locator {
    return this.formOrderRow(formNumberOrName)
      .locator(
        'button[aria-label*="Move Up"], ' +
        'button[title*="Up"], ' +
        'button[aria-label*="up"]'
      );  // PLACEHOLDER
  }

  /**
   * "Move Down" / down-arrow button within a form row.
   * PLACEHOLDER.
   */
  moveDownBtn(formNumberOrName: string): Locator {
    return this.formOrderRow(formNumberOrName)
      .locator(
        'button[aria-label*="Move Down"], ' +
        'button[title*="Down"], ' +
        'button[aria-label*="down"]'
      );  // PLACEHOLDER
  }

  // ── High-level actions ─────────────────────────────────────────────────────

  /**
   * Clicks the "Form Set Order" step in the wizard and waits for it to load.
   */
  async goToFormSetOrderTab(): Promise<void> {
    this.log('Clicking Form Set Order step (04)');
    await this.tabFormSetOrder.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Reorders forms according to the given FormOrder (array of form numbers/names).
   *
   * PLACEHOLDER IMPLEMENTATION — awaiting confirmation of the reorder mechanism.
   *
   * Once the actual UI is confirmed, replace with one of:
   *   Option A (up/down arrow buttons):
   *     for each target position, click the Up button on the target form
   *     until it reaches the desired index
   *
   *   Option B (drag-and-drop):
   *     await this.formOrderRow(source).dragTo(this.formOrderRow(target))
   *
   * @param desiredOrder - Array of form numbers/names in the desired final order.
   */
  async reorderForms(desiredOrder: FormOrder): Promise<void> {
    this.log(`Reordering forms: [${desiredOrder.join(', ')}]`);
    this.log('PLACEHOLDER: reorder mechanism not confirmed — awaiting Form Set Order screenshots');
    // TODO: implement after confirming reorder UI in the active step
  }

  /**
   * Clicks Finalize and waits for the quote status to update to "Finalized".
   */
  async clickFinalize(): Promise<void> {
    this.log('Clicking Finalize on Form Set Order step');
    await this.btnFinalize.click();
    await this.page.waitForLoadState('networkidle');
    this.log('Finalize clicked — quote should now be Finalized');
  }

  // ── Assertions ─────────────────────────────────────────────────────────────

  /**
   * Asserts the Form Set Order step is visible and active in the wizard.
   */
  async assertStepActive(): Promise<void> {
    // The step text "Form Set Order" should be visible in the wizard
    await expect(
      this.tabFormSetOrder,
      'Form Set Order step should be visible in the wizard',
    ).toBeVisible({ timeout: 10_000 });
    this.log('✅ Form Set Order step is visible');
  }

  /**
   * Asserts the forms appear in the given order in the Form Set Order list.
   * PLACEHOLDER — full implementation awaiting DOM inspection.
   */
  async assertFormOrder(expectedOrder: FormOrder): Promise<void> {
    this.log('PLACEHOLDER: assertFormOrder — awaiting Form Set Order content screenshots');
    // TODO: get all row texts, compare to expectedOrder
    // const rows = this.page.locator('[role="listitem"]');
    // const texts = await rows.allTextContents();
    // expectedOrder.forEach((form, idx) => {
    //   expect(texts[idx]).toContain(form);
    // });
  }

  protected log(message: string): void {
    console.log(`[FormSetOrderPage] ${message}`);
  }
}
