/**
 * BinderPage.ts
 *
 * Page Object for the Binder tab within Exposures & Quotes.
 * Covers binder list, Generate Binder drawer, tabs, and finalize flow.
 */

import { type Locator, expect } from '@playwright/test';
import { BasePage }             from './base/BasePage';

export interface GenerateBinderDrawerData {
  terrorismCoverage?:       'Yes' | 'No';
  triaPercent?:             string;
  binderDate?:              string;
  prefix?:                  string;
  policyNumber?:            string;
  autoGeneratePolicyNumber?: boolean;
}

export class BinderPage extends BasePage {

  // ── Tab navigation (within binder detail) ────────────────────────────

  get tabBinderDetails(): Locator {
    return this.page.getByRole('tab', { name: /binder\s*details/i });
  }

  get tabForms(): Locator {
    return this.page.getByRole('tab', { name: /^forms$/i });
  }

  get tabFormsPreview(): Locator {
    return this.page.getByRole('tab', { name: /forms\s*preview/i });
  }

  get tabFormSetOrder(): Locator {
    return this.page.getByRole('tab', { name: /form\s*set\s*order/i });
  }

  // ── Binder list actions ───────────────────────────────────────────────

  get btnFinalizeBinder(): Locator {
    return this.page.getByRole('button', { name: /finalize\s*binder/i });
  }

  get btnGenerateBinder(): Locator {
    return this.page.getByRole('button', { name: /generate\s*binder/i });
  }

  get btnGeneratePolicy(): Locator {
    return this.page.getByRole('button', { name: /generate\s*policy/i });
  }

  get btnPremiumBooking(): Locator {
    return this.page.getByRole('button', { name: /premium\s*booking/i });
  }

  // ── Drawer fields ─────────────────────────────────────────────────────

  get drawerTerrorismCoverage(): Locator {
    return this.page.getByLabel(/terrorism\s*coverage/i).first();
  }

  get drawerTriaPercent(): Locator {
    return this.page.getByLabel(/tria\s*percent|tria\s*%/i).first();
  }

  get drawerBinderDate(): Locator {
    return this.page.getByLabel(/binder\s*date/i).first();
  }

  get drawerPolicyPrefix(): Locator {
    return this.page.getByLabel(/prefix/i).first();
  }

  get drawerPolicyNumber(): Locator {
    return this.page.getByLabel(/policy\s*number/i).first();
  }

  get drawerAutoGeneratePolicyNumber(): Locator {
    return this.page.getByLabel(/auto.*generate.*policy\s*number/i).first();
  }

  get drawerBtnGenerate(): Locator {
    return this.page.getByRole('button', { name: /^generate$/i })
      .or(this.page.getByRole('button', { name: /generate\s*binder/i }))
      .first();
  }

  // ── High-level actions ────────────────────────────────────────────────

  binderRow(binderId: string): Locator {
    return this.page.getByRole('row').filter({ hasText: binderId }).first();
  }

  get firstBinderRow(): Locator {
    return this.page.getByRole('row').nth(1);
  }

  async openBinder(binderId: string): Promise<void> {
    this.log(`Opening binder ${binderId}`);
    await this.binderRow(binderId).click();
    await this.page.waitForLoadState('networkidle');
  }

  async openFirstBinder(): Promise<void> {
    this.log('Opening first binder row');
    await this.firstBinderRow.click();
    await this.page.waitForLoadState('networkidle');
  }

  async fillGenerateBinderDrawer(data: GenerateBinderDrawerData): Promise<void> {
    this.log('Filling Generate Binder drawer');

    if (data.terrorismCoverage !== undefined) {
      await this.drawerTerrorismCoverage.selectOption(data.terrorismCoverage);
    }
    if (data.triaPercent !== undefined) {
      await this.clearAndFill(this.drawerTriaPercent, data.triaPercent);
    }
    if (data.binderDate !== undefined) {
      await this.clearAndFill(this.drawerBinderDate, data.binderDate);
    }
    if (data.prefix !== undefined) {
      await this.clearAndFill(this.drawerPolicyPrefix, data.prefix);
    }
    if (data.autoGeneratePolicyNumber === true) {
      const checkbox = this.drawerAutoGeneratePolicyNumber;
      if (!(await checkbox.isChecked())) {
        await checkbox.click();
      }
    } else if (data.policyNumber !== undefined) {
      await this.clearAndFill(this.drawerPolicyNumber, data.policyNumber);
    }

    await this.drawerBtnGenerate.click();
    await this.page.waitForLoadState('networkidle');
  }

  async finalizeBinder(): Promise<void> {
    this.log('Finalizing binder');
    await this.btnFinalizeBinder.click();
    await this.page.waitForLoadState('networkidle');
    // Handle any confirmation modal
    const confirmBtn = this.page.getByRole('button', { name: /confirm|yes|ok/i }).first();
    if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmBtn.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  async goToFormsTab(): Promise<void> {
    this.log('Going to Forms tab');
    await this.tabForms.click();
    await this.page.waitForLoadState('networkidle');
  }

  async goToBinderDetailsTab(): Promise<void> {
    this.log('Going to Binder Details tab');
    await this.tabBinderDetails.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ── Assertions ────────────────────────────────────────────────────────

  async assertBinderStatus(binderId: string, expectedStatus: string): Promise<void> {
    this.log(`Asserting binder ${binderId} status = "${expectedStatus}"`);
    const row = this.binderRow(binderId);
    await expect(
      row.getByText(expectedStatus, { exact: false }),
      `Binder ${binderId} should have status "${expectedStatus}"`
    ).toBeVisible({ timeout: 15_000 });
  }

  async assertFirstBinderStatus(expectedStatus: string): Promise<void> {
    this.log(`Asserting first binder status = "${expectedStatus}"`);
    await expect(
      this.firstBinderRow.getByText(expectedStatus, { exact: false }),
      `First binder should have status "${expectedStatus}"`
    ).toBeVisible({ timeout: 15_000 });
  }
}
