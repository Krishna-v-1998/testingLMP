/**
 * AccountsReviewPage.ts
 *
 * Page Object for the Account Review page under RISK & PRICING → Underwriting File.
 *
 * ── PLACEHOLDER STATUS ────────────────────────────────────────────────────────
 *   Navigation confirmed; field details pending screenshots.
 *   Used during Open → Quoted status transition error handling.
 * ── TODO ─────────────────────────────────────────────────────────────────────
 *   □ Add specific field locators after inspecting live DOM.
 *   □ Add assertReviewComplete() assertion.
 */

import { type Locator } from '@playwright/test';
import { BasePage }     from './base/BasePage';

export interface AccountReviewData {
  [key: string]: string | boolean | undefined;
}

export class AccountsReviewPage extends BasePage {

  // ── Sidebar navigation ────────────────────────────────────────────────

  get sidebarRiskAndPricing(): Locator {
    return this.page.getByText(/risk\s*(&|and)\s*pricing/i).first();
  }

  get sidebarUnderwritingFile(): Locator {
    return this.page.getByText(/underwriting\s*file/i).first();
  }

  get sidebarAccountReview(): Locator {
    return this.page.getByText(/account\s*review/i).first();
  }

  get btnSave(): Locator {
    return this.page.getByRole('button', { name: /^save$/i });
  }

  // ── High-level actions ────────────────────────────────────────────────

  async goToAccountReview(): Promise<void> {
    this.log('Navigating to Account Review via sidebar');

    // Expand RISK & PRICING accordion if collapsed
    const riskAccordion = this.sidebarRiskAndPricing;
    if (await this.exists(riskAccordion)) {
      await riskAccordion.click();
      await this.page.waitForLoadState('networkidle');
    }

    // Expand Underwriting File accordion if collapsed
    const uwAccordion = this.sidebarUnderwritingFile;
    if (await this.exists(uwAccordion)) {
      await uwAccordion.click();
      await this.page.waitForLoadState('networkidle');
    }

    // Click Account Review link
    await this.sidebarAccountReview.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Fills Account Review fields.
   * PLACEHOLDER — fields to be confirmed from live DOM.
   */
  async completeAccountReview(_data?: AccountReviewData): Promise<void> {
    this.log('Completing Account Review (PLACEHOLDER — verify with live DOM)');
    // TODO: fill specific fields using data
    // Example: await this.page.getByLabel(/some field/i).fill(data.someField);
    if (this.btnSave) {
      await this.btnSave.click();
      await this.page.waitForLoadState('networkidle');
    }
  }
}
