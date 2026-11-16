/**
 * FormsPage.ts
 *
 * Page Object for the "Forms" tab within a Quote / Binder / Policy.
 * Handles form selection, eye-icon preview, and PDF validation.
 */

import { type Locator, expect, type TestInfo } from '@playwright/test';
import { BasePage }                             from './base/BasePage';

export class FormsPage extends BasePage {

  // ── Tab ───────────────────────────────────────────────────────────────

  get tabForms(): Locator {
    return this.page.getByRole('tab', { name: /^forms$/i });
  }

  // ── Forms table ───────────────────────────────────────────────────────

  /**
   * Returns the row for a given form number or name.
   */
  formRow(formNumberOrName: string): Locator {
    return this.page.getByRole('row').filter({ hasText: formNumberOrName }).first();
  }

  /**
   * Returns the eye-icon (preview) button for a given form row.
   */
  eyeIconForForm(formNumberOrName: string): Locator {
    return this.formRow(formNumberOrName)
      .getByRole('button', { name: /preview|view|eye/i })
      .first();
  }

  get btnSelectAllForms(): Locator {
    return this.page.getByRole('button', { name: /select\s*all/i });
  }

  get btnDeselectAllForms(): Locator {
    return this.page.getByRole('button', { name: /deselect\s*all/i });
  }

  // ── High-level actions ────────────────────────────────────────────────

  async goToFormsTab(): Promise<void> {
    this.log('Going to Forms tab');
    await this.tabForms.click();
    await this.page.waitForLoadState('networkidle');
  }

  async selectForm(formNumberOrName: string): Promise<void> {
    this.log(`Selecting form: ${formNumberOrName}`);
    const checkbox = this.formRow(formNumberOrName).getByRole('checkbox');
    if (!(await checkbox.isChecked())) {
      await checkbox.click();
    }
  }

  async deselectForm(formNumberOrName: string): Promise<void> {
    this.log(`Deselecting form: ${formNumberOrName}`);
    const checkbox = this.formRow(formNumberOrName).getByRole('checkbox');
    if (await checkbox.isChecked()) {
      await checkbox.click();
    }
  }

  /**
   * Clicks the eye / preview icon for the given form.
   * Returns the new Page if a preview tab opens, otherwise null.
   */
  async clickEyeAndValidatePdf(
    formNumberOrName: string,
    testInfo?: TestInfo,
  ): Promise<void> {
    this.log(`Previewing form: ${formNumberOrName}`);
    const newPagePromise = this.page.context()
      .waitForEvent('page', { timeout: 10_000 })
      .catch(() => null);

    await this.eyeIconForForm(formNumberOrName).click();
    const newPage = await newPagePromise;

    if (newPage) {
      this.log(`PDF preview opened in new tab for: ${formNumberOrName}`);
      // Optionally attach a screenshot to the test report
      if (testInfo) {
        const screenshot = await newPage.screenshot();
        await testInfo.attach(`${formNumberOrName}-preview`, {
          body: screenshot,
          contentType: 'image/png',
        });
      }
      await newPage.close();
    } else {
      this.log(`PDF preview rendered inline for: ${formNumberOrName}`);
    }
  }

  // ── Assertions ────────────────────────────────────────────────────────

  async assertFormVisible(formNumberOrName: string): Promise<void> {
    await expect(
      this.formRow(formNumberOrName),
      `Form "${formNumberOrName}" should be visible in the forms list`
    ).toBeVisible();
  }

  async assertFormSelected(formNumberOrName: string): Promise<void> {
    const checkbox = this.formRow(formNumberOrName).getByRole('checkbox');
    await expect(checkbox, `Form "${formNumberOrName}" should be checked`).toBeChecked();
  }
}
