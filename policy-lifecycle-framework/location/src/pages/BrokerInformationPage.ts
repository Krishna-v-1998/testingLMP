/**
 * BrokerInformationPage.ts
 *
 * Page Object for the Broker Information tab within a submission.
 * Handles commission, broker notes, and UW rationale fields.
 */

import { type Locator, expect } from '@playwright/test';
import { BasePage }             from './base/BasePage';

export class BrokerInformationPage extends BasePage {

  // ── Locators ──────────────────────────────────────────────────────────

  get commissionInput(): Locator {
    return this.page.getByLabel(/commission/i).first()
      .or(this.page.getByRole('spinbutton', { name: /commission/i }));
  }

  get brokerNotesEditor(): Locator {
    return this.page.getByLabel(/broker\s*notes/i)
      .or(this.page.locator('[data-testid="broker-notes"]'))
      .first();
  }

  get uwRationaleEditor(): Locator {
    return this.page.getByLabel(/uw\s*rationale|underwriting\s*rationale/i)
      .or(this.page.locator('[data-testid="uw-rationale"]'))
      .first();
  }

  get btnSave(): Locator {
    return this.page.getByRole('button', { name: /^save$/i });
  }

  // ── High-level actions ────────────────────────────────────────────────

  async fillCommission(value: number): Promise<void> {
    this.log(`Filling commission = ${value}`);
    await this.clearAndFill(this.commissionInput, String(value));
  }

  async fillBrokerNotes(text: string): Promise<void> {
    this.log(`Filling broker notes`);
    await this.clearAndFill(this.brokerNotesEditor, text);
  }

  async fillUWRationale(text: string): Promise<void> {
    this.log(`Filling UW rationale`);
    await this.clearAndFill(this.uwRationaleEditor, text);
  }

  async save(): Promise<void> {
    this.log('Saving broker information');
    await this.btnSave.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ── Assertions ────────────────────────────────────────────────────────

  async assertCommission(expected: number): Promise<void> {
    await expect(this.commissionInput, `Commission should be ${expected}`)
      .toHaveValue(String(expected));
  }

  async assertCommissionValidationError(): Promise<void> {
    const error = this.page.getByText(/commission.*required|required.*commission/i)
      .or(this.page.getByText(/invalid commission/i))
      .first();
    await expect(error, 'Commission validation error should be visible').toBeVisible();
  }

  async assertNoCommissionValidationError(): Promise<void> {
    const error = this.page.getByText(/commission.*required|required.*commission/i)
      .or(this.page.getByText(/invalid commission/i))
      .first();
    await expect(error, 'Commission validation error should NOT be visible').toBeHidden();
  }
}
