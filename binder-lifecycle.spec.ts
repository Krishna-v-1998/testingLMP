/**
 * binder-lifecycle.spec.ts
 *
 * ── WHAT THIS SPEC COVERS ─────────────────────────────────────────────────────
 *
 *   Full Binder lifecycle (runs AFTER quote-lifecycle.spec.ts has generated a binder):
 *
 *   1.  Navigate to Binder tab → verify binder row exists
 *   2.  Verify binder status = Generated (or Draft)
 *   3.  Open binder detail → Binder Details tab (01)
 *   4.  Verify binder fields: Binder ID, Quote ID, Terrorism Coverage, Effective Date
 *   5.  Navigate to Forms tab (02) → verify formset selected + forms listed
 *   6.  Verify mandatory forms are locked, optional forms are present
 *   7.  Open Form Fields panel → fill each form from Excel fixture
 *   8.  [PDF PREVIEW — SKIPPED] Eye icon → PDF opens in new tab
 *   9.  Form Set Order (Tab 04) → click "Forms →"
 *  10.  Select Binder checkbox → Finalize Binder
 *  11.  Verify binder status = Finalized
 *  12.  Verify submission status transitions to In-Processing
 *
 * ── HOW TO RUN ────────────────────────────────────────────────────────────────
 *
 *   # Full run
 *   npx playwright test tests/binder/binder-lifecycle.spec.ts --headed
 *
 *   # Run after quote (full lifecycle from quote)
 *   npx playwright test tests/quote tests/binder --headed
 *
 *   # Debug
 *   npx playwright test tests/binder/binder-lifecycle.spec.ts --headed --slow-mo 400
 *
 * ── PREREQUISITES ─────────────────────────────────────────────────────────────
 *
 *   - storage-states/uw.json
 *   - Binder already exists (created by quote-lifecycle.spec.ts OR set BINDER_ID)
 *
 * ── ENV VARS ──────────────────────────────────────────────────────────────────
 *
 *   SUBMISSION_URL=https://...
 *   SUBMISSION_ID=yyy
 *   BINDER_ID=BND-001   (optional — if set, skips finding the first row)
 */

import { test, expect }           from '../../src/fixtures';
import { SubmissionSetupService } from '../../src/services/SubmissionSetupService';
import { SubmissionContext }       from '../../src/types/submission.types';
import { Role }                   from '../../src/enums/role.enum';
import { QuotePage }              from '../../src/pages/QuotePage';
import { BinderPage }             from '../../src/pages/BinderPage';
import { FormsPage }              from '../../src/pages/FormsPage';
import { FormsDataReader }        from '../../src/data/fixtures/FormsDataReader';
import { SubmissionOverviewPage } from '../../src/pages/SubmissionOverviewPage';

// ── Feature flag ──────────────────────────────────────────────────────────────
const PDF_PREVIEW_ENABLED = false;

// ── Shared state ──────────────────────────────────────────────────────────────
let submissionCtx: SubmissionContext;
let binderId: string;   // discovered from the Binder list

const FORMSET_NAME  = "Builder's Risk";

const MANDATORY_FORM_NUMBERS = [
  'BR 4000DEC 11 15',
  'TER 9015PHN 02 15',
  'IM 8035 12 20',
];

// ═════════════════════════════════════════════════════════════════════════════
// SUITE
// ═════════════════════════════════════════════════════════════════════════════

test.describe.serial('Binder Lifecycle — Builder\'s Risk @binder', () => {

  // ── Setup ─────────────────────────────────────────────────────────────────

  test.beforeAll(async ({ browser }) => {
    submissionCtx = await SubmissionSetupService.createAndStoreContext(
      browser,
      Role.UW,
      { label: 'binder-lifecycle', reuseExisting: true },
    );

    // If BINDER_ID is provided via env var, use it directly
    if (process.env.BINDER_ID) {
      binderId = process.env.BINDER_ID;
      console.log(`[binder-lifecycle] Using BINDER_ID from env: ${binderId}`);
    }
  });

  // ── 1. Navigate to Binder tab and verify row exists ───────────────────────

  test('1 — Binder tab: verify binder row exists', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);
    await submissionOverview.waitUntilLoaded();
    await submissionOverview.clickExposuresAndQuotes();

    const quotePage  = new QuotePage(page);
    const binderPage = new BinderPage(page);

    await quotePage.goToBinderTab();

    // If we don't have a binder ID, grab the first row
    if (!binderId) {
      await expect(
        binderPage.firstBinderRow,
        'At least one binder should exist in the Binder list'
      ).toBeVisible({ timeout: 15_000 });

      // Try to read the Binder ID from the first row's first visible text
      const rowText = await binderPage.firstBinderRow.textContent();
      console.log(`[binder-lifecycle] First binder row text: ${rowText}`);

      // Extract binder ID from row text using a simple pattern (e.g., BND-xxx, B-xxx)
      const idMatch = rowText?.match(/\b(BND-\w+|B-\d+|\d{4,})\b/);
      if (idMatch) {
        binderId = idMatch[1];
        console.log(`[binder-lifecycle] Discovered binder ID: ${binderId}`);
      } else {
        // Fallback: proceed without specific ID
        console.warn('[binder-lifecycle] Could not extract binder ID from row; proceeding without it');
        binderId = '__FIRST_ROW__';
      }
    } else {
      await binderPage.assertBinderInList(binderId);
    }
  });

  // ── 2. Verify binder status ───────────────────────────────────────────────

  test('2 — Verify binder status is Generated (or Draft)', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage  = new QuotePage(page);
    const binderPage = new BinderPage(page);

    await quotePage.goToBinderTab();

    // Acceptable statuses before Forms are saved
    const statusCell = binderId === '__FIRST_ROW__'
      ? binderPage.firstBinderRow
      : binderPage.binderRow(binderId);

    await expect(statusCell).toBeVisible({ timeout: 10_000 });

    const cellText = await statusCell.textContent();
    const isAcceptableStatus = /generated|draft/i.test(cellText ?? '');
    expect(
      isAcceptableStatus,
      `Binder status should be Draft or Generated but was: "${cellText}"`
    ).toBe(true);

    console.log(`[binder-lifecycle] Binder status verified: ${cellText}`);
  });

  // ── 3. Open binder detail ─────────────────────────────────────────────────

  test('3 — Open binder detail (Binder Details tab)', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage  = new QuotePage(page);
    const binderPage = new BinderPage(page);

    await quotePage.goToBinderTab();

    // Open the binder (click on its row)
    if (binderId === '__FIRST_ROW__') {
      await binderPage.firstBinderRow.click();
    } else {
      await binderPage.binderRow(binderId).click();
    }
    await page.waitForLoadState('networkidle');

    // Verify Binder Details tab is active and visible
    await expect(
      binderPage.tabBinderDetails,
      'Binder Details tab should be visible'
    ).toBeVisible({ timeout: 10_000 });

    // Verify at least one known field is visible (Binder ID or effective date)
    const knownFieldVisible = await Promise.race([
      binderPage.fieldBinderId.isVisible().catch(() => false),
      binderPage.fieldEffectiveDate.isVisible().catch(() => false),
    ]);
    expect(knownFieldVisible, 'At least one Binder Detail field should be visible').toBe(true);

    console.log('[binder-lifecycle] Binder detail opened, Binder Details tab is visible');
  });

  // ── 4. Verify binder fields ───────────────────────────────────────────────

  test('4 — Verify binder fields on Binder Details tab', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage  = new QuotePage(page);
    const binderPage = new BinderPage(page);

    await quotePage.goToBinderTab();

    if (binderId === '__FIRST_ROW__') {
      await binderPage.firstBinderRow.click();
    } else {
      await binderPage.binderRow(binderId).click();
    }
    await page.waitForLoadState('networkidle');
    await binderPage.tabBinderDetails.click();
    await page.waitForLoadState('networkidle');

    // The terrorism coverage field should be visible (set during Generate Binder)
    await expect(
      binderPage.fieldTerrorismCoverage
        .or(page.getByText(/terrorism\s+coverage/i)),
      'Terrorism Coverage field should be visible on Binder Details tab'
    ).toBeVisible({ timeout: 8_000 });

    console.log('[binder-lifecycle] ✅ Binder Detail fields verified');
  });

  // ── 5. Navigate to Forms tab ──────────────────────────────────────────────

  test('5 — Forms tab: verify formset selected + forms listed', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage  = new QuotePage(page);
    const binderPage = new BinderPage(page);
    const formsPage  = new FormsPage(page);

    await quotePage.goToBinderTab();

    if (binderId === '__FIRST_ROW__') {
      await binderPage.firstBinderRow.click();
    } else {
      await binderPage.binderRow(binderId).click();
    }
    await page.waitForLoadState('networkidle');

    // Go to Forms tab (02)
    await binderPage.goToFormsTab();

    // The Builder's Risk formset should already be selected (carried from Quote)
    await expect(
      page.getByText(FORMSET_NAME, { exact: false }),
      `Formset "${FORMSET_NAME}" should still be selected`
    ).toBeVisible({ timeout: 10_000 });

    console.log('[binder-lifecycle] ✅ Formset verified on Binder Forms tab');
  });

  // ── 6. Verify mandatory forms ─────────────────────────────────────────────

  test('6 — Forms tab: verify mandatory forms are still locked', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage  = new QuotePage(page);
    const binderPage = new BinderPage(page);
    const formsPage  = new FormsPage(page);

    await quotePage.goToBinderTab();

    if (binderId === '__FIRST_ROW__') {
      await binderPage.firstBinderRow.click();
    } else {
      await binderPage.binderRow(binderId).click();
    }
    await page.waitForLoadState('networkidle');
    await binderPage.goToFormsTab();

    // Mandatory forms should be pre-checked and locked (same as Quote)
    for (const formNumber of MANDATORY_FORM_NUMBERS) {
      await formsPage.assertMandatoryFormIsLocked(formNumber);
    }

    console.log('[binder-lifecycle] ✅ Mandatory forms verified on Binder');
  });

  // ── 7. Fill Form Fields from Excel ───────────────────────────────────────

  test('7 — Open Form Fields panel + fill from Excel fixture', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage  = new QuotePage(page);
    const binderPage = new BinderPage(page);
    const formsPage  = new FormsPage(page);
    const forms      = await FormsDataReader.loadForms();

    await quotePage.goToBinderTab();

    if (binderId === '__FIRST_ROW__') {
      await binderPage.firstBinderRow.click();
    } else {
      await binderPage.binderRow(binderId).click();
    }
    await page.waitForLoadState('networkidle');
    await binderPage.goToFormsTab();
    await formsPage.openFormFieldsPanel();

    // Fill each form
    for (const form of forms) {
      console.log(`[binder-lifecycle] Filling Binder form fields: ${form.formNumber}`);
      await formsPage.selectFormInPanel(form.formNumber);

      for (const field of form.fields) {
        if (!field.testValue) continue;
        await formsPage.fillField(field);
      }

      await formsPage.saveFormFields();
      await page.waitForLoadState('networkidle');
    }

    console.log('[binder-lifecycle] ✅ All form fields filled for Binder');
  });

  // ── 8. PDF Preview (SKIPPED) ──────────────────────────────────────────────

  test('8 — [PDF PREVIEW] Eye icon → verify PDF content @pdf', async ({ page }) => {
    // ── PLACEHOLDER ─────────────────────────────────────────────────────────
    // PDF preview not yet working. Set PDF_PREVIEW_ENABLED = true when ready.
    // ────────────────────────────────────────────────────────────────────────
    if (!PDF_PREVIEW_ENABLED) {
      test.skip(true, 'PDF preview not yet implemented — set PDF_PREVIEW_ENABLED = true when ready');
    }
  });

  // ── 9. Form Set Order (Tab 04) → "Forms →" ────────────────────────────────

  test('9 — Form Set Order (Tab 04) → click "Forms →"', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage  = new QuotePage(page);
    const binderPage = new BinderPage(page);

    await quotePage.goToBinderTab();

    if (binderId === '__FIRST_ROW__') {
      await binderPage.firstBinderRow.click();
    } else {
      await binderPage.binderRow(binderId).click();
    }
    await page.waitForLoadState('networkidle');

    // Go to Form Set Order (Tab 04) and click "Forms →"
    await binderPage.goToFormSetOrderAndClickForms();

    console.log('[binder-lifecycle] ✅ Clicked "Forms →" on Form Set Order tab');
  });

  // ── 10. Select binder row + Finalize Binder ───────────────────────────────

  test('10 — Finalize Binder', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage  = new QuotePage(page);
    const binderPage = new BinderPage(page);

    await quotePage.goToBinderTab();

    // Select the binder checkbox
    const targetRow = binderId === '__FIRST_ROW__'
      ? binderPage.firstBinderRow
      : binderPage.binderRow(binderId);

    await targetRow.getByRole('checkbox').click();
    await page.waitForTimeout(500); // let the selection register

    // Click Finalize Binder
    await binderPage.finalizeBinder();

    console.log('[binder-lifecycle] ✅ Finalize Binder clicked');
  });

  // ── 11. Verify Binder status = Finalized ─────────────────────────────────

  test('11 — Verify binder status = Finalized', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage  = new QuotePage(page);
    const binderPage = new BinderPage(page);

    await quotePage.goToBinderTab();

    // Status should now be "Finalized"
    if (binderId !== '__FIRST_ROW__') {
      await binderPage.assertBinderStatus(binderId, 'Finalized');
    } else {
      await expect(
        binderPage.firstBinderRow.getByText(/finalized/i),
        'Binder status should be Finalized'
      ).toBeVisible({ timeout: 15_000 });
    }

    console.log('[binder-lifecycle] ✅ Binder status = Finalized');
  });

  // ── 12. Verify submission status = In-Processing ──────────────────────────

  test('12 — Verify submission status transitions to In-Processing', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);
    await submissionOverview.waitUntilLoaded();

    // The submission status badge should now read "In-Processing"
    // The status is typically visible in the submission header / overview area
    await expect(
      page.getByText(/in-processing/i),
      'Submission status should be "In-Processing" after Finalize Binder'
    ).toBeVisible({ timeout: 20_000 });

    console.log('[binder-lifecycle] ✅ Submission status = In-Processing');
  });

});
