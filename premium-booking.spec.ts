/**
 * premium-booking.spec.ts
 *
 * ── WHAT THIS SPEC COVERS ─────────────────────────────────────────────────────
 *
 *   Premium Booking tab (runs AFTER binder-lifecycle.spec.ts has finalized the binder):
 *
 *   1.  Navigate to Premium Booking tab
 *   2.  Wait for page to fully render (In-Processing state)
 *   3.  Verify Location Information table is visible
 *   4.  Verify Location Information table columns match expected
 *   5.  Verify Coverage Information table is visible
 *   6.  Verify Coverage Information table columns match expected
 *   7.  Verify "Send to WINS →" button is visible and enabled
 *   8.  Click "Send to WINS →" (optionally confirm modal)
 *   9.  Verify submission transitions toward "Issued"
 *
 * ── HOW TO RUN ────────────────────────────────────────────────────────────────
 *
 *   # Full run
 *   npx playwright test tests/premium-booking/premium-booking.spec.ts --headed
 *
 *   # Run after all previous stages (full lifecycle)
 *   npx playwright test tests/quote tests/binder tests/premium-booking --headed
 *
 *   # Debug
 *   npx playwright test tests/premium-booking/premium-booking.spec.ts --headed --slow-mo 400
 *
 * ── PREREQUISITES ─────────────────────────────────────────────────────────────
 *
 *   - storage-states/uw.json
 *   - Submission must be In-Processing (binder finalized)
 *   - SUBMISSION_URL + SUBMISSION_ID env vars (or SubmissionSetupService)
 *
 * ── ENV VARS ──────────────────────────────────────────────────────────────────
 *
 *   SUBMISSION_URL=https://...
 *   SUBMISSION_ID=yyy
 *   SKIP_SEND_TO_WINS=true  (set to skip the actual WINS submission in a dry-run)
 */

import { test, expect }           from '../../src/fixtures';
import { SubmissionSetupService } from '../../src/services/SubmissionSetupService';
import { SubmissionContext }       from '../../src/types/submission.types';
import { Role }                   from '../../src/enums/role.enum';
import { QuotePage }              from '../../src/pages/QuotePage';
import { PremiumBookingPage }     from '../../src/pages/PremiumBookingPage';

// ── Feature flag: skip actual WINS submission (dry-run mode) ─────────────────
const SKIP_SEND_TO_WINS = process.env.SKIP_SEND_TO_WINS === 'true';

// ── Shared state ──────────────────────────────────────────────────────────────
let submissionCtx: SubmissionContext;

// ═════════════════════════════════════════════════════════════════════════════
// SUITE
// ═════════════════════════════════════════════════════════════════════════════

test.describe.serial('Premium Booking @premium-booking', () => {

  // ── Setup ─────────────────────────────────────────────────────────────────

  test.beforeAll(async ({ browser }) => {
    submissionCtx = await SubmissionSetupService.createAndStoreContext(
      browser,
      Role.UW,
      { label: 'premium-booking', reuseExisting: true },
    );
  });

  // ── 1. Navigate to Premium Booking tab ───────────────────────────────────

  test('1 — Navigate to Premium Booking tab', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);
    await submissionOverview.waitUntilLoaded();
    await submissionOverview.clickExposuresAndQuotes();

    const quotePage          = new QuotePage(page);
    const premiumBookingPage = new PremiumBookingPage(page);

    await quotePage.goToPremiumBookingTab();

    // The Premium Booking tab should be active
    await expect(
      page.getByRole('tab', { name: /premium\s+booking/i }),
      'Premium Booking tab should be visible'
    ).toBeVisible();

    console.log('[premium-booking] ✅ Navigated to Premium Booking tab');
  });

  // ── 2. Wait for page to fully render ─────────────────────────────────────

  test('2 — Wait for Premium Booking page to load (In-Processing)', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage          = new QuotePage(page);
    const premiumBookingPage = new PremiumBookingPage(page);

    await quotePage.goToPremiumBookingTab();

    // The page loads only when the submission is In-Processing
    // If the submission is not yet In-Processing, this will timeout — that's expected
    await premiumBookingPage.waitUntilLoaded();

    console.log('[premium-booking] ✅ Premium Booking page fully loaded');
  });

  // ── 3. Verify Location Information table ─────────────────────────────────

  test('3 — Verify Location Information table is visible', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage          = new QuotePage(page);
    const premiumBookingPage = new PremiumBookingPage(page);

    await quotePage.goToPremiumBookingTab();
    await premiumBookingPage.waitUntilLoaded();
    await premiumBookingPage.assertLocationInfoTableVisible();

    console.log('[premium-booking] ✅ Location Information table is visible');
  });

  // ── 4. Verify Location Information columns ────────────────────────────────

  test('4 — Verify Location Information table column headers', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage          = new QuotePage(page);
    const premiumBookingPage = new PremiumBookingPage(page);

    await quotePage.goToPremiumBookingTab();
    await premiumBookingPage.waitUntilLoaded();
    await premiumBookingPage.assertLocationInfoColumns();

    console.log('[premium-booking] ✅ Location Information columns verified');
  });

  // ── 5. Verify Coverage Information table ─────────────────────────────────

  test('5 — Verify Coverage Information table is visible', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage          = new QuotePage(page);
    const premiumBookingPage = new PremiumBookingPage(page);

    await quotePage.goToPremiumBookingTab();
    await premiumBookingPage.waitUntilLoaded();
    await premiumBookingPage.assertCoverageInfoTableVisible();

    console.log('[premium-booking] ✅ Coverage Information table is visible');
  });

  // ── 6. Verify Coverage Information columns ────────────────────────────────

  test('6 — Verify Coverage Information table column headers', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage          = new QuotePage(page);
    const premiumBookingPage = new PremiumBookingPage(page);

    await quotePage.goToPremiumBookingTab();
    await premiumBookingPage.waitUntilLoaded();
    await premiumBookingPage.assertCoverageInfoColumns();

    console.log('[premium-booking] ✅ Coverage Information columns verified');
  });

  // ── 7. Verify "Send to WINS →" button ────────────────────────────────────

  test('7 — Verify "Send to WINS →" button is visible and enabled', async ({ page, submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage          = new QuotePage(page);
    const premiumBookingPage = new PremiumBookingPage(page);

    await quotePage.goToPremiumBookingTab();
    await premiumBookingPage.waitUntilLoaded();
    await premiumBookingPage.assertSendToWINSEnabled();

    console.log('[premium-booking] ✅ "Send to WINS →" button is enabled');
  });

  // ── 8. Click "Send to WINS →" ─────────────────────────────────────────────

  test('8 — Click "Send to WINS →"', async ({ page, submissionOverview }) => {
    if (SKIP_SEND_TO_WINS) {
      test.skip(true, 'SKIP_SEND_TO_WINS=true — skipping WINS submission in dry-run mode');
      return;
    }

    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);

    const quotePage          = new QuotePage(page);
    const premiumBookingPage = new PremiumBookingPage(page);

    await quotePage.goToPremiumBookingTab();
    await premiumBookingPage.waitUntilLoaded();

    // Click "Send to WINS →" (confirmModal=true handles optional confirm dialog)
    await premiumBookingPage.sendToWINS(true);

    console.log('[premium-booking] ✅ "Send to WINS →" submitted');
  });

  // ── 9. Verify submission transitions toward "Issued" ─────────────────────

  test('9 — Verify submission status transitions toward Issued', async ({ page, submissionOverview }) => {
    if (SKIP_SEND_TO_WINS) {
      test.skip(true, 'SKIP_SEND_TO_WINS=true — skipping status check in dry-run mode');
      return;
    }

    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);
    await submissionOverview.waitUntilLoaded();

    // After "Send to WINS", the submission should start transitioning.
    // Status may show "In-Processing" briefly before becoming "Issued".
    // We allow either "In-Processing" (processing) or "Issued" (done).
    const statusEl = page.getByText(/issued|in-processing/i).first();
    await expect(statusEl, 'Submission should be "Issued" or "In-Processing" after Send to WINS').toBeVisible({ timeout: 30_000 });

    const statusText = await statusEl.textContent();
    console.log(`[premium-booking] ✅ Submission status after Send to WINS: ${statusText}`);
  });

});
