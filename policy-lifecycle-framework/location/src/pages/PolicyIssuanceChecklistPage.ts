/**
 * PolicyIssuanceChecklistPage.ts
 *
 * Page Object for the Policy Issuance Checklist page.
 *
 * ── PLACEHOLDER STATUS ────────────────────────────────────────────────────────
 *   Used during Bound → In-Processing status transition.
 *   Requires screenshots before full assertions can be authored.
 * ── TODO ─────────────────────────────────────────────────────────────────────
 *   □ Confirm navigation path (sidebar vs tab).
 *   □ Map all radio button groups.
 *   □ Implement completeAndIssuePolicy() after DOM inspection.
 */

import { type Locator } from '@playwright/test';
import { BasePage }     from './base/BasePage';

export interface PolicyIssuanceChecklistData {
  [key: string]: string | boolean | undefined;
}

export class PolicyIssuanceChecklistPage extends BasePage {

  // ── Navigation ────────────────────────────────────────────────────────

  get tabOrBtnPolicyIssuance(): Locator {
    return this.page.getByRole('tab', { name: /policy\s*issuance/i })
      .or(this.page.getByRole('link', { name: /policy\s*issuance/i }))
      .or(this.page.getByText(/policy\s*issuance\s*checklist/i).first());
  }

  get btnSave(): Locator {
    return this.page.getByRole('button', { name: /^save$/i });
  }

  get btnIssuePolicy(): Locator {
    return this.page.getByRole('button', { name: /issue\s*policy/i });
  }

  // ── High-level actions ────────────────────────────────────────────────

  async goToPolicyIssuanceChecklist(): Promise<void> {
    this.log('Navigating to Policy Issuance Checklist');
    await this.tabOrBtnPolicyIssuance.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Completes the Policy Issuance Checklist and clicks Issue Policy.
   * PLACEHOLDER — radio buttons and fields to be mapped from live DOM.
   */
  async completeAndIssuePolicy(_data?: PolicyIssuanceChecklistData): Promise<void> {
    this.log('Completing Policy Issuance Checklist (PLACEHOLDER)');
    // TODO: map radio groups from screenshots / live DOM
    // Example:
    // await this.page.getByLabel(/some radio group/i).getByRole('radio', { name: /Yes/ }).click();

    if (await this.btnSave.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await this.btnSave.click();
      await this.page.waitForLoadState('networkidle');
    }
    if (await this.btnIssuePolicy.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await this.btnIssuePolicy.click();
      await this.page.waitForLoadState('networkidle');
    }
  }
}
