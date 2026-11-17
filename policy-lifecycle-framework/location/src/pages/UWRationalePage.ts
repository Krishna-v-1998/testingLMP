/**
 * UWRationalePage.ts
 *
 * Page Object for the UW Rationale section.
 * Navigates via sidebar: Risk & Pricing → Underwriting File → UW Rationale
 * (or the equivalent tab/link depending on the app's current view).
 *
 * Used during the Quoted → Bound transition to satisfy the UW Rationale
 * requirement before the Bound modal can be submitted.
 */

import { type Locator, expect } from '@playwright/test';
import { BasePage }             from './base/BasePage';

export class UWRationalePage extends BasePage {

  // ── Sidebar navigation ────────────────────────────────────────────────────

  get sidebarUWRationale(): Locator {
    return this.page
      .getByRole('link', { name: /uw\s*rationale|underwriting\s*rationale/i })
      .or(this.page.getByText(/uw\s*rationale|underwriting\s*rationale/i).first());
  }

  // ── The editor / textarea ─────────────────────────────────────────────────

  get uwRationaleEditor(): Locator {
    return this.page
      .getByLabel(/uw\s*rationale|underwriting\s*rationale/i)
      .or(this.page.getByRole('textbox', { name: /uw\s*rationale|underwriting\s*rationale/i }))
      .or(this.page.locator('textarea[name*="rationale"], [data-testid*="uw-rationale"]'))
      .first();
  }

  get btnSave(): Locator {
    return this.page.getByRole('button', { name: /^save$/i });
  }

  // ── High-level actions ────────────────────────────────────────────────────

  /**
   * Navigates to the UW Rationale page via the sidebar.
   * Call this if not already on the page.
   */
  async goToUWRationale(): Promise<void> {
    this.log('Navigating to UW Rationale via sidebar');
    await this.sidebarUWRationale.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Fills the UW Rationale text field.
   * Default value is "Testing" (required for the Quoted → Bound transition).
   */
  async fillUWRationale(text = 'Testing'): Promise<void> {
    this.log(`Filling UW Rationale: "${text}"`);
    const editor = this.uwRationaleEditor;
    await this.waitForVisible(editor, 10_000);
    await this.clearAndFill(editor, text);
  }

  async save(): Promise<void> {
    this.log('Saving UW Rationale');
    await this.btnSave.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Full flow: navigate → fill → save.
   */
  async goFillAndSave(text = 'Testing'): Promise<void> {
    await this.goToUWRationale();
    await this.fillUWRationale(text);
    await this.save();
  }

  // ── Assertions ────────────────────────────────────────────────────────────

  async assertUWRationaleValue(expected: string): Promise<void> {
    await expect(
      this.uwRationaleEditor,
      `UW Rationale should contain "${expected}"`,
    ).toHaveValue(expected);
  }

  async assertUWRationaleNotEmpty(): Promise<void> {
    const value = await this.uwRationaleEditor.inputValue().catch(
      async () => await this.uwRationaleEditor.textContent() ?? '',
    );
    expect(
      value.trim().length,
      'UW Rationale should not be empty',
    ).toBeGreaterThan(0);
  }
}
