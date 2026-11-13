/**
 * FormSetOrderPage.ts
 *
 * Page Object for the "Form Set Order" tab within a Quote / Binder / Policy.
 *
 * ── PLACEHOLDER STATUS ─────────────────────────────────────────────────────
 *
 *   This tab allows the user to reorder forms within a formset before
 *   generating the final PDF package.
 *
 *   From the specification:
 *     - Form Order → reorder formset order → Finalize → Quote status = Finalized
 *
 *   This page needs screenshots / detailed acceptance criteria before full
 *   locators and assertions can be authored.
 *
 * ── TODO ───────────────────────────────────────────────────────────────────
 *
 *   □ Screenshot of Form Set Order tab — confirm whether drag-and-drop,
 *     up/down arrows, or input boxes are used for reordering.
 *   □ Confirm "Finalize" button placement and confirmation dialog text.
 *   □ Update all PLACEHOLDER selectors after inspecting live DOM.
 *   □ Implement reorderForms(FormOrder) once reorder mechanism is confirmed.
 */

import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage }                         from './BasePage';
import { FormOrder }                        from '../types/quote.types';

export class FormSetOrderPage extends BasePage {

  // ── Tab ───────────────────────────────────────────────────────────────────

  get tabFormSetOrder(): Locator {
    return this.page.getByRole('tab', { name: 'Form Set Order' });
  }

  // ── Controls ──────────────────────────────────────────────────────────────

  /**
   * "Finalize" button — submits the form order and finalizes the quote.
   * PLACEHOLDER — confirm button text / aria-label.
   */
  get btnFinalize(): Locator {
    return this.page.getByRole('button', { name: 'Finalize' })
      .or(this.page.getByRole('button', { name: 'Finalize Quote' }));
  }

  /**
   * Row in the form-order list.  Each row contains a form number/name and
   * reorder controls (up/down arrows or drag handle).
   * PLACEHOLDER — selector depends on actual list rendering.
   */
  formOrderRow(formNumberOrName: string): Locator {
    return this.page
      .locator('[data-section="form-order-list"] li, [role="listitem"]')  // PLACEHOLDER
      .filter({ hasText: formNumberOrName });
  }

  /**
   * Up-arrow / move-up button within a form row.
   * PLACEHOLDER.
   */
  moveUpBtn(formNumberOrName: string): Locator {
    return this.formOrderRow(formNumberOrName)
      .locator('button[aria-label*="Move Up"], button[title*="Up"]');  // PLACEHOLDER
  }

  /**
   * Down-arrow / move-down button within a form row.
   * PLACEHOLDER.
   */
  moveDownBtn(formNumberOrName: string): Locator {
    return this.formOrderRow(formNumberOrName)
      .locator('button[aria-label*="Move Down"], button[title*="Down"]');  // PLACEHOLDER
  }

  // ── High-level actions ─────────────────────────────────────────────────────

  /** Navigates to the Form Set Order tab */
  async goToFormSetOrderTab(): Promise<void> {
    this.log('Navigating to Form Set Order tab');
    await this.tabFormSetOrder.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Reorders forms according to the given FormOrder (array of form numbers).
   *
   * PLACEHOLDER IMPLEMENTATION — works by moving each form up/down iteratively.
   * Replace with drag-and-drop or the actual control mechanism once confirmed.
   *
   * @param desiredOrder - Array of form numbers in the desired order.
   */
  async reorderForms(desiredOrder: FormOrder): Promise<void> {
    this.log(`TODO: Reorder forms to: ${desiredOrder.join(', ')}`);
    this.log('PLACEHOLDER: Reorder mechanism not yet implemented — awaiting screenshots.');
    // TODO: Implement after confirming reorder UI:
    //   Option A (up/down buttons):
    //     for each position, move the target form to that index by clicking up/down
    //   Option B (drag-and-drop):
    //     await sourceRow.dragTo(targetRow)
  }

  /**
   * Clicks Finalize and waits for the quote status to update.
   */
  async clickFinalize(): Promise<void> {
    this.log('Clicking Finalize on Form Set Order tab');
    await this.btnFinalize.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ── Assertions ─────────────────────────────────────────────────────────────

  /**
   * Asserts the forms appear in the given order in the Form Set Order list.
   * PLACEHOLDER — awaiting acceptance criteria.
   */
  async assertFormOrder(expectedOrder: FormOrder): Promise<void> {
    this.log('TODO: FormSetOrderPage.assertFormOrder — PLACEHOLDER, awaiting AC');
    // TODO: get all row texts, compare to expectedOrder
  }

  protected log(message: string): void {
    console.log(`[FormSetOrderPage] ${message}`);
  }
}
