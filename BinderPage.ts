/**
 * BinderPage.ts
 *
 * Page Object for the "Binder" tab within Exposures & Quotes.
 *
 * ── LIFECYCLE POSITION ────────────────────────────────────────────────────────
 *
 *   Quote (Finalized) → [Generate Binder >] → Binder → [Finalize Binder] → Policy
 *
 * ── BINDER LIST COLUMNS (from UI screenshots) ────────────────────────────────
 *
 *   BINDER ID | QUOTE ID | DESCRIPTION | PRODUCT ID(S) | EFFECTIVE DATE |
 *   CREATED DATE | TERRORISM COVERAGE | CLONED FROM | STATUS | EMAIL SENT | ACTIONS
 *
 * ── GENERATE BINDER DRAWER (from UI screenshots) ─────────────────────────────
 *
 *   Opens as a right-side panel (drawer), NOT a modal dialog.
 *   Fields:
 *     TERRORISM COVERAGE (TRIA):   ○ Accepted   ○ Rejected
 *     TRIA %:                      number field
 *     BINDER DATE:                 date field (MM/DD/YYYY)
 *     PREFIX*:                     text field
 *     POLICY NO.*:                 text field
 *     GENERATE POLICY NUMBER →     link/button (auto-fills PREFIX + POLICY NO.)
 *   Buttons: [ Cancel ]  [ Generate ]
 *
 * ── BINDER DETAIL TABS ────────────────────────────────────────────────────────
 *
 *   01 Binder Details | 02 Forms | 03 Forms Preview | 04 Form Set Order
 *
 *   Tab 04 (Form Set Order) has a "Forms →" button (not "Generate").
 *   "Finalize Binder >" button appears on the Binder list toolbar once the
 *   binder is in a suitable state.
 *
 * ── BINDER STATUS FLOW ───────────────────────────────────────────────────────
 *
 *   Draft → Generated → Finalized
 *   After Finalize Binder: submission status transitions to In-Processing.
 *
 * ── LOCATOR NOTES ────────────────────────────────────────────────────────────
 *
 *   Selectors marked PLACEHOLDER — confirm against live DOM.
 *   The app is Unqork (auto-generated IDs); prefer role/label/text selectors.
 */

import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage }                         from './BasePage';
import { BinderStatus, SubmissionStatus }   from '../types/quote.types';

/** Data needed to fill the Generate Binder drawer */
export interface GenerateBinderDrawerData {
  /** 'Accepted' or 'Rejected' */
  terrorismCoverage: 'Accepted' | 'Rejected';
  /** TRIA percentage, e.g. '0' */
  triaPercent?:      string;
  /** MM/DD/YYYY */
  binderDate:        string;
  /** Policy number prefix, e.g. 'AZ' */
  prefix?:           string;
  /** Policy number, e.g. '2026-00001' */
  policyNumber?:     string;
  /** If true, clicks "GENERATE POLICY NUMBER →" to auto-fill prefix + policyNo */
  autoGeneratePolicyNumber?: boolean;
}

export class BinderPage extends BasePage {

  // ── Main lifecycle tab ─────────────────────────────────────────────────────

  get tabBinder(): Locator { return this.page.getByRole('tab', { name: 'Binder' }); }

  // ── Binder list toolbar buttons ───────────────────────────────────────────

  /** "Finalize Binder >" — enabled once the binder has Forms saved */
  get btnFinalizeBinder(): Locator {
    return this.page.getByRole('button', { name: /finalize\s+binder/i });
  }

  /** Email Sent confirmation button (if present) */
  get btnEmailSent(): Locator {
    return this.page.getByRole('button', { name: /email\s+sent/i });
  }

  // ── Binder list / table ───────────────────────────────────────────────────

  /** Returns the row in the binder table for the given Binder ID */
  binderRow(binderId: string): Locator {
    return this.page.locator('table tbody tr, [role="row"]').filter({ hasText: binderId });
  }

  /** Open / view button in the ACTIONS column for a binder row */
  binderOpenBtn(binderId: string): Locator {
    return this.binderRow(binderId)
      .locator('button[aria-label*="View"], button[title*="View"], button[aria-label*="Open"], [data-action="view"]');  // PLACEHOLDER
  }

  /** First binder row (when you don't know the ID yet) */
  get firstBinderRow(): Locator {
    return this.page.locator('table tbody tr, [role="row"]').nth(1);
  }

  // ── Generate Binder drawer ────────────────────────────────────────────────
  // The drawer slides in from the right side — NOT a dialog[role="dialog"].
  // Adjust the container selector once you inspect the live DOM.

  get drawerGenerateBinder(): Locator {
    return this.page.locator(
      '[class*="drawer"], [class*="side-panel"], [class*="slide-panel"], aside'
    ).filter({ hasText: /generate\s+binder|terrorism\s+coverage/i });  // PLACEHOLDER
  }

  // TERRORISM COVERAGE (TRIA) radios
  get radioTRIAAccepted(): Locator {
    return this.drawerGenerateBinder.getByRole('radio', { name: /accepted/i });
  }
  get radioTRIARejected(): Locator {
    return this.drawerGenerateBinder.getByRole('radio', { name: /rejected/i });
  }

  get fieldTriaPercent(): Locator {
    return this.drawerGenerateBinder.getByLabel(/tria\s*%/i);
  }

  get fieldBinderDate(): Locator {
    return this.drawerGenerateBinder.getByLabel(/binder\s+date/i);
  }

  get fieldPrefix(): Locator {
    return this.drawerGenerateBinder.getByLabel(/prefix/i);
  }

  get fieldPolicyNo(): Locator {
    return this.drawerGenerateBinder.getByLabel(/policy\s+no/i);
  }

  /** "GENERATE POLICY NUMBER →" — auto-fills prefix + policy number */
  get linkGeneratePolicyNumber(): Locator {
    return this.drawerGenerateBinder.getByRole('link', { name: /generate\s+policy\s+number/i })
      .or(this.drawerGenerateBinder.getByRole('button', { name: /generate\s+policy\s+number/i }));
  }

  get drawerBtnGenerate(): Locator {
    return this.drawerGenerateBinder.getByRole('button', { name: /^generate$/i });
  }

  get drawerBtnCancel(): Locator {
    return this.drawerGenerateBinder.getByRole('button', { name: /^cancel$/i });
  }

  // ── Binder detail inner tabs ──────────────────────────────────────────────
  // Tabs: 01 Binder Details | 02 Forms | 03 Forms Preview | 04 Form Set Order

  get tabBinderDetails():  Locator { return this.page.getByRole('tab', { name: /binder\s+details/i }); }
  get tabForms():          Locator { return this.page.getByRole('tab', { name: /^forms$/i }); }
  get tabFormsPreview():   Locator { return this.page.getByRole('tab', { name: /forms\s+preview/i }); }
  get tabFormSetOrder():   Locator { return this.page.getByRole('tab', { name: /form\s+set\s+order/i }); }

  /** "Forms →" button on Tab 04 */
  get btnFormsArrow(): Locator {
    return this.page.getByRole('button', { name: /^forms\s*→?$/i })
      .or(this.page.getByRole('button', { name: /forms\s+→/i }));
  }

  // ── Binder Detail fields (Tab 01) ─────────────────────────────────────────

  get fieldBinderId():          Locator { return this.page.getByLabel(/binder\s+id/i); }
  get fieldQuoteId():           Locator { return this.page.getByLabel(/quote\s+id/i); }
  get fieldEffectiveDate():     Locator { return this.page.getByLabel(/effective\s+date/i); }
  get fieldTerrorismCoverage(): Locator { return this.page.getByLabel(/terrorism\s+coverage/i); }
  get fieldStatus():            Locator {
    return this.page.locator('[data-label*="Status"], [class*="status-badge"]');  // PLACEHOLDER
  }

  // ── High-level actions ─────────────────────────────────────────────────────

  /** Navigates to the Binder tab */
  async goToBinderTab(): Promise<void> {
    this.log('Navigating to Binder tab');
    await this.tabBinder.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Fills the Generate Binder drawer and clicks Generate.
   * Call AFTER QuotePage.generateBinderFromSelected() has been clicked.
   */
  async fillGenerateBinderDrawer(data: GenerateBinderDrawerData): Promise<void> {
    this.log(`Filling Generate Binder drawer: TRIA=${data.terrorismCoverage}, Date=${data.binderDate}`);
    await this.drawerGenerateBinder.waitFor({ state: 'visible', timeout: 15_000 });

    // TERRORISM COVERAGE radio
    if (data.terrorismCoverage === 'Accepted') {
      await this.radioTRIAAccepted.click();
    } else {
      await this.radioTRIARejected.click();
    }

    // TRIA %
    if (data.triaPercent !== undefined) {
      await this.fieldTriaPercent.fill(data.triaPercent);
    }

    // BINDER DATE
    await this.fieldBinderDate.fill(data.binderDate);
    await this.fieldBinderDate.press('Tab');

    // POLICY NUMBER
    if (data.autoGeneratePolicyNumber) {
      await this.linkGeneratePolicyNumber.click();
      await this.page.waitForLoadState('networkidle');
    } else {
      if (data.prefix) {
        await this.fieldPrefix.fill(data.prefix);
      }
      if (data.policyNumber) {
        await this.fieldPolicyNo.fill(data.policyNumber);
      }
    }

    await this.drawerBtnGenerate.click();
    await this.page.waitForLoadState('networkidle');
    this.log('Generate Binder drawer submitted');
  }

  /**
   * Navigates to the Forms tab within the Binder detail view.
   */
  async goToFormsTab(): Promise<void> {
    this.log('Navigating to Binder → Forms tab');
    await this.tabForms.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigates to Form Set Order (Tab 04) and clicks "Forms →".
   */
  async goToFormSetOrderAndClickForms(): Promise<void> {
    this.log('Going to Form Set Order tab (04) → clicking Forms →');
    await this.tabFormSetOrder.click();
    await this.page.waitForLoadState('networkidle');
    await this.btnFormsArrow.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Finalizes the binder from the list toolbar.
   * After this the submission transitions to In-Processing.
   */
  async finalizeBinder(): Promise<void> {
    this.log('Clicking Finalize Binder');
    await this.btnFinalizeBinder.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ── Assertions ─────────────────────────────────────────────────────────────

  /** Asserts the binder row is visible in the list */
  async assertBinderInList(binderId: string): Promise<void> {
    await expect(
      this.binderRow(binderId),
      `Binder "${binderId}" should appear in the Binder list`
    ).toBeVisible();
  }

  /** Asserts the binder status cell shows the expected value */
  async assertBinderStatus(binderId: string, expectedStatus: BinderStatus): Promise<void> {
    const statusCell = this.binderRow(binderId).locator(
      `[data-col="status"], td:has-text("${expectedStatus}")`
    );  // PLACEHOLDER
    await expect(statusCell, `Binder "${binderId}" status should be "${expectedStatus}"`).toBeVisible();
    this.log(`✅ Binder ${binderId} status = ${expectedStatus}`);
  }

  protected log(message: string): void {
    console.log(`[BinderPage] ${message}`);
  }
}
