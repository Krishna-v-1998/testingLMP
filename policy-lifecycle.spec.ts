/**
 * policy-lifecycle.spec.ts
 *
 * ── WHAT THIS SPEC COVERS ─────────────────────────────────────────────────────
 *
 *   Full Policy lifecycle (runs AFTER premium-booking.spec.ts has sent to WINS):
 *
 *   1.  Navigate to Policy tab → verify policy row exists
 *   2.  Open policy detail
 *   3.  Navigate to Forms tab (02) → verify formset + mandatory forms
 *   4.  Fill Form Fields from Excel fixture
 *   5.  [PDF PREVIEW — SKIPPED] Eye icon → PDF opens in new tab
 *   6.  Form Set Order (Tab 04) → "Generate Policy" button
 *   7.  Finalize Policy
 *   8.  Verify Policy status = Finalized
 *   9.  Verify submission status = Issued
 *
 * ── HOW TO RUN ────────────────────────────────────────────────────────────────
 *
 *   # Full run
 *   npx playwright test tests/policy/policy-lifecycle.spec.ts --headed
 *
 *   # Full end-to-end lifecycle
 *   npx playwright test tests/quote tests/binder tests/premium-booking tests/policy --headed
 *
 *   # Debug
 *   npx playwright test tests/policy/policy-lifecycle.spec.ts --headed --slow-mo 400
 *
 * ── PREREQUISITES ─────────────────────────────────────────────────────────────
 *
 *   - storage-states/uw.json
 *   - Submission must be Issued (Send to WINS completed)
 *   - SUBMISSION_URL + SUBMISSION_ID env vars (or SubmissionSetupService)
 *
 * ── ENV VARS ──────────────────────────────────────────────────────────────────
 *
 *   SUBMISSION_URL=https://...
 *   SUBMISSION_ID=yyy
 *   POLICY_ID=POL-001   (optional — if set, skips finding the first row)
 */

import { test, expect }           from '../../src/fixtures';
import { SubmissionSetupService } from '../../src/services/SubmissionSetupService';
import { SubmissionContext }       from '../../src/types/submission.types';
import { Role }                   from '../../src/enums/role.enum';
import { QuotePage }              from '../../src/pages/QuotePage';
import { PolicyPage }             from '../../src/pages/PolicyPage';
import { FormsPage }              from '../../src/pages/FormsPage';
import { FormsDataReader }        from '../../src/data/fixtures/FormsDataReader';

// ── Feature flag ──────────────────────────────────────────────────────────────
const PDF_PREVIEW_ENABLED = false;

// ── Shared state ──────────────────────────────────────────────────────────────
let submissionCtx: SubmissionContext;
let policyId: string;

const FORMSET_NAME  = "Builder's Risk";

const MANDATORY_FORM_NUMBERS = [
  'BR 4000DEC 11 15',
  'TER 9015PHN 02 15',
  'IM 8035 12 20',
];

// ═════════════════════════════════════════════════════════════════════════════
// SUITE
// ═════════════════════════════════════════════════════════════════════════════

test.describe.serial('Policy Lifecycle — Builder\'s Risk @policy', () => {

  // ── Setup ─────────────────────────────────────────────────────────────────

  test.beforeAll(async ({ browser }) => {
    submissionCtx = await SubmissionSetupService.createAndStoreContext(
      browser,
      Role.UW,
      { label: 'policy-lifecycle', reuseExisting: true },
    );

    if (process.env.POLICY_ID) {
      policyId = process.env.POLICY_ID;
      console.log(`[policy-lifecycle] Using POLICY_ID from env: ${policyId}`);
    }
  });

  // ── 1. Navigate to Policy tab and verify row ──────────────────────────────

  test('1 — Policy tab: verify policy row exists', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);
    await submissionOverview.waitUntilLoaded();
    await submissionOverview.clickExposuresAndQuotes();

    const quotePage  = new QuotePage(page);
    const policyPage = new PolicyPage(page);

    await quotePage.goToPolicyTab();

    // After Send to WINS, a policy row should appear
    await expect(
      page.locator('table tbody tr, [role="row"]').nth(1),
      'At least one policy should exist in the Policy list'
    ).toBeVisible({ timeout: 20_000 });

    // If we don't have a policy ID yet, discover it from the row
    if (!policyId) {
      const firstRow = page.locator('table tbody tr, [role="row"]').nth(1);
      const rowText  = await firstRow.textContent();
      console.log(`[policy-lifecycle] First policy row text: ${rowText}`);

      const idMatch = rowText?.match(/\b(POL-\w+|P-\d+|\d{4,})\b/);
      if (idMatch) {
        policyId = idMatch[1];
        console.log(`[policy-lifecycle] Discovered policy ID: ${policyId}`);
      } else {
        policyId = '__FIRST_ROW__';
        console.warn('[policy-lifecycle] Could not extract policy ID; using first row');
      }
    } else {
      await policyPage.assertPolicyInList(policyId);
    }
  });

  // ── 2. Open policy detail ─────────────────────────────────────────────────

  test('2 — Open policy detail view', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage  = new QuotePage(page);
    const policyPage = new PolicyPage(page);

    await quotePage.goToPolicyTab();

    // Open the policy
    if (policyId === '__FIRST_ROW__') {
      await page.locator('table tbody tr, [role="row"]').nth(1).click();
    } else {
      await policyPage.openPolicy(policyId);
    }

    await page.waitForLoadState('networkidle');

    // The policy detail view should be open
    // Look for any visible tabs or policy-related content
    await expect(
      page.getByRole('tab').first()
        .or(page.getByText(/policy\s+details/i))
        .or(page.getByText(/01\s+policy\s+details|01\s+details/i)),
      'Policy detail view should be open'
    ).toBeVisible({ timeout: 15_000 });

    console.log('[policy-lifecycle] ✅ Policy detail opened');
  });

  // ── 3. Forms tab: verify formset + mandatory forms ────────────────────────

  test('3 — Forms tab: verify formset and mandatory forms', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage  = new QuotePage(page);
    const policyPage = new PolicyPage(page);
    const formsPage  = new FormsPage(page);

    await quotePage.goToPolicyTab();

    if (policyId === '__FIRST_ROW__') {
      await page.locator('table tbody tr, [role="row"]').nth(1).click();
    } else {
      await policyPage.openPolicy(policyId);
    }
    await page.waitForLoadState('networkidle');

    // Go to Forms tab (02)
    await formsPage.goToFormsTab();

    // Formset should be pre-selected (carried from Binder)
    await expect(
      page.getByText(FORMSET_NAME, { exact: false }),
      `Formset "${FORMSET_NAME}" should still be selected on Policy`
    ).toBeVisible({ timeout: 10_000 });

    // Mandatory forms should still be locked
    for (const formNumber of MANDATORY_FORM_NUMBERS) {
      await formsPage.assertMandatoryFormIsLocked(formNumber);
    }

    console.log('[policy-lifecycle] ✅ Formset + mandatory forms verified on Policy');
  });

  // ── 4. Fill Form Fields from Excel ───────────────────────────────────────

  test('4 — Open Form Fields panel + fill from Excel fixture', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage  = new QuotePage(page);
    const policyPage = new PolicyPage(page);
    const formsPage  = new FormsPage(page);
    const forms      = await FormsDataReader.loadForms();

    await quotePage.goToPolicyTab();

    if (policyId === '__FIRST_ROW__') {
      await page.locator('table tbody tr, [role="row"]').nth(1).click();
    } else {
      await policyPage.openPolicy(policyId);
    }
    await page.waitForLoadState('networkidle');
    await formsPage.goToFormsTab();
    await formsPage.openFormFieldsPanel();

    for (const form of forms) {
      console.log(`[policy-lifecycle] Filling Policy form fields: ${form.formNumber}`);
      await formsPage.selectFormInPanel(form.formNumber);

      for (const field of form.fields) {
        if (!field.testValue) continue;
        await formsPage.fillField(field);
      }

      await formsPage.saveFormFields();
      await page.waitForLoadState('networkidle');
    }

    console.log('[policy-lifecycle] ✅ All form fields filled for Policy');
  });

  // ── 5. PDF Preview (SKIPPED) ──────────────────────────────────────────────

  test('5 — [PDF PREVIEW] Eye icon → verify PDF content @pdf', async ({ page }) => {
    // ── PLACEHOLDER ─────────────────────────────────────────────────────────
    // PDF preview not yet working. Set PDF_PREVIEW_ENABLED = true when ready.
    // ────────────────────────────────────────────────────────────────────────
    if (!PDF_PREVIEW_ENABLED) {
      test.skip(true, 'PDF preview not yet implemented — set PDF_PREVIEW_ENABLED = true when ready');
    }
  });

  // ── 6. Form Set Order (Tab 04) → "Generate Policy" ───────────────────────

  test('6 — Form Set Order (Tab 04) → Generate Policy', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage  = new QuotePage(page);
    const policyPage = new PolicyPage(page);
    const formsPage  = new FormsPage(page);

    await quotePage.goToPolicyTab();

    if (policyId === '__FIRST_ROW__') {
      await page.locator('table tbody tr, [role="row"]').nth(1).click();
    } else {
      await policyPage.openPolicy(policyId);
    }
    await page.waitForLoadState('networkidle');

    // Navigate to Form Set Order tab (04)
    await formsPage.tabFormSetOrder.click();
    await page.waitForLoadState('networkidle');

    // Click "Generate Policy" button
    // NOTE: Policy tab uses "Generate Policy" (not "Forms →" like Binder)
    await page.getByRole('button', { name: /generate\s+policy/i }).click();
    await page.waitForLoadState('networkidle');

    console.log('[policy-lifecycle] ✅ Clicked "Generate Policy" on Form Set Order tab');

    // Go back to list to check status
    await page.goBack();

    // Status should now be Generated
    if (policyId !== '__FIRST_ROW__') {
      await policyPage.assertPolicyStatus('Generated');
    } else {
      await expect(
        page.getByText(/generated/i).first(),
        'Policy status should be Generated after Generate Policy'
      ).toBeVisible({ timeout: 15_000 });
    }
  });

  // ── 7. Finalize Policy ────────────────────────────────────────────────────

  test('7 — Finalize Policy', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage  = new QuotePage(page);
    const policyPage = new PolicyPage(page);

    await quotePage.goToPolicyTab();

    // Select the policy checkbox
    const targetRow = policyId === '__FIRST_ROW__'
      ? page.locator('table tbody tr, [role="row"]').nth(1)
      : policyPage.policyRow(policyId);

    await targetRow.getByRole('checkbox').click();
    await page.waitForTimeout(500);

    // Click "Finalize Policy" button in the toolbar
    await page.getByRole('button', { name: /finalize\s+policy/i }).click();
    await page.waitForLoadState('networkidle');

    console.log('[policy-lifecycle] ✅ Finalize Policy clicked');
  });

  // ── 8. Verify Policy status = Finalized ──────────────────────────────────

  test('8 — Verify policy status = Finalized', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage  = new QuotePage(page);
    const policyPage = new PolicyPage(page);

    await quotePage.goToPolicyTab();

    if (policyId !== '__FIRST_ROW__') {
      await policyPage.assertPolicyStatus('Finalized');
    } else {
      await expect(
        page.locator('table tbody tr, [role="row"]').nth(1).getByText(/finalized/i),
        'Policy status should be Finalized'
      ).toBeVisible({ timeout: 15_000 });
    }

    console.log('[policy-lifecycle] ✅ Policy status = Finalized');
  });

  // ── 9. Verify submission status = Issued ─────────────────────────────────

  test('9 — Verify submission status = Issued (lifecycle complete)', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);
    await submissionOverview.waitUntilLoaded();

    // Final state: submission should be "Issued"
    await expect(
      page.getByText(/\bissued\b/i),
      'Submission status should be "Issued" after policy finalization'
    ).toBeVisible({ timeout: 20_000 });

    console.log('[policy-lifecycle] 🎉 Policy lifecycle COMPLETE — Submission is Issued');
  });

});
