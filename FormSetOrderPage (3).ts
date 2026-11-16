/**
 * FormSetOrderPage.ts
 *
 * Page Object for the "Form Set Order" tab within a Quote / Binder / Policy.
 * Handles form reordering and finalization.
 */

import { type Locator, expect } from '@playwright/test';
import { BasePage }             from './base/BasePage';

export class FormSetOrderPage extends BasePage {

  get tabFormSetOrder(): Locator {
    return this.page.getByRole('tab', { name: /form\s*set\s*order/i });
  }

  get btnFinalize(): Locator {
    return this.page.getByRole('button', { name: /^finalize$/i });
  }

  /**
   * Row for a given form number or name in the Form Set Order list.
   */
  formOrderRow(formNumberOrName: string): Locator {
    return this.page.getByRole('row').filter({ hasText: formNumberOrName }).first();
  }

  moveUpBtn(formNumberOrName: string): Locator {
    return this.formOrderRow(formNumberOrName).getByRole('button', { name: /move\s*up|↑/i });
  }

  moveDownBtn(formNumberOrName: string): Locator {
    return this.formOrderRow(formNumberOrName).getByRole('button', { name: /move\s*down|↓/i });
  }

  async goToFormSetOrderTab(): Promise<void> {
    this.log('Going to Form Set Order tab');
    await this.tabFormSetOrder.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickFinalize(): Promise<void> {
    this.log('Clicking Finalize on Form Set Order');
    await this.btnFinalize.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Reorders forms to match the desired order by clicking Move Up / Move Down.
   * PLACEHOLDER: requires confirmation of exact DOM structure.
   */
  async reorderForms(desiredOrder: string[]): Promise<void> {
    this.log(`Reordering forms to: ${desiredOrder.join(', ')}`);
    // TODO: implement after DOM structure confirmed
    throw new Error(
      'FormSetOrderPage.reorderForms() is a placeholder. ' +
      'Inspect the live DOM to confirm row drag-and-drop vs. move buttons.',
    );
  }
}
