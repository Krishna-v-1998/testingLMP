/**
 * BindingInstructionsChecklistPage.ts
 *
 * Page Object for the Binding Instructions Checklist page.
 *
 * ── PLACEHOLDER STATUS ────────────────────────────────────────────────────────
 *   Used during Quoted → Bound status transition.
 *   Requires screenshots before full assertions can be authored.
 * ── TODO ─────────────────────────────────────────────────────────────────────
 *   □ Confirm navigation path (tab vs sidebar link).
 *   □ Map all radio button groups.
 *   □ Add completeChecklist() implementation after DOM inspection.
 */

import { type Locator } from '@playwright/test';
import { BasePage }     from './base/BasePage';

export interface BindingInstructionsChecklistData {
  [key: string]: string | boolean | undefined;
}

export class BindingInstructionsChecklistPage extends BasePage {

  // ── Navigation ────────────────────────────────────────────────────────

  get tabOrBtnBindingInstructions(): Locator {
    return this.page.getByRole('tab', { name: /binding\s*instructions/i })
      .or(this.page.getByRole('link', { name: /binding\s*instructions/i }))
      .or(this.page.getByText(/binding\s*instructions\s*checklist/i).first());
  }

  get btnSave(): Locator {
    return this.page.getByRole('button', { name: /^save$/i });
  }

  // ── High-level actions ────────────────────────────────────────────────

  async goToBindingInstructionsChecklist(): Promise<void> {
    this.log('Navigating to Binding Instructions Checklist');
    await this.tabOrBtnBindingInstructions.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Completes the Binding Instructions Checklist.
   * PLACEHOLDER — radio buttons and fields to be mapped from live DOM.
   */
  async completeChecklist(_data?: BindingInstructionsChecklistData): Promise<void> {
    this.log('Completing Binding Instructions Checklist (PLACEHOLDER)');
    // TODO: map radio groups from screenshots / live DOM
    // Example:
    // await this.page.getByLabel(/some radio group/i).getByRole('radio', { name: /Yes/ }).click();

    if (await this.btnSave.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await this.btnSave.click();
      await this.page.waitForLoadState('networkidle');
    }
  }
}
