/**
 * InstallationFloaterPage.ts
 *
 * Page Object for the Installation Floater product sub-tab.
 *
 * ── PLACEHOLDER STATUS ────────────────────────────────────────────────────────
 *   Field list and selectors pending screenshots and DOM inspection.
 *   Structure mirrors BuildersRiskPage once details are known.
 *
 * ── NAVIGATION ───────────────────────────────────────────────────────────────
 *   Same context-aware sub-tab pattern as BuildersRiskPage:
 *   goToProductFields('quote' | 'binder' | 'policy')
 *
 * ── TODO ─────────────────────────────────────────────────────────────────────
 *   □ Map all Exposure Information fields
 *   □ Map all Limits & Deductibles fields
 *   □ Add fillProductDetails() / assertPremiumSummary()
 */

import { type Locator } from '@playwright/test';
import { BasePage }     from './base/BasePage';

export interface InstallationFloaterData {
  // TODO: add fields once confirmed from live DOM / screenshots
  [key: string]: string | undefined;
}

export class InstallationFloaterPage extends BasePage {

  // ── Context-aware navigation ──────────────────────────────────────────────

  async goToProductFields(context: 'quote' | 'binder' | 'policy' = 'quote'): Promise<void> {
    const outerTabName = {
      quote:  'Quote Details',
      binder: 'Binder Details',
      policy: 'Policy Details',
    }[context];

    this.log(`Navigating to ${outerTabName} → Installation Floater sub-tab`);

    const outerTab = this.page.getByRole('tab', { name: outerTabName });
    if (await outerTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await outerTab.click();
      await this.page.waitForLoadState('networkidle');
    }

    const subTab = this.page
      .getByRole('tab', { name: /installation\s*floater/i })
      .first();

    await subTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ── Placeholder field locators ────────────────────────────────────────────

  // TODO: add field getters once confirmed from screenshots/DOM
  // Example:
  // get inputSomeField(): Locator {
  //   return this.page.getByLabel(/some field/i).first();
  // }

  get btnSave(): Locator {
    return this.page.getByRole('button', { name: /^save$/i });
  }

  // ── Placeholder fill method ───────────────────────────────────────────────

  async fillProductDetails(_data: InstallationFloaterData): Promise<void> {
    this.log('fillProductDetails() — PLACEHOLDER. Map fields from live DOM screenshots.');
    // TODO: implement once field selectors are confirmed
  }

  async save(): Promise<void> {
    this.log('Saving Installation Floater fields');
    await this.btnSave.click();
    await this.page.waitForLoadState('networkidle');
  }
}
