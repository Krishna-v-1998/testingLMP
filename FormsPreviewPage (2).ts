/**
 * FormsPreviewPage.ts
 *
 * Page Object for the "Forms Preview" tab within a Quote / Binder / Policy.
 */

import { type Locator, type Page } from '@playwright/test';
import { BasePage }                from './base/BasePage';

export class FormsPreviewPage extends BasePage {

  get tabFormsPreview(): Locator {
    return this.page.getByRole('tab', { name: /forms\s*preview/i });
  }

  get btnPreview(): Locator {
    return this.page.getByRole('button', { name: /^preview$/i });
  }

  async goToFormsPreviewTab(): Promise<void> {
    this.log('Navigating to Forms Preview tab');
    await this.tabFormsPreview.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickPreview(): Promise<Page | null> {
    this.log('Clicking Preview button (Forms Preview tab)');
    const newPagePromise = this.page.context()
      .waitForEvent('page', { timeout: 5_000 })
      .catch(() => null);
    await this.btnPreview.click();
    await this.page.waitForLoadState('networkidle');
    const newPage = await newPagePromise;
    if (newPage) {
      this.log('Forms Preview opened in new tab');
      return newPage;
    }
    this.log('Forms Preview rendered inline (no new tab)');
    return null;
  }

  async assertPreviewButtonVisible(): Promise<void> {
    this.log('TODO: FormsPreviewPage assertions pending acceptance criteria and screenshots');
  }

  protected log(message: string): void {
    console.log(`[FormsPreviewPage] ${message}`);
  }
}
