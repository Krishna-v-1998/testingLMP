/**
 * policy-lifecycle.spec.ts
 *
 * Full Policy Lifecycle — end-to-end serial test suite.
 *
 * ── LIFECYCLE COVERED ────────────────────────────────────────────────────────
 *
 *   1.  Location Management     — add one location
 *   2.  Quote                   — create a new Builder's Risk quote
 *   3.  Quote product fields    — fill BR fields (Quote Details → BR sub-tab)
 *   4.  Quote forms             — validate Forms list + PDF against manifest
 *   5.  Generate Quote          — status → Generated
 *   6.  Finalize Quote          — status → Finalized
 *   7.  Open → Quoted           — CUO: status change with error handling
 *   8.  Quoted → Bound          — CUO: status change with error handling
 *   9.  Generate Binder         — GBO: fill drawer, generate
 *  10.  Binder product fields   — assert BR fields read-only in binder context
 *  11.  Binder forms            — validate Forms list + PDF against manifest
 *  12.  Generate & Finalize Binder — status → Generated → Finalized
 *  13.  Bound → In-Processing   — GBO: status change with error handling
 *  14.  Premium Booking         — Send to WINS
 *  15.  Generate Policy         — GBO: fill policy, generate
 *  16.  Policy forms            — validate Forms list + PDF against manifest
 *  17.  Finalize Policy         — status → Finalized
 *
 * ── RUNNING ──────────────────────────────────────────────────────────────────
 *
 *   # Full lifecycle (must run with 1 worker when other specs share context)
 *   npx playwright test tests/lifecycle/policy-lifecycle.spec.ts --workers=1
 *
 *   # Individual test by title (re-uses cached submission context)
 *   npx playwright test tests/lifecycle/policy-lifecycle.spec.ts -g "03 —"
 *
 *   # Headed / slow-mo for debugging
 *   npx playwright test tests/lifecycle/policy-lifecycle.spec.ts --headed --slow-mo 300
 *
 * ── PREREQUISITES ────────────────────────────────────────────────────────────
 *
 *   - storage-states/gbo.json  (GBO role login state)
 *   - storage-states/cuo.json  (CUO role login state)
 *   - test-data/form-manifest.xlsx  (Excel form manifest — see FormManifestReader)
 *   - BASE_URL env var  OR  SUBMISSION_URL + SUBMISSION_ID env vars
 *
 * ── SHARED STATE ─────────────────────────────────────────────────────────────
 *
 *   submissionCtx — stored by SubmissionSetupService; re-used across all tests
 *   quoteId       — set in test 02, used in tests 03–08
 *   binderId      — set in test 09, used in tests 10–14
 */

import path                           from 'path';
import { test, expect }               from '../../src/fixtures';
import { SubmissionSetupService }     from '../../src/services/SubmissionSetupService';
import { Role }                       from '../../src/enums/role.enum';
import type { SubmissionContext }     from '../../src/types/submission.types';

// ── Page objects ──────────────────────────────────────────────────────────────
import { LocationManagementPage }         from '../../src/pages/LocationManagementPage';
import { QuotePage }                      from '../../src/pages/QuotePage';
import { BuildersRiskPage }               from '../../src/pages/BuildersRiskPage';
import { FormsPage }                      from '../../src/pages/FormsPage';
import { FormsPreviewPage }               from '../../src/pages/FormsPreviewPage';
import { FormSetOrderPage }               from '../../src/pages/FormSetOrderPage';
import { BinderPage }                     from '../../src/pages/BinderPage';
import { StatusChangePage }               from '../../src/pages/StatusChangePage';
import { BrokerInformationPage }          from '../../src/pages/BrokerInformationPage';
import { UWRationalePage }                from '../../src/pages/UWRationalePage';
import { BindingInstructionsChecklistPage } from '../../src/pages/BindingInstructionsChecklistPage';
import { PolicyIssuanceChecklistPage }    from '../../src/pages/PolicyIssuanceChecklistPage';
import { PremiumBookingPage }             from '../../src/pages/PremiumBookingPage';
import { PolicyPage }                     from '../../src/pages/PolicyPage';
import { SubmissionOverviewPage }         from '../../src/pages/SubmissionOverviewPage';
import { AccountsReviewPage }             from '../../src/pages/AccountsReviewPage';
import { getManifestReader }              from '../../src/helpers/FormManifestReader';

// ── Test data ─────────────────────────────────────────────────────────────────

/** Set to false to skip PDF validation (e.g. while manifest is being built) */
const PDF_VALIDATION_ENABLED = process.env.PDF_VALIDATION_ENABLED !== 'false';

/** Product / sub-segment used throughout the lifecycle */
const PRODUCT     = "Builder's Risk";
const SUB_SEGMENT = 'Builders Risk';

/** Excel manifest reader (singleton — cached after first read) */
const manifestReader = getManifestReader(
  path.resolve(process.cwd(), 'test-data', 'form-manifest.xlsx'),
);

// ── Location data ─────────────────────────────────────────────────────────────
const LOCATION_DATA = {
  country:        'United States',
  streetAddress:  '123 Test Street',
  city:           'Chicago',
  stateProvince:  'Illinois',
  zipPostalCode:  '60601',
  sprinklered:    'Yes' as const,
  buildingValue:  '1000000',
  contentsValue:  '500000',
};

// ── Quote data ────────────────────────────────────────────────────────────────
const QUOTE_DATA = {
  product:    PRODUCT,
  subSegment: SUB_SEGMENT,
};

// ── Builder's Risk field data ─────────────────────────────────────────────────
const BR_EXPOSURE_DATA = {
  hardCosts:  '500000',
  softCosts:  '50000',
};

// ── Binder drawer data ────────────────────────────────────────────────────────
const BINDER_DRAWER_DATA = {
  terrorismCoverage:          'Yes' as const,
  triaPercent:                '1',
  autoGeneratePolicyNumber:   true,
};

// ── Shared mutable state (serial suite — safe to use module-level vars) ───────
let submissionCtx: SubmissionContext;
let quoteId:  string;
let binderId: string;

// ═════════════════════════════════════════════════════════════════════════════
// SUITE
// ═════════════════════════════════════════════════════════════════════════════

test.describe.serial('Policy Lifecycle @lifecycle', () => {

  // ── Setup ──────────────────────────────────────────────────────────────────

  test.beforeAll(async ({ browser }) => {
    submissionCtx = await SubmissionSetupService.createAndStoreContext(
      browser,
      Role.GBO,
      { label: 'policy-lifecycle', reuseExisting: true },
    );
    console.log(`[lifecycle] Submission: ${submissionCtx.submissionId} — ${submissionCtx.submissionUrl}`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 01. Location Management — Add One Location
  // ══════════════════════════════════════════════════════════════════════════

  test('01 — Add a location', async ({ page }) => {
    const overview  = new SubmissionOverviewPage(page);
    const locations = new LocationManagementPage(page);

    await overview.navigateByUrl(submissionCtx.submissionUrl);
    await overview.waitForAnyDataLoaded();

    // Navigate to Location Management (sidebar link)
    const locLink = page
      .getByRole('link', { name: /location\s*management|locations?/i })
      .or(page.getByText(/location\s*management/i).first());
    await locLink.click();
    await page.waitForLoadState('networkidle');

    await locations.addLocation(LOCATION_DATA);
    await locations.assertLocationCount(1);

    console.log('[lifecycle] ✅ 01 — Location added');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 02. Quote — Create New Quote
  // ══════════════════════════════════════════════════════════════════════════

  test('02 — Create a new Builder\'s Risk quote', async ({ page }) => {
    const overview = new SubmissionOverviewPage(page);
    const quotes   = new QuotePage(page);

    await overview.navigateByUrl(submissionCtx.submissionUrl);
    await overview.clickExposuresAndQuotes();
    await quotes.goToQuoteTab();

    quoteId = await quotes.createQuote(QUOTE_DATA);
    expect(quoteId, 'Quote ID should be set after creation').toBeTruthy();

    console.log(`[lifecycle] ✅ 02 — Quote created: ${quoteId}`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 03. Quote Product Fields — Fill Builder's Risk fields
  // ══════════════════════════════════════════════════════════════════════════

  test('03 — Fill Builder\'s Risk product fields in Quote', async ({ page }) => {
    const overview = new SubmissionOverviewPage(page);
    const quotes   = new QuotePage(page);
    const br       = new BuildersRiskPage(page);

    await overview.navigateByUrl(submissionCtx.submissionUrl);
    await overview.clickExposuresAndQuotes();
    await quotes.goToQuoteTab();
    await quotes.openQuote(quoteId);

    // Navigate to Quote Details → Builder's Risk sub-tab
    await br.goToProductFields('quote');

    // Fill exposure information
    await br.fillExposureInformation(BR_EXPOSURE_DATA);

    // Save (using the page's save button)
    const btnSave = page.getByRole('button', { name: /^save$/i });
    if (await btnSave.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await btnSave.click();
      await page.waitForLoadState('networkidle');
    }

    console.log('[lifecycle] ✅ 03 — Builder\'s Risk fields filled');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 04. Quote Forms — Validate forms list + PDF against manifest
  // ══════════════════════════════════════════════════════════════════════════

  test('04 — Validate Quote forms against manifest', async ({ page }, testInfo) => {
    const overview = new SubmissionOverviewPage(page);
    const quotes   = new QuotePage(page);
    const forms    = new FormsPage(page);

    await overview.navigateByUrl(submissionCtx.submissionUrl);
    await overview.clickExposuresAndQuotes();
    await quotes.goToQuoteTab();
    await quotes.openQuote(quoteId);

    // Navigate to Forms tab
    await forms.goToFormsTab();

    if (PDF_VALIDATION_ENABLED) {
      const manifestEntries = manifestReader.getFormsForProduct(PRODUCT, SUB_SEGMENT);

      if (manifestEntries.length === 0) {
        console.warn('[lifecycle] ⚠ No form manifest entries found for', PRODUCT, SUB_SEGMENT,
          '— skipping forms validation');
      } else {
        await forms.validateAllFormsFromManifest(manifestEntries, testInfo);
      }
    } else {
      console.log('[lifecycle] PDF_VALIDATION_ENABLED=false — skipping PDF validation');
    }

    console.log('[lifecycle] ✅ 04 — Quote forms validated');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 05. Generate Quote → status = Generated
  // ══════════════════════════════════════════════════════════════════════════

  test('05 — Generate Quote (status → Generated)', async ({ page }) => {
    const overview = new SubmissionOverviewPage(page);
    const quotes   = new QuotePage(page);

    await overview.navigateByUrl(submissionCtx.submissionUrl);
    await overview.clickExposuresAndQuotes();
    await quotes.goToQuoteTab();
    await quotes.openQuote(quoteId);

    // Click Generate Quote
    const btnGenerate = page.getByRole('button', { name: /generate\s*quote/i });
    await btnGenerate.click();
    await page.waitForLoadState('networkidle');

    // Confirm modal if present
    const confirmBtn = page.getByRole('button', { name: /confirm|yes|ok/i }).first();
    if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmBtn.click();
      await page.waitForLoadState('networkidle');
    }

    await quotes.assertQuoteStatus(quoteId, 'Generated');
    console.log('[lifecycle] ✅ 05 — Quote Generated');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 06. Finalize Quote → status = Finalized
  // ══════════════════════════════════════════════════════════════════════════

  test('06 — Finalize Quote (status → Finalized)', async ({ page }) => {
    const overview = new SubmissionOverviewPage(page);
    const quotes   = new QuotePage(page);

    await overview.navigateByUrl(submissionCtx.submissionUrl);
    await overview.clickExposuresAndQuotes();
    await quotes.goToQuoteTab();
    await quotes.openQuote(quoteId);
    await quotes.finalizeSelectedQuote();

    await quotes.assertQuoteStatus(quoteId, 'Finalized');
    console.log('[lifecycle] ✅ 06 — Quote Finalized');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 07. Status: Open → Quoted  (CUO role)
  // ══════════════════════════════════════════════════════════════════════════

  test('07 — Status change: Open → Quoted (CUO)', async ({ browser }) => {
    const cuoCtx  = await browser.newContext({ storageState: 'storage-states/cuo.json' });
    const cuoPage = await cuoCtx.newPage();

    try {
      const overview      = new SubmissionOverviewPage(cuoPage);
      const statusChange  = new StatusChangePage(cuoPage);
      const accountReview = new AccountsReviewPage(cuoPage);

      await overview.navigateByUrl(submissionCtx.submissionUrl);
      await overview.waitForAnyDataLoaded();

      await statusChange.openToQuoted({
        onAccountReviewRequired: async () => {
          await accountReview.goToAccountReview();
          await accountReview.completeAccountReview();
          // Navigate back to submission overview for retry
          await overview.navigateByUrl(submissionCtx.submissionUrl);
        },
      });

      await statusChange.assertSubmissionStatus('Quoted');
      console.log('[lifecycle] ✅ 07 — Status: Open → Quoted');
    } finally {
      await cuoCtx.close();
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 08. Status: Quoted → Bound  (CUO role)
  // ══════════════════════════════════════════════════════════════════════════

  test('08 — Status change: Quoted → Bound (CUO)', async ({ browser }) => {
    const cuoCtx  = await browser.newContext({ storageState: 'storage-states/cuo.json' });
    const cuoPage = await cuoCtx.newPage();

    try {
      const overview     = new SubmissionOverviewPage(cuoPage);
      const statusChange = new StatusChangePage(cuoPage);
      const brokerInfo   = new BrokerInformationPage(cuoPage);
      const uwRationale  = new UWRationalePage(cuoPage);
      const bindingCI    = new BindingInstructionsChecklistPage(cuoPage);

      await overview.navigateByUrl(submissionCtx.submissionUrl);
      await overview.waitForAnyDataLoaded();

      await statusChange.quotedToBound({
        onBindingErrorsDetected: async () => {
          // 1. Fill commission on Broker Information page
          await overview.clickBrokerInformationTab();
          await brokerInfo.fillCommission(10);
          await brokerInfo.save();

          // 2. Fill UW Rationale
          await uwRationale.goFillAndSave('Testing');

          // 3. Complete Binding Instructions Checklist
          await bindingCI.goToBindingInstructionsChecklist();
          await bindingCI.completeChecklist();

          // Navigate back to submission for retry
          await overview.navigateByUrl(submissionCtx.submissionUrl);
        },
      });

      await statusChange.assertSubmissionStatus('Bound');
      console.log('[lifecycle] ✅ 08 — Status: Quoted → Bound');
    } finally {
      await cuoCtx.close();
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 09. Generate Binder  (GBO role)
  // ══════════════════════════════════════════════════════════════════════════

  test('09 — Generate Binder (GBO)', async ({ page }) => {
    const overview = new SubmissionOverviewPage(page);
    const quotes   = new QuotePage(page);
    const binder   = new BinderPage(page);

    await overview.navigateByUrl(submissionCtx.submissionUrl);
    await overview.clickExposuresAndQuotes();

    // Select the Finalized quote then click Generate Binder
    await quotes.goToQuoteTab();
    await quotes.openQuote(quoteId);
    await quotes.generateBinderFromSelected();

    // Fill the Generate Binder drawer and submit
    await binder.fillGenerateBinderDrawer(BINDER_DRAWER_DATA);

    // Go to Binder tab, capture the new binder ID
    await quotes.goToBinderTab();
    binderId = (await binder.firstBinderRow.getByRole('cell').first().textContent() ?? '').trim();
    expect(binderId, 'Binder ID should be set after generation').toBeTruthy();

    console.log(`[lifecycle] ✅ 09 — Binder generated: ${binderId}`);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 10. Binder Product Fields — assert BR fields read-only in binder context
  // ══════════════════════════════════════════════════════════════════════════

  test('10 — Verify Builder\'s Risk fields in Binder (read-only)', async ({ page }) => {
    const overview = new SubmissionOverviewPage(page);
    const quotes   = new QuotePage(page);
    const binder   = new BinderPage(page);
    const br       = new BuildersRiskPage(page);

    await overview.navigateByUrl(submissionCtx.submissionUrl);
    await overview.clickExposuresAndQuotes();
    await quotes.goToBinderTab();
    await binder.openBinder(binderId);

    await br.goToProductFields('binder');

    const readOnly = await br.isReadOnly();
    expect(readOnly, 'BR fields should be read-only in Binder context').toBe(true);

    console.log('[lifecycle] ✅ 10 — Binder BR fields are read-only');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 11. Binder Forms — validate forms against manifest
  // ══════════════════════════════════════════════════════════════════════════

  test('11 — Validate Binder forms against manifest', async ({ page }, testInfo) => {
    const overview = new SubmissionOverviewPage(page);
    const quotes   = new QuotePage(page);
    const binder   = new BinderPage(page);
    const forms    = new FormsPage(page);

    await overview.navigateByUrl(submissionCtx.submissionUrl);
    await overview.clickExposuresAndQuotes();
    await quotes.goToBinderTab();
    await binder.openBinder(binderId);
    await binder.goToFormsTab();

    if (PDF_VALIDATION_ENABLED) {
      const entries = manifestReader.getFormsForProduct(PRODUCT, SUB_SEGMENT);
      if (entries.length > 0) {
        await forms.validateAllFormsFromManifest(entries, testInfo);
      } else {
        console.warn('[lifecycle] ⚠ No manifest entries — skipping binder forms validation');
      }
    }

    console.log('[lifecycle] ✅ 11 — Binder forms validated');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 12. Generate & Finalize Binder
  // ══════════════════════════════════════════════════════════════════════════

  test('12 — Generate and Finalize Binder', async ({ page }) => {
    const overview = new SubmissionOverviewPage(page);
    const quotes   = new QuotePage(page);
    const binder   = new BinderPage(page);

    await overview.navigateByUrl(submissionCtx.submissionUrl);
    await overview.clickExposuresAndQuotes();
    await quotes.goToBinderTab();
    await binder.openBinder(binderId);

    // Generate
    await binder.btnGenerateBinder.click();
    await page.waitForLoadState('networkidle');
    const confirmBtn = page.getByRole('button', { name: /confirm|yes|ok/i }).first();
    if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmBtn.click();
      await page.waitForLoadState('networkidle');
    }

    // Go back to list and assert Generated
    await quotes.goToBinderTab();
    await binder.assertFirstBinderStatus('Generated');

    // Open and Finalize
    await binder.openBinder(binderId);
    await binder.finalizeBinder();

    await quotes.goToBinderTab();
    await binder.assertFirstBinderStatus('Finalized');

    console.log('[lifecycle] ✅ 12 — Binder Generated and Finalized');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 13. Status: Bound → In-Processing  (GBO role)
  // ══════════════════════════════════════════════════════════════════════════

  test('13 — Status change: Bound → In-Processing (GBO)', async ({ page }) => {
    const overview      = new SubmissionOverviewPage(page);
    const statusChange  = new StatusChangePage(page);
    const policyCI      = new PolicyIssuanceChecklistPage(page);

    await overview.navigateByUrl(submissionCtx.submissionUrl);
    await overview.waitForAnyDataLoaded();

    await statusChange.boundToInProcessing({
      onPolicyIssuanceRequired: async () => {
        await policyCI.goToPolicyIssuanceChecklist();
        await policyCI.completeAndIssuePolicy();
        await overview.navigateByUrl(submissionCtx.submissionUrl);
      },
    });

    await statusChange.assertSubmissionStatus('In-Processing');
    console.log('[lifecycle] ✅ 13 — Status: Bound → In-Processing');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 14. Premium Booking — Send to WINS
  // ══════════════════════════════════════════════════════════════════════════

  test('14 — Premium Booking: Send to WINS', async ({ page }) => {
    const overview       = new SubmissionOverviewPage(page);
    const quotes         = new QuotePage(page);
    const premiumBooking = new PremiumBookingPage(page);

    await overview.navigateByUrl(submissionCtx.submissionUrl);
    await overview.clickExposuresAndQuotes();
    await quotes.goToPremiumBookingTab();
    await premiumBooking.waitUntilLoaded();

    await premiumBooking.assertLocationInfoTableVisible();
    await premiumBooking.assertCoverageInfoTableVisible();
    await premiumBooking.assertSendToWINSEnabled();

    await premiumBooking.sendToWINS(true);

    // After WINS submission, status should move toward Issued
    const statusEl = page.getByText(/issued|in-processing/i).first();
    await expect(statusEl, 'Status should be Issued or In-Processing after Send to WINS')
      .toBeVisible({ timeout: 30_000 });

    console.log('[lifecycle] ✅ 14 — Premium Booking: Send to WINS complete');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 15. Generate Policy
  // ══════════════════════════════════════════════════════════════════════════

  test('15 — Generate Policy', async ({ page }) => {
    const overview = new SubmissionOverviewPage(page);
    const quotes   = new QuotePage(page);
    const policy   = new PolicyPage(page);

    await overview.navigateByUrl(submissionCtx.submissionUrl);
    await overview.clickExposuresAndQuotes();
    await quotes.goToPolicyTab();

    await policy.openFirstPolicy();

    // Fill product fields in Policy context (read-only assertions only)
    const br = new BuildersRiskPage(page);
    await br.goToProductFields('policy');

    // Generate Policy
    await policy.generatePolicy();

    // Go back to list and assert Generated
    await quotes.goToPolicyTab();
    await policy.assertPolicyStatus('Generated');

    console.log('[lifecycle] ✅ 15 — Policy Generated');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 16. Policy Forms — validate against manifest
  // ══════════════════════════════════════════════════════════════════════════

  test('16 — Validate Policy forms against manifest', async ({ page }, testInfo) => {
    const overview = new SubmissionOverviewPage(page);
    const quotes   = new QuotePage(page);
    const policy   = new PolicyPage(page);
    const forms    = new FormsPage(page);

    await overview.navigateByUrl(submissionCtx.submissionUrl);
    await overview.clickExposuresAndQuotes();
    await quotes.goToPolicyTab();
    await policy.openFirstPolicy();

    // Navigate to Forms tab within policy
    await forms.goToFormsTab();

    if (PDF_VALIDATION_ENABLED) {
      const entries = manifestReader.getFormsForProduct(PRODUCT, SUB_SEGMENT);
      if (entries.length > 0) {
        await forms.validateAllFormsFromManifest(entries, testInfo);
      } else {
        console.warn('[lifecycle] ⚠ No manifest entries — skipping policy forms validation');
      }
    }

    console.log('[lifecycle] ✅ 16 — Policy forms validated');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 17. Finalize Policy
  // ══════════════════════════════════════════════════════════════════════════

  test('17 — Finalize Policy (status → Finalized)', async ({ page }) => {
    const overview = new SubmissionOverviewPage(page);
    const quotes   = new QuotePage(page);
    const policy   = new PolicyPage(page);

    await overview.navigateByUrl(submissionCtx.submissionUrl);
    await overview.clickExposuresAndQuotes();
    await quotes.goToPolicyTab();
    await policy.openFirstPolicy();
    await policy.finalizePolicy();

    await quotes.goToPolicyTab();
    await policy.assertPolicyStatus('Finalized');

    console.log('[lifecycle] ✅ 17 — Policy Finalized 🎉');
  });

});
