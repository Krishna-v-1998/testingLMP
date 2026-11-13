/**
 * QuoteDetailsPage.ts
 *
 * Page Object for the inside of a single Quote (after opening from the list).
 *
 * ── PAGE STRUCTURE ─────────────────────────────────────────────────────────
 *
 *   Quote Options ▾ | NB-V10 ▾                        [Save] [Next ▶]
 *
 *   General Quote Information
 *   ┌─────────────┬────────────────┬──────────────────┬──────────────────┐
 *   │ QUOTE ID    │ EFFECTIVE DATE │ HQ STATE         │ PAYMENT PLAN     │
 *   │ Q-1 (r/o)   │ 01/01/2026     │ NY - New York    │ Agency Bill...   │
 *   └─────────────┴────────────────┴──────────────────┴──────────────────┘
 *   TRIA %: [0]      DESCRIPTION: [...]
 *
 *   Tabs:  [ Quote Details ★ ] [ Forms ] [ Forms Preview ] [ Form Set Order ]
 *
 *   Product tabs:  [ BR-1 ]  [ IF-1 ]  [+ Add Product]  [🗑 Delete Product]
 *
 *   Exposures & Quote Details
 *   PRODUCT ID: BR-1    PRODUCT: Construction    SUB-SEGMENT: Builder's Risk
 *
 *   Coverage Structure: ● Scheduled Location   ○ Master Policy (Blanket)
 *
 *   LOCATIONS table:  ...
 *
 * ── LOCATOR NOTES ──────────────────────────────────────────────────────────
 *
 *   All selectors marked PLACEHOLDER — replace after inspecting live DOM.
 */

import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage }                         from './BasePage';
import { QuoteData, QuoteStatus }           from '../types/quote.types';

// ── Coverage structure ──────────────────────────────────────────────────────

export type CoverageStructure = 'Scheduled Location' | 'Master Policy (Blanket)';

// ── Exposure row in the locations table ────────────────────────────────────

export interface LocationExposureRow {
  locationNo:            string;
  siteAddress?:          string;
  description?:          string;
  constructionClass?:    string;
  hardCosts?:            string;
  softCosts?:            string;
  earnings?:             string;
  rentalValue?:          string;
  existingBldg?:         string;
  existingBldgLimit?:    string;
  existingBldgConstClass?: string;
}

// ═════════════════════════════════════════════════════════════════════════════
// QuoteDetailsPage
// ═════════════════════════════════════════════════════════════════════════════

export class QuoteDetailsPage extends BasePage {

  // ── Header / breadcrumb ───────────────────────────────────────────────────

  get btnQuoteOptions():Locator { return this.page.getByRole('button', { name: 'Quote Options' }).or(this.page.locator('button:has-text("Quote Options")')); }
  get btnSave():        Locator { return this.page.getByRole('button', { name: 'Save' }); }
  get btnNext():        Locator { return this.page.getByRole('button', { name: 'Next' }); }
  get btnPrevious():    Locator { return this.page.getByRole('button', { name: 'Previous' }); }
  get btnCancel():      Locator { return this.page.getByRole('button', { name: 'Cancel' }); }

  // ── General Quote Information ─────────────────────────────────────────────

  get fieldQuoteId():       Locator { return this.page.getByLabel('Quote ID'); }
  get fieldEffectiveDate(): Locator { return this.page.getByLabel('Effective Date'); }
  get dropdownHqState():    Locator { return this.page.getByLabel('HQ State'); }
  get dropdownPaymentPlan():Locator { return this.page.getByLabel('Payment Plan'); }
  get fieldTriaPct():       Locator { return this.page.getByLabel('TRIA%').or(this.page.getByLabel('TRIA %')); }
  get fieldDescription():   Locator { return this.page.getByLabel('Description'); }

  // ── Inner tabs ────────────────────────────────────────────────────────────

  get tabQuoteDetails(): Locator { return this.page.getByRole('tab', { name: 'Quote Details' }); }
  get tabForms():        Locator { return this.page.getByRole('tab', { name: 'Forms' }); }
  get tabFormsPreview(): Locator { return this.page.getByRole('tab', { name: 'Forms Preview' }); }
  get tabFormSetOrder(): Locator { return this.page.getByRole('tab', { name: 'Form Set Order' }); }

  // ── Product tabs / management ─────────────────────────────────────────────

  get btnAddProduct():    Locator { return this.page.getByRole('button', { name: 'Add Product' }); }
  get btnDeleteProduct(): Locator { return this.page.getByRole('button', { name: 'Delete Product' }); }

  /**
   * Returns the product tab (e.g. BR-1, IF-1) by its label.
   * PLACEHOLDER — adjust selector to match actual tab rendering.
   */
  productTab(tabLabel: string): Locator {
    return this.page.getByRole('tab', { name: tabLabel })
      .or(this.page.locator(`[role="tab"]:has-text("${tabLabel}")`));
  }

  // ── Add Product modal ─────────────────────────────────────────────────────

  get modalAddProduct():          Locator { return this.page.locator('[role="dialog"]').filter({ hasText: 'Quote ID' }).filter({ hasText: 'Product' }); }
  get addProductQuoteId():        Locator { return this.modalAddProduct.getByLabel('Quote ID'); }
  get addProductDropdown():       Locator { return this.modalAddProduct.getByLabel('Product'); }
  get addProductSubSegmentDropdown(): Locator { return this.modalAddProduct.getByLabel('Sub-Segment'); }
  get addProductBtnCreate():      Locator { return this.modalAddProduct.getByRole('button', { name: 'Create' }); }
  get addProductBtnCancel():      Locator { return this.modalAddProduct.getByRole('button', { name: 'Cancel' }); }

  // Delete Product confirmation dialog
  get modalDeleteProduct():       Locator { return this.page.locator('[role="dialog"]').filter({ hasText: 'Are you sure you want to delete' }); }
  get deleteProductBtnYes():      Locator { return this.modalDeleteProduct.getByRole('button', { name: 'Yes' }); }
  get deleteProductBtnNo():       Locator { return this.modalDeleteProduct.getByRole('button', { name: 'No' }); }

  // ── Exposures & Quote Details ─────────────────────────────────────────────

  get fieldProductId():    Locator { return this.page.getByLabel('Product ID'); }
  get fieldProduct():      Locator { return this.page.getByLabel('Product').nth(1); }   // second instance (first is in header)
  get fieldSubSegment():   Locator { return this.page.getByLabel('Sub-Segment'); }

  // Coverage Structure
  get radioCoverageScheduledLocation(): Locator { return this.page.getByRole('radio', { name: 'Scheduled Location' }); }
  get radioCoverageMasterPolicy():      Locator { return this.page.getByRole('radio', { name: 'Master Policy (Blanket)' }); }

  // Coverage switch confirmation dialog
  get confirmCoverageSwitchModal():     Locator { return this.page.locator('[role="dialog"]').filter({ hasText: 'Switching the coverage structure' }); }
  get confirmCoverageSwitchBtnYes():    Locator { return this.confirmCoverageSwitchModal.getByRole('button', { name: 'Yes' }); }
  get confirmCoverageSwitchBtnNo():     Locator { return this.confirmCoverageSwitchModal.getByRole('button', { name: 'No' }); }

  // ── Locations table ───────────────────────────────────────────────────────

  get btnAddLocation():  Locator { return this.page.getByRole('button', { name: '+ Add Location' }).or(this.page.getByRole('button', { name: 'Add Location' })); }

  locationRow(locationNo: string): Locator {
    return this.page.locator('table tbody tr, [role="row"]').filter({ hasText: locationNo }).first();
  }

  locationEditBtn(locationNo: string): Locator {
    return this.locationRow(locationNo).locator('button[aria-label*="Edit"], button[title*="Edit"]');  // PLACEHOLDER
  }

  locationDeleteBtn(locationNo: string): Locator {
    return this.locationRow(locationNo).locator('button[aria-label*="Delete"], button[title*="Delete"]');  // PLACEHOLDER
  }

  // ── Policy-level Limits & Deductibles ────────────────────────────────────

  /** AMT ONE CONSTRUCTION SITE LIMIT */
  get fieldAmtConstructionSiteLimit():  Locator { return this.page.getByLabel('AMT ONE CONSTRUCTION SITE LIMIT', { exact: false }); }
  /** AMT ONE OCCURRENCE LIMIT */
  get fieldAmtOneOccurrenceLimit():     Locator { return this.page.getByLabel('AMT ONE OCCURRENCE LIMIT', { exact: false }); }
  /** TEMPORARY LOCATIONS LIMIT */
  get fieldTemporaryLocationsLimit():   Locator { return this.page.getByLabel('TEMPORARY LOCATIONS LIMIT', { exact: false }); }
  /** TRANSIT UNIT */
  get fieldTransitUnit():               Locator { return this.page.getByLabel('TRANSIT UNIT', { exact: false }); }
  /** AMT DEDUCTIBLE ALL OTHER PERILS */
  get fieldAmtDeductibleAllOtherPerils():Locator { return this.page.getByLabel('AMT DEDUCTIBLE ALL OTHER PERILS', { exact: false }); }
  /** COINSURANCE */
  get dropdownCoinsurance():            Locator { return this.page.getByLabel('COINSURANCE', { exact: false }); }

  // ── Premium Summary ───────────────────────────────────────────────────────

  get fieldTriaPctSummary():    Locator { return this.page.getByLabel('TRIA %').or(this.page.getByLabel('TRIA%')); }
  get dropdownCommission():     Locator { return this.page.getByLabel('Commission', { exact: false }); }
  get fieldTotalPremium():      Locator { return this.page.getByLabel('TOTAL PREMIUM', { exact: false }); }
  get fieldTriaPremium():       Locator { return this.page.getByLabel('TRIA PREMIUM', { exact: false }); }
  get fieldTotalPremiumWithTria():Locator { return this.page.getByLabel('TOTAL PREMIUM INCLUDING TRIA', { exact: false }); }

  // ── High-level actions ─────────────────────────────────────────────────────

  /** Fills the General Quote Information section */
  async fillGeneralQuoteInfo(data: QuoteData): Promise<void> {
    this.log('Filling General Quote Information');

    if (data.effectiveDate) {
      await this.fieldEffectiveDate.fill(data.effectiveDate);
      await this.fieldEffectiveDate.press('Tab');
    }
    if (data.insuredCity) {   // HQ State
      await this.dropdownHqState.selectOption({ label: data.insuredState ?? data.insuredCity });
    }
    if (data.expirationDate) {
      await this.fieldDescription.fill(data.expirationDate);
    }
  }

  /** Clicks "Save" and waits for the page to settle */
  async save(): Promise<void> {
    this.log('Saving quote details');
    await this.btnSave.click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Clicks "Next" to advance to the next product tab */
  async clickNext(): Promise<void> {
    this.log('Clicking Next');
    await this.btnNext.click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Clicks "Previous" to go back to the preceding product tab */
  async clickPrevious(): Promise<void> {
    this.log('Clicking Previous');
    await this.btnPrevious.click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Selects a product tab by its label (e.g. 'BR-1') */
  async clickProductTab(tabLabel: string): Promise<void> {
    this.log(`Clicking product tab: ${tabLabel}`);
    await this.productTab(tabLabel).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Opens the Add Product modal by clicking "Add Product".
   * Does NOT fill or submit — use fillAddProductModal / confirmAddProduct next.
   */
  async clickAddProduct(): Promise<void> {
    this.log('Opening Add Product modal');
    await this.btnAddProduct.click();
    await this.modalAddProduct.waitFor({ state: 'visible', timeout: 15_000 });
  }

  /**
   * Fills Product and Sub-Segment inside the Add Product modal.
   * Call after clickAddProduct().
   */
  async fillAddProductModal(product: string, subSegment: string): Promise<void> {
    this.log(`Filling Add Product modal: ${product} / ${subSegment}`);
    await this.addProductDropdown.selectOption({ label: product });
    await this.page.waitForLoadState('networkidle');
    await this.addProductSubSegmentDropdown.selectOption({ label: subSegment });
  }

  /** Submits the Add Product modal by clicking "Create". */
  async confirmAddProduct(): Promise<void> {
    this.log('Confirming Add Product (clicking Create)');
    await this.addProductBtnCreate.click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Dismisses the Add Product modal by clicking "Cancel" (no confirmation needed). */
  async dismissAddProductModal(): Promise<void> {
    this.log('Dismissing Add Product modal');
    await this.addProductBtnCancel.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Adds a second product via the Add Product modal (full flow).
   * Returns the new product tab label (e.g. 'IF-1').
   */
  async addProduct(product: string, subSegment: string): Promise<void> {
    await this.clickAddProduct();
    await this.fillAddProductModal(product, subSegment);
    await this.confirmAddProduct();
  }

  /**
   * Clicks the delete icon for the given product tab.
   * PLACEHOLDER: update icon selector once live DOM is inspected.
   */
  async deleteProductTab(tabLabel: string): Promise<void> {
    this.log(`Deleting product tab: ${tabLabel}`);
    // PLACEHOLDER: adjust selector — may be an icon inside the tab itself
    const deleteIcon = this.productTab(tabLabel)
      .locator('button[aria-label*="Delete"], button[title*="Delete"], [data-action="delete"]');
    await deleteIcon.click();
    await this.modalDeleteProduct.waitFor({ state: 'visible', timeout: 10_000 });
  }

  /** Confirms the "Delete Product" dialog by clicking "Yes". */
  async confirmDeleteProduct(): Promise<void> {
    this.log('Confirming product deletion (clicking Yes)');
    await this.deleteProductBtnYes.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Selects a coverage structure radio.
   * If switching to Master Policy, confirms the coverage-reset dialog.
   */
  async selectCoverageStructure(structure: CoverageStructure): Promise<void> {
    this.log(`Selecting coverage structure: ${structure}`);
    if (structure === 'Scheduled Location') {
      await this.radioCoverageScheduledLocation.click();
    } else {
      await this.radioCoverageMasterPolicy.click();
      // Confirm the reset warning if it appears
      try {
        await this.confirmCoverageSwitchModal.waitFor({ state: 'visible', timeout: 5_000 });
        await this.confirmCoverageSwitchBtnYes.click();
      } catch { /* Dialog did not appear — proceed */ }
    }
    await this.page.waitForLoadState('networkidle');
  }

  // ── Inner tab navigation ───────────────────────────────────────────────────

  async goToFormsTab(): Promise<void> {
    this.log('Navigating to Forms tab');
    await this.tabForms.click();
    await this.page.waitForLoadState('networkidle');
  }

  async goToFormsPreviewTab(): Promise<void> {
    this.log('Navigating to Forms Preview tab');
    await this.tabFormsPreview.click();
    await this.page.waitForLoadState('networkidle');
  }

  async goToFormSetOrderTab(): Promise<void> {
    this.log('Navigating to Form Set Order tab');
    await this.tabFormSetOrder.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ── Assertions ─────────────────────────────────────────────────────────────

  /** Asserts the quote ID shown in the header matches the expected value */
  async assertQuoteId(expectedId: string): Promise<void> {
    await expect(this.fieldQuoteId, `Quote ID should be "${expectedId}"`).toHaveValue(expectedId);
    this.log(`✅ Quote ID = ${expectedId}`);
  }

  /** Asserts the product tab with the given label is visible */
  async assertProductTabExists(tabLabel: string): Promise<void> {
    await expect(this.productTab(tabLabel), `Product tab "${tabLabel}" should be visible`).toBeVisible();
    this.log(`✅ Product tab "${tabLabel}" exists`);
  }

  /**
   * Asserts that trying to add an already-existing Product + SubSegment
   * shows the duplicate warning.
   */
  async assertDuplicateProductError(quoteId: string): Promise<void> {
    // The error message contains the quote ID dynamically
    const errorText = this.page.getByText(
      new RegExp(`Product Sub-Segment selected exists in ${quoteId}`, 'i')
    );
    await expect(errorText, `Duplicate product error for "${quoteId}" should be visible`).toBeVisible();
    this.log(`✅ Duplicate product error shown for ${quoteId}`);
  }

  /** Asserts delete product confirmation shows the correct product label */
  async assertDeleteProductConfirmation(tabLabel: string): Promise<void> {
    const confirmText = this.page.getByText(
      new RegExp(`Are you sure you want to delete ${tabLabel}`, 'i')
    );
    await expect(confirmText, `Delete confirmation for "${tabLabel}" should appear`).toBeVisible();
  }

  protected log(message: string): void {
    console.log(`[QuoteDetailsPage] ${message}`);
  }
}
