/**
 * quote-lifecycle.spec.ts
 *
 * ── WHAT THIS SPEC COVERS ─────────────────────────────────────────────────────
 *
 *   Full Quote lifecycle for a Builder's Risk submission:
 *
 *   1.  Navigate to submission → Exposures & Quotes → Quote tab
 *   2.  Create a new Quote (Construction / Builder's Risk)
 *   3.  Fill Quote Details (effective date, insured, project info)
 *   4.  Go to Forms tab → select "Builder's Risk" formset
 *   5.  Verify mandatory forms are pre-checked and locked
 *   6.  Verify optional forms list matches Excel fixture
 *   7.  Check all optional forms
 *   8.  Open Form Fields panel
 *   9.  For each form in Excel: select form → fill fields → Save
 *  10.  [PDF PREVIEW — SKIPPED] Eye icon → PDF opens in new tab
 *  11.  Form Set Order (Tab 04) → Generate Quote
 *  12.  [CUO role] Open to Quoted — fill Quoted Premium, Lead, Participation, etc.
 *  13.  [UW role] Select quote → Finalize Quote
 *  14.  [UW role] Select Finalized quote → Generate Binder (drawer)
 *
 * ── HOW TO RUN ────────────────────────────────────────────────────────────────
 *
 *   # Full run
 *   npx playwright test tests/quote/quote-lifecycle.spec.ts --headed
 *
 *   # Skip PDF tests only
 *   npx playwright test tests/quote/quote-lifecycle.spec.ts --grep-invert @pdf
 *
 *   # Debug (slow motion)
 *   npx playwright test tests/quote/quote-lifecycle.spec.ts --headed --slow-mo 400
 *
 * ── PREREQUISITES ─────────────────────────────────────────────────────────────
 *
 *   - storage-states/uw.json   (UW role auth state)
 *   - storage-states/cuo.json  (CUO role auth state)
 *   - src/data/fixtures/forms-fixture.xlsx
 *   - SUBMISSION_URL + SUBMISSION_ID env vars (or SubmissionSetupService creates one)
 *
 * ── ENV VARS ──────────────────────────────────────────────────────────────────
 *
 *   SUBMISSION_URL=https://allianz-qa-subhubplus-uatx.unqork.io/app/metrix-ui/#/display/xxx?metrixSubmissionId=yyy
 *   SUBMISSION_ID=yyy
 *   BASE_URL=https://allianz-qa-subhubplus-uatx.unqork.io
 */

import { test, expect }              from '../../src/fixtures';
import { SubmissionSetupService }    from '../../src/services/SubmissionSetupService';
import { SubmissionContext }         from '../../src/types/submission.types';
import { Role }                      from '../../src/enums/role.enum';
import { QuotePage }                 from '../../src/pages/QuotePage';
import { QuoteDetailsPage }          from '../../src/pages/QuoteDetailsPage';
import { BuildersRiskPage }          from '../../src/pages/BuildersRiskPage';
import { FormsPage }                 from '../../src/pages/FormsPage';
import { FormsDataReader }           from '../../src/data/fixtures/FormsDataReader';
import { BinderPage, GenerateBinderDrawerData } from '../../src/pages/BinderPage';

// ── Feature flag: PDF preview is not yet implemented in the app ───────────────
// Set to true once the Eye icon → PDF-in-new-tab flow works in your environment.
const PDF_PREVIEW_ENABLED = false;

// ── Shared state (populated by beforeAll, consumed by tests) ─────────────────
let submissionCtx: SubmissionContext;
let createdQuoteId: string;

// ── Test data ─────────────────────────────────────────────────────────────────

const QUOTE_DATA = {
  product:       'Construction',
  subSegment:    "Builder's Risk",
  effectiveDate: '01/01/2026',
  insuredName:   'Automation Forms Insurance Ltd',
};

const FORMSET_NAME = "Builder's Risk";

/** Mandatory form numbers (must match what the app pre-checks) */
const MANDATORY_FORM_NUMBERS = [
  'BR 4000DEC 11 15',
  'TER 9015PHN 02 15',
  'IM 8035 12 20',
];

/** Optional form numbers (from PDF screenshots — check all) */
const OPTIONAL_FORM_NUMBERS = [
  'IM 8010 08 15',
  'IM 8017 05 11',
  'IM 8010 01 10',
  'IM 8029 03 13',
  'IM 8018A 11 10',
  'IM 8020S 11 10',
  'BR 4019 11 15',
  'BR 4031 11 15',
];

/** Fields for the "Open to Quoted" modal (CUO role) */
const OPEN_TO_QUOTED_DATA = {
  quotedPremium:  '50000',
  lead:           'Yes',
  participation:  'Primary',
  multinational:  'No',
  azcShare:       '100.00',
};

/** Fields for the Generate Binder drawer */
const GENERATE_BINDER_DATA: GenerateBinderDrawerData = {
  terrorismCoverage:       'Accepted',
  triaPercent:             '0',
  binderDate:              '01/01/2026',
  autoGeneratePolicyNumber: true,  // clicks "GENERATE POLICY NUMBER →"
};

// ═════════════════════════════════════════════════════════════════════════════
// SUITE
// ═════════════════════════════════════════════════════════════════════════════

test.describe.serial('Quote Lifecycle — Builder\'s Risk @quote', () => {

  // ── Setup: get / create a submission ─────────────────────────────────────

  test.beforeAll(async ({ browser }) => {
    submissionCtx = await SubmissionSetupService.createAndStoreContext(
      browser,
      Role.UW,
      { label: 'quote-lifecycle' },
    );
  });

  // ── 1. Navigate to submission and open Exposures & Quotes ─────────────────

  test('1 — Navigate to submission overview', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);
    await submissionOverview.waitUntilLoaded();
    await submissionOverview.clickExposuresAndQuotes();

    // Quote tab should be visible and active
    await expect(
      page.getByRole('tab', { name: 'Quote' }),
      '"Quote" tab should be visible after Exposures & Quotes click'
    ).toBeVisible();
  });

  // ── 2. Create a new Builder's Risk quote ──────────────────────────────────

  test('2 — Create Quote (Construction / Builder\'s Risk)', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage = new QuotePage(page);
    await quotePage.goToQuoteTab();

    createdQuoteId = await quotePage.createQuote(QUOTE_DATA);
    expect(createdQuoteId, 'Quote ID should be returned after creation').toBeTruthy();

    console.log(`[quote-lifecycle] Created quote: ${createdQuoteId}`);

    // The quote should now appear in the list
    await quotePage.assertQuoteInList(createdQuoteId);
    await quotePage.assertQuoteStatus(createdQuoteId, 'Draft');
  });

  // ── 3. Fill Quote Details ─────────────────────────────────────────────────

  test('3 — Fill Quote Details', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage        = new QuotePage(page);
    const quoteDetailsPage = new QuoteDetailsPage(page);
    const buildersRiskPage = new BuildersRiskPage(page);

    await quotePage.goToQuoteTab();
    await quotePage.openQuote(createdQuoteId);

    // Quote Details tab (01) is active by default after opening
    await quoteDetailsPage.fillGeneralInfo({
      effectiveDate:  QUOTE_DATA.effectiveDate,
      expirationDate: '01/01/2027',
      hqState:        'New York',
      insuredName:    QUOTE_DATA.insuredName,
    });

    // Builder's Risk product tab
    await buildersRiskPage.fillExposureData({
      constructionType:   'Frame',
      occupancy:          'Residential Construction',
      squareFootage:      '25000',
      numberOfStories:    '5',
      constructionValue:  '2500000',
      effectiveDate:      QUOTE_DATA.effectiveDate,
      completionDate:     '12/31/2026',
    });

    await quoteDetailsPage.saveQuoteDetails();

    // After save the quote status should still be Draft (not auto-quoted)
    await page.goBack();
    await quotePage.assertQuoteStatus(createdQuoteId, 'Draft');
  });

  // ── 4–6. Forms tab: select formset, verify mandatory + optional forms ─────

  test('4 — Forms tab: select formset and verify mandatory forms', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage  = new QuotePage(page);
    const formsPage  = new FormsPage(page);

    await quotePage.goToQuoteTab();
    await quotePage.openQuote(createdQuoteId);

    // Navigate to Forms tab (02)
    await formsPage.goToFormsTab();

    // Select Builder's Risk formset
    await formsPage.selectFormset(FORMSET_NAME);

    // Mandatory forms must be pre-checked and disabled
    for (const formNumber of MANDATORY_FORM_NUMBERS) {
      await formsPage.assertMandatoryFormIsLocked(formNumber);
    }
  });

  test('5 — Forms tab: verify optional forms list matches Excel fixture', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage = new QuotePage(page);
    const formsPage = new FormsPage(page);
    const forms     = await FormsDataReader.loadForms();
    const optional  = forms.filter(f => f.type === 'Optional');

    await quotePage.goToQuoteTab();
    await quotePage.openQuote(createdQuoteId);
    await formsPage.goToFormsTab();
    await formsPage.selectFormset(FORMSET_NAME);

    // Every optional form in the Excel should be visible in the UI
    for (const form of optional) {
      await expect(
        page.getByText(form.formNumber, { exact: false }),
        `Optional form "${form.formNumber}" should be visible in the Forms tab`
      ).toBeVisible({ timeout: 8_000 });
    }
  });

  test('6 — Forms tab: check all optional forms', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage = new QuotePage(page);
    const formsPage = new FormsPage(page);

    await quotePage.goToQuoteTab();
    await quotePage.openQuote(createdQuoteId);
    await formsPage.goToFormsTab();
    await formsPage.selectFormset(FORMSET_NAME);

    // Click "Select All" to check every optional form at once
    const selectAllCb = formsPage.optionalSelectAll;
    if (await selectAllCb.isVisible()) {
      if (!(await selectAllCb.isChecked())) {
        await selectAllCb.click();
        await page.waitForLoadState('networkidle');
      }
    } else {
      // Fallback: check each optional form individually
      for (const formNumber of OPTIONAL_FORM_NUMBERS) {
        await formsPage.selectOptionalForm(formNumber);
      }
    }

    // Confirm all are now checked
    for (const formNumber of OPTIONAL_FORM_NUMBERS) {
      await expect(
        formsPage.optionalFormCheckbox(formNumber),
        `Optional form "${formNumber}" should be checked`
      ).toBeChecked({ timeout: 5_000 });
    }
  });

  // ── 7–9. Form Fields panel: open, fill each form ──────────────────────────

  test('7 — Open Form Fields panel', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage = new QuotePage(page);
    const formsPage = new FormsPage(page);

    await quotePage.goToQuoteTab();
    await quotePage.openQuote(createdQuoteId);
    await formsPage.goToFormsTab();
    await formsPage.selectFormset(FORMSET_NAME);
    await formsPage.openFormFieldsPanel();

    // The panel should now be visible
    await expect(
      page.locator('[data-section="form-fields-list"], [class*="form-fields-panel"]')
        .or(page.getByText('View Form Fields')),
      'Form Fields panel should be open'
    ).toBeVisible({ timeout: 10_000 });
  });

  test('8 — Fill form fields from Excel fixture', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage = new QuotePage(page);
    const formsPage = new FormsPage(page);
    const forms     = await FormsDataReader.loadForms();

    await quotePage.goToQuoteTab();
    await quotePage.openQuote(createdQuoteId);
    await formsPage.goToFormsTab();
    await formsPage.selectFormset(FORMSET_NAME);
    await formsPage.openFormFieldsPanel();

    for (const form of forms) {
      console.log(`[quote-lifecycle] Filling fields for: ${form.formNumber}`);

      // Select the form row in the left list
      await formsPage.selectFormInPanel(form.formNumber);

      // Fill each field
      for (const field of form.fields) {
        if (!field.testValue) continue;  // skip if no test value provided
        await formsPage.fillField(field);
      }

      // Save after filling each form
      await formsPage.saveFormFields();
      await page.waitForLoadState('networkidle');

      console.log(`[quote-lifecycle] Saved fields for: ${form.formNumber}`);
    }
  });

  // ── 10. PDF Preview (SKIPPED — not yet working) ───────────────────────────

  test('9 — [PDF PREVIEW] Eye icon → verify PDF content @pdf', async ({ page, submissionOverview }) => {
    // ── PLACEHOLDER ────────────────────────────────────────────────────────
    // PDF preview via Eye icon is not yet implemented / stable in the app.
    // This test is intentionally skipped until the feature is confirmed working.
    //
    // When ready, remove the test.skip() and implement:
    //   1. Navigate to Form Fields panel
    //   2. Click the Eye (👁) icon on each form row
    //   3. Wait for new tab to open with the PDF
    //   4. Use PdfValidator.captureAndValidate() to validate content
    // ───────────────────────────────────────────────────────────────────────
    if (!PDF_PREVIEW_ENABLED) {
      test.skip(true, 'PDF preview not yet implemented — set PDF_PREVIEW_ENABLED = true when ready');
      return;
    }

    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);
    const quotePage = new QuotePage(page);
    const formsPage = new FormsPage(page);
    const forms     = await FormsDataReader.loadForms();

    await quotePage.goToQuoteTab();
    await quotePage.openQuote(createdQuoteId);
    await formsPage.goToFormsTab();
    await formsPage.selectFormset(FORMSET_NAME);
    await formsPage.openFormFieldsPanel();

    for (const form of forms) {
      await formsPage.selectFormInPanel(form.formNumber);
      const pdfResult = await formsPage.previewFormPdf(form.formNumber, page.context(), form);
      expect(pdfResult.formNumberFound, `Form number "${form.formNumber}" should appear in PDF`).toBe(true);
      expect(pdfResult.formNameFound,   `Form name "${form.formName}" should appear in PDF`).toBe(true);
      for (const fv of pdfResult.fieldValues) {
        if (fv.valueFound === false) {
          console.warn(`[pdf-warning] Field "${fv.fieldName}" value not found in PDF`);
        }
      }
    }
  });

  // ── 11. Tab 04 → Generate Quote ───────────────────────────────────────────

  test('10 — Form Set Order (Tab 04) → Generate Quote', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage  = new QuotePage(page);
    const formsPage  = new FormsPage(page);

    await quotePage.goToQuoteTab();
    await quotePage.openQuote(createdQuoteId);

    // Navigate to Form Set Order tab (04)
    await formsPage.tabFormSetOrder.click();
    await page.waitForLoadState('networkidle');

    // Click "Generate Quote" button
    await page.getByRole('button', { name: /generate\s+quote/i }).click();
    await page.waitForLoadState('networkidle');

    // Go back to list and verify status
    await page.goBack();
    await quotePage.assertQuoteStatus(createdQuoteId, 'Draft');
    // Note: Status may still be Draft here — CUO must "Open to Quoted" first
  });

  // ── 12. [CUO role] Open to Quoted ─────────────────────────────────────────
  // This test opens a NEW browser context authenticated as CUO

  test('11 — [CUO role] Open to Quoted (set Quoted Premium + flags)', async ({ browser }) => {
    // Open CUO-authenticated context
    const context = await browser.newContext({
      storageState: 'storage-states/cuo.json',
    });
    const page = await context.newPage();

    try {
      // Navigate to submission
      await page.goto(submissionCtx.submissionUrl);
      await page.waitForLoadState('networkidle');

      // Click Exposures & Quotes → Quote tab
      await page.getByRole('link', { name: /exposures.*quotes/i }).click();
      await page.waitForLoadState('networkidle');

      // Select the quote checkbox
      const quotePage = new QuotePage(page);
      await quotePage.selectQuoteCheckbox(createdQuoteId);

      // Click "Open to Quoted" button (CUO-only action)
      await page.getByRole('button', { name: /open\s+to\s+quoted/i }).click();

      // ── Fill the "Open to Quoted" modal ──────────────────────────────────
      const modal = page.locator('[role="dialog"]').filter({ hasText: /quoted\s+premium/i });
      await modal.waitFor({ state: 'visible', timeout: 15_000 });

      // QUOTED PREMIUM*
      await modal.getByLabel(/quoted\s+premium/i).fill(OPEN_TO_QUOTED_DATA.quotedPremium);

      // LEAD* dropdown
      await modal.getByLabel(/^lead/i).selectOption({ label: OPEN_TO_QUOTED_DATA.lead });

      // PARTICIPATION* dropdown
      await modal.getByLabel(/participation/i).selectOption({ label: OPEN_TO_QUOTED_DATA.participation });

      // MULTINATIONAL* dropdown
      await modal.getByLabel(/multinational/i).selectOption({ label: OPEN_TO_QUOTED_DATA.multinational });

      // AZC SHARE*
      const azcField = modal.getByLabel(/azc\s+share/i);
      await azcField.clear();
      await azcField.fill(OPEN_TO_QUOTED_DATA.azcShare);

      // Save
      await modal.getByRole('button', { name: /^save$/i }).click();
      await page.waitForLoadState('networkidle');

      // Verify quote is now "Quoted"
      await quotePage.assertQuoteStatus(createdQuoteId, 'Quoted');
      console.log(`[quote-lifecycle] Quote ${createdQuoteId} → Quoted (CUO action done)`);

    } finally {
      await context.close();
    }
  });

  // ── 13. [UW role] Finalize Quote ──────────────────────────────────────────

  test('12 — [UW role] Finalize Quote', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage = new QuotePage(page);
    await quotePage.goToQuoteTab();

    // Select the quote checkbox and click Finalize Quote
    await quotePage.selectQuoteCheckbox(createdQuoteId);
    await quotePage.finalizeSelectedQuote();

    // Verify status = Finalized
    await quotePage.assertQuoteStatus(createdQuoteId, 'Finalized');
    console.log(`[quote-lifecycle] Quote ${createdQuoteId} → Finalized`);
  });

  // ── 14. [UW role] Generate Binder ─────────────────────────────────────────

  test('13 — [UW role] Generate Binder from Finalized Quote', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage  = new QuotePage(page);
    const binderPage = new BinderPage(page);

    await quotePage.goToQuoteTab();

    // Select finalized quote
    await quotePage.selectQuoteCheckbox(createdQuoteId);

    // Click "Generate Binder >" button
    await quotePage.generateBinderFromSelected();

    // Fill the drawer that slides in
    await binderPage.fillGenerateBinderDrawer(GENERATE_BINDER_DATA);

    // Quote status should now be Bound
    await quotePage.assertQuoteStatus(createdQuoteId, 'Bound');

    // Binder tab should now have an entry
    await quotePage.goToBinderTab();
    await expect(
      binderPage.firstBinderRow,
      'At least one binder row should appear in the Binder list'
    ).toBeVisible({ timeout: 15_000 });

    console.log(`[quote-lifecycle] Binder generated — Quote ${createdQuoteId} is now Bound`);
  });

});
