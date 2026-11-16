/**
 * QuoteDetailsPage.ts
 *
 * Page Object for the Quote Details tab within a quote.
 * Handles product sub-tabs, coverage structure selection,
 * add/delete product, and navigation between wizard steps.
 */

import { type Locator, expect } from '@playwright/test';
import { BasePage }             from './base/BasePage';

export class QuoteDetailsPage extends BasePage {

  // ── Tabs ──────────────────────────────────────────────────────────────

  get tabQuoteDetails(): Locator {
    return this.page.getByRole('tab', { name: /quote\s*details/i });
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

  // ── Product management ────────────────────────────────────────────────

  get btnAddProduct(): Locator {
    return this.page.getByRole('button', { name: /add\s*product/i });
  }

  get btnDeleteProduct(): Locator {
    return this.page.getByRole('button', { name: /delete\s*product/i });
  }

  /**
   * Returns the tab for a specific product (e.g., "Builder's Risk").
   */
  productTab(tabLabel: string): Locator {
    return this.page.getByRole('tab', { name: tabLabel });
  }

  // ── Coverage structure ────────────────────────────────────────────────

  get radioCoverageScheduledLocation(): Locator {
    return this.page.getByRole('radio', { name: /scheduled\s*location/i });
  }

  get radioCoverageMasterPolicy(): Locator {
    return this.page.getByRole('radio', { name: /master\s*policy/i });
  }

  // ── Navigation ────────────────────────────────────────────────────────

  get btnSave(): Locator {
    return this.page.getByRole('button', { name: /^save$/i });
  }

  get btnNext(): Locator {
    return this.page.getByRole('button', { name: /^next$/i });
  }

  get btnPrevious(): Locator {
    return this.page.getByRole('button', { name: /^previous|back$/i });
  }

  // ── High-level actions ────────────────────────────────────────────────

  async goToQuoteDetailsTab(): Promise<void> {
    this.log('Going to Quote Details tab');
    await this.tabQuoteDetails.click();
    await this.page.waitForLoadState('networkidle');
  }

  async addProduct(product: string, subSegment: string): Promise<void> {
    this.log(`Adding product: ${product} / ${subSegment}`);
    await this.btnAddProduct.click();
    await this.page.waitForLoadState('networkidle');

    const dialog = this.page.getByRole('dialog');
    await dialog.getByLabel(/product/i).selectOption({ label: product });
    await dialog.getByLabel(/sub.?segment/i).selectOption({ label: subSegment });
    await dialog.getByRole('button', { name: /add|ok|confirm/i }).first().click();
    await this.page.waitForLoadState('networkidle');
  }

  async selectCoverageStructure(structure: 'ScheduledLocation' | 'MasterPolicy'): Promise<void> {
    this.log(`Selecting coverage structure: ${structure}`);
    if (structure === 'ScheduledLocation') {
      await this.radioCoverageScheduledLocation.click();
    } else {
      await this.radioCoverageMasterPolicy.click();
    }
  }

  async save(): Promise<void> {
    this.log('Saving quote details');
    await this.btnSave.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickNext(): Promise<void> {
    this.log('Clicking Next');
    await this.btnNext.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickPrevious(): Promise<void> {
    this.log('Clicking Previous');
    await this.btnPrevious.click();
    await this.page.waitForLoadState('networkidle');
  }
}
