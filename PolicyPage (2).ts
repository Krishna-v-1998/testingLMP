/**
 * PolicyPage.ts
 *
 * Page Object for the Policy tab within Exposures & Quotes.
 * Covers the policy list, Generate Policy and Finalize Policy actions.
 */

import { type Locator, expect } from '@playwright/test';
import { BasePage }             from './base/BasePage';

export class PolicyPage extends BasePage {

  // ── Tab ───────────────────────────────────────────────────────────────

  get tabPolicy(): Locator {
    return this.page.getByRole('tab', { name: /^policy$/i });
  }

  // ── Policy list ───────────────────────────────────────────────────────

  policyRow(policyId: string): Locator {
    return this.page.getByRole('row').filter({ hasText: policyId }).first();
  }

  get firstPolicyRow(): Locator {
    return this.page.getByRole('row').nth(1);
  }

  // ── Buttons ───────────────────────────────────────────────────────────

  get btnGeneratePolicy(): Locator {
    return this.page.getByRole('button', { name: /generate\s*policy/i });
  }

  get btnFinalizePolicy(): Locator {
    return this.page.getByRole('button', { name: /finalize\s*policy/i });
  }

  // ── High-level actions ────────────────────────────────────────────────

  async goToPolicyTab(): Promise<void> {
    this.log('Going to Policy tab');
    await this.tabPolicy.click();
    await this.page.waitForLoadState('networkidle');
  }

  async openPolicy(policyId: string): Promise<void> {
    this.log(`Opening policy ${policyId}`);
    await this.policyRow(policyId).click();
    await this.page.waitForLoadState('networkidle');
  }

  async openFirstPolicy(): Promise<void> {
    this.log('Opening first policy row');
    await this.firstPolicyRow.click();
    await this.page.waitForLoadState('networkidle');
  }

  async generatePolicy(): Promise<void> {
    this.log('Clicking Generate Policy');
    await this.btnGeneratePolicy.click();
    await this.page.waitForLoadState('networkidle');
    // Handle any confirmation modal
    const confirmBtn = this.page.getByRole('button', { name: /confirm|yes|ok/i }).first();
    if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmBtn.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  async finalizePolicy(): Promise<void> {
    this.log('Finalizing policy');
    await this.btnFinalizePolicy.click();
    await this.page.waitForLoadState('networkidle');
    const confirmBtn = this.page.getByRole('button', { name: /confirm|yes|ok/i }).first();
    if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmBtn.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  // ── Assertions ────────────────────────────────────────────────────────

  async assertPolicyStatus(expectedStatus: string): Promise<void> {
    this.log(`Asserting policy status = "${expectedStatus}"`);
    await expect(
      this.firstPolicyRow.getByText(expectedStatus, { exact: false }),
      `Policy should have status "${expectedStatus}"`
    ).toBeVisible({ timeout: 15_000 });
  }

  async assertPolicyInList(policyId: string): Promise<void> {
    await expect(
      this.policyRow(policyId),
      `Policy ${policyId} should appear in list`
    ).toBeVisible();
  }
}
