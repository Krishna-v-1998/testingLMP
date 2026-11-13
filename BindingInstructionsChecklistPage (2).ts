/**
 * BindingInstructionsChecklistPage.ts
 *
 * Page Object for the Binding Instructions Checklist screen.
 *
 * ── LIFECYCLE POSITION ──────────────────────────────────────────────────────
 *
 *   Quote → Binder → [Binding Instructions Checklist] → Premium Booking → Policy
 *
 *   This checklist is part of the Binder workflow. It likely appears as a
 *   tab or section within the Binder detail view — to be confirmed.
 *
 * ── NAVIGATION PATH ─────────────────────────────────────────────────────────
 *
 *   Exposures & Quotes → Binder tab → open a Binder row → Binding Instructions
 *
 *   The exact navigation element (tab, button, sidebar link) is UNCONFIRMED.
 *   Screenshots of the Binder detail screen are needed.
 *
 * ── PLACEHOLDER STATUS ──────────────────────────────────────────────────────
 *
 *   FULL PLACEHOLDER — no screenshots have been provided for this screen.
 *
 * ── TODO ───────────────────────────────────────────────────────────────────
 *
 *   □ Provide screenshots of the Binding Instructions Checklist screen.
 *   □ Confirm navigation path: tab, button, or link that opens it.
 *   □ Document all checklist item names and field types
 *      (checkbox, dropdown, text, date).
 *   □ Confirm submission / save action labels.
 *   □ Document any role restrictions (CUO, UW, broker, etc.).
 *   □ Confirm expected binder/submission status after completing the checklist.
 *   □ Update all PLACEHOLDER locators after inspecting live DOM.
 */

import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage }                         from './BasePage';

// ── Checklist item status ──────────────────────────────────────────────────

export type ChecklistItemStatus = 'Not Started' | 'In Progress' | 'Complete' | 'N/A';

// ── Placeholder data type ─────────────────────────────────────────────────

/** PLACEHOLDER — replace with real checklist field data type once confirmed */
export interface BindingInstructionsChecklistData {
  [key: string]: string | boolean | undefined;
}

// ══════════════════════════════════════════════════════════════════════════════
// BindingInstructionsChecklistPage
// ══════════════════════════════════════════════════════════════════════════════

export class BindingInstructionsChecklistPage extends BasePage {

  // ── Navigation ────────────────────────────────────────────────────────────

  /**
   * Element that opens the Binding Instructions Checklist.
   * PLACEHOLDER — could be a tab, button, or sidebar link.
   * Update once confirmed from screenshots of the Binder detail view.
   */
  get tabOrBtnBindingInstructions(): Locator {
    return this.page.getByRole('tab', { name: /Binding Instructions/i })
      .or(this.page.getByRole('button', { name: /Binding Instructions/i }))
      .or(this.page.getByText('Binding Instructions Checklist', { exact: false }))
      .or(this.page.getByText('Binding Instructions', { exact: true }));
  }

  // ── Page header ───────────────────────────────────────────────────────────

  get pageHeading(): Locator {
    return this.page.getByRole('heading', { name: /Binding Instructions/i })
      .or(this.page.getByText('Binding Instructions Checklist', { exact: false }).first());
  }

  // ── Checklist sections / items — PLACEHOLDER ──────────────────────────────
  //
  // Add individual checklist item locators here once screenshots are provided.
  //
  // Pattern (replace with real item names once confirmed):
  //
  //   get checklistItemPaymentTerms(): Locator {
  //     return this.page.getByRole('checkbox', { name: 'Payment Terms Confirmed' });
  //   }
  //
  //   get checklistItemSpecialConditions(): Locator {
  //     return this.page.getByRole('checkbox', { name: 'Special Conditions Noted' });
  //   }

  /**
   * PLACEHOLDER — first checklist item (replace with real item name).
   */
  get checklistItem1(): Locator {
    return this.page.locator('[data-checklist-item="1"]');  // PLACEHOLDER
  }

  /**
   * PLACEHOLDER — second checklist item.
   */
  get checklistItem2(): Locator {
    return this.page.locator('[data-checklist-item="2"]');  // PLACEHOLDER
  }

  // ── Status / summary fields — PLACEHOLDER ─────────────────────────────────

  /**
   * PLACEHOLDER — overall checklist completion status.
   */
  get fieldChecklistStatus(): Locator {
    return this.page.getByLabel('Checklist Status', { exact: false });  // PLACEHOLDER
  }

  /**
   * PLACEHOLDER — special instructions / notes text area.
   */
  get fieldSpecialInstructions(): Locator {
    return this.page.getByLabel(/Special Instructions/i)
      .or(this.page.getByLabel(/Binding Notes/i));  // PLACEHOLDER
  }

  // ── Action buttons — PLACEHOLDER ──────────────────────────────────────────

  /**
   * PLACEHOLDER — Save button.
   */
  get btnSave(): Locator {
    return this.page.getByRole('button', { name: 'Save' });  // PLACEHOLDER
  }

  /**
   * PLACEHOLDER — Complete / Finalize checklist button.
   */
  get btnComplete(): Locator {
    return this.page.getByRole('button', { name: /Complete|Finalize/i });  // PLACEHOLDER
  }

  /**
   * PLACEHOLDER — Submit checklist button.
   */
  get btnSubmit(): Locator {
    return this.page.getByRole('button', { name: 'Submit' });  // PLACEHOLDER
  }

  // ── High-level actions ─────────────────────────────────────────────────────

  /**
   * Navigates to the Binding Instructions Checklist.
   * PLACEHOLDER — update navigation method once confirmed.
   */
  async goToBindingInstructionsChecklist(): Promise<void> {
    this.log('PLACEHOLDER: navigating to Binding Instructions Checklist');
    await this.tabOrBtnBindingInstructions.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * PLACEHOLDER — completes the Binding Instructions Checklist.
   *
   * Evidence needed:
   *   □ Screenshots of all checklist items
   *   □ Field types for each item (checkbox, text, dropdown, etc.)
   *   □ Required vs optional items
   *   □ What "Complete" action triggers downstream (binder status change?)
   *   □ Any confirmation dialogs
   */
  async completeChecklist(data: BindingInstructionsChecklistData): Promise<void> {
    this.log('PLACEHOLDER: completeChecklist — checklist items not yet documented');
    throw new Error(
      'BindingInstructionsChecklistPage.completeChecklist is a PLACEHOLDER.\n' +
      'Provide Binding Instructions Checklist screenshots and AC to implement this method.'
    );
  }

  // ── Assertions ─────────────────────────────────────────────────────────────

  /**
   * Asserts the Binding Instructions Checklist page is visible and loaded.
   */
  async assertPageLoaded(): Promise<void> {
    await expect(
      this.pageHeading,
      'Binding Instructions Checklist heading should be visible',
    ).toBeVisible({ timeout: 15_000 });
    this.log('✅ Binding Instructions Checklist page loaded');
  }

  /**
   * PLACEHOLDER — asserts the overall checklist status.
   */
  async assertChecklistStatus(expectedStatus: ChecklistItemStatus): Promise<void> {
    this.log(`PLACEHOLDER: assertChecklistStatus("${expectedStatus}") — locator TBD`);
    await expect(
      this.fieldChecklistStatus,
      `Checklist status should be "${expectedStatus}"`,
    ).toContainText(expectedStatus);
  }

  protected log(message: string): void {
    console.log(`[BindingInstructionsChecklistPage] ${message}`);
  }
}
