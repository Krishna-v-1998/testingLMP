/**
 * SubmissionSetupService.ts
 *
 * Creates (or reuses) a submission context for E2E tests.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────────
 *
 *   Most spec files need a submission to already exist before the first test
 *   runs — navigating to a fresh submission URL and then testing quota
 *   creation is the starting point for virtually every flow.
 *
 *   This service:
 *     1. Opens a browser context authenticated as the given role.
 *     2. Navigates to the base URL.
 *     3. Creates a new submission via the UI (or reuses a cached one).
 *     4. Returns a SubmissionContext with all relevant IDs + URL.
 *
 *   The SubmissionContext is stored in a module-level cache inside this file.
 *   Multiple calls with the same role and options return the same context
 *   (by default) so spec files that call this in beforeAll don't repeat the
 *   expensive creation step.
 *
 * ── USAGE ─────────────────────────────────────────────────────────────────────
 *
 *   // In beforeAll:
 *   let ctx: SubmissionContext;
 *
 *   test.beforeAll(async ({ browser }) => {
 *     ctx = await SubmissionSetupService.createAndStoreContext(browser, Role.UW);
 *   });
 *
 *   // In tests — navigate to it:
 *   await page.goto(ctx.submissionUrl);
 *
 * ── PLACEHOLDER STATUS ────────────────────────────────────────────────────────
 *
 *   The navigation selectors inside _createNewSubmission() are PLACEHOLDER.
 *   The real steps depend on how the Allianz / Unqork app creates a submission:
 *
 *     • Is there a "New Submission" button on a dashboard?
 *     • Or is a submission URL given to you upfront?
 *     • Does creation happen via API (faster) or UI only?
 *
 *   Update _createNewSubmission() with real selectors once you inspect the app.
 *   Until then, you can override via SUBMISSION_URL and SUBMISSION_ID env vars
 *   (see the env-var shortcut below).
 */

import { type Browser, type BrowserContext, type Page } from '@playwright/test';
import { Role }                                           from '../enums/role.enum';
import { SubmissionContext, SubmissionCreateOptions }     from '../types/submission.types';

// ── In-memory cache ───────────────────────────────────────────────────────────

/**
 * Cache keyed by `${role}::${label ?? 'default'}`.
 * Prevents redundant submission creation across beforeAll calls in the same
 * worker process.
 */
const contextCache = new Map<string, SubmissionContext>();

// ── Service ───────────────────────────────────────────────────────────────────

export class SubmissionSetupService {

  /**
   * Creates a new submission (or returns a cached one) and returns its context.
   *
   * @param browser  The Playwright Browser from the `browser` fixture.
   * @param role     Which role's storage state to use (default: Role.UW).
   * @param options  Optional creation settings.
   */
  static async createAndStoreContext(
    browser: Browser,
    role: Role = Role.UW,
    options: SubmissionCreateOptions = {},
  ): Promise<SubmissionContext> {
    const cacheKey = `${role}::${options.label ?? 'default'}`;

    // ── Return cached context unless caller wants a fresh one ────────────────
    if (options.reuseExisting !== false && contextCache.has(cacheKey)) {
      const cached = contextCache.get(cacheKey)!;
      console.log(`[SubmissionSetupService] Reusing cached context: ${cached.submissionId}`);
      return cached;
    }

    // ── Env-var shortcut ──────────────────────────────────────────────────────
    //
    //   Set SUBMISSION_URL and SUBMISSION_ID in .env (or as shell exports) to
    //   skip UI creation entirely.  Useful when you already have a known
    //   submission from a previous session.
    //
    //   SUBMISSION_URL=https://allianz-qa.unqork.io/app/metrix-ui/#/display/abc?metrixSubmissionId=99
    //   SUBMISSION_ID=99
    //
    if (process.env['SUBMISSION_URL'] && process.env['SUBMISSION_ID']) {
      const ctx: SubmissionContext = {
        submissionId:  process.env['SUBMISSION_ID'],
        submissionUrl: process.env['SUBMISSION_URL'],
        role,
        createdAt: new Date().toISOString(),
        label: options.label,
      };
      console.log(`[SubmissionSetupService] Using env-var submission: ${ctx.submissionId}`);
      contextCache.set(cacheKey, ctx);
      return ctx;
    }

    // ── Create via UI ─────────────────────────────────────────────────────────
    const storageStatePath = `storage-states/${role}.json`;
    let context: BrowserContext | null = null;

    try {
      context = await browser.newContext({ storageState: storageStatePath });
      const page  = await context.newPage();
      const ctx   = await SubmissionSetupService._createNewSubmission(page, role, options);

      contextCache.set(cacheKey, ctx);
      console.log(`[SubmissionSetupService] Created submission: ${ctx.submissionId} (${ctx.submissionUrl})`);
      return ctx;

    } finally {
      // Close the setup context — tests will open their own contexts via fixtures
      if (context) await context.close();
    }
  }

  /**
   * Clears the in-memory cache.
   * Call this if you want the next test run to create a fresh submission
   * even within the same worker process.
   */
  static clearCache(): void {
    contextCache.clear();
  }

  /**
   * Returns the cached context for a role + label, or undefined if none.
   */
  static getCached(role: Role, label?: string): SubmissionContext | undefined {
    return contextCache.get(`${role}::${label ?? 'default'}`);
  }

  // ── Private: UI creation flow ─────────────────────────────────────────────

  /**
   * Navigates through the app to create a new submission and returns its context.
   *
   * ── PLACEHOLDER ───────────────────────────────────────────────────────────
   *
   *   Replace every // PLACEHOLDER comment with the real Playwright steps
   *   after inspecting the live Allianz / Unqork app.
   *
   *   Typical steps (adjust for your app):
   *   1. Navigate to base URL / dashboard
   *   2. Click "New Submission" or "Create Submission"
   *   3. Fill minimal required fields (account name, effective date, etc.)
   *   4. Click "Create" / "Save"
   *   5. Wait for redirect to submission detail page
   *   6. Extract submission ID from URL or page content
   *   7. Build and return SubmissionContext
   */
  private static async _createNewSubmission(
    page: Page,
    role: Role,
    options: SubmissionCreateOptions,
  ): Promise<SubmissionContext> {
    const baseUrl = process.env['BASE_URL'] ?? 'https://allianz-qa-subhubplus-uatx.unqork.io';

    // ── Step 1: Go to dashboard ───────────────────────────────────────────
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');

    // ── Step 2: Click "New Submission" ────────────────────────────────────
    // PLACEHOLDER: adjust selector to match the real button in your app
    await page.getByRole('button', { name: /new submission/i }).click();     // PLACEHOLDER
    await page.waitForLoadState('networkidle');

    // ── Step 3: Fill required fields ──────────────────────────────────────
    // PLACEHOLDER: fill whatever fields are required to create a submission
    // e.g. account name, submission type, broker, etc.
    // await page.getByLabel('Account Name').fill('Test Account E2E');         // PLACEHOLDER
    // await page.getByLabel('Submission Type').selectOption('Construction');  // PLACEHOLDER

    // ── Step 4: Save / Create ─────────────────────────────────────────────
    // PLACEHOLDER: click the submit / create button
    // await page.getByRole('button', { name: /create|save/i }).click();       // PLACEHOLDER
    // await page.waitForLoadState('networkidle');

    // ── Step 5: Extract submission ID from URL ────────────────────────────
    // After creation the app typically redirects to a URL containing the
    // submission ID as a query param or path segment.
    // e.g. https://.../#/display/ABC123?metrixSubmissionId=99999
    const url          = page.url();
    const urlParams    = new URL(url.replace('#', '?url=').split('?url=')[1] ?? url);
    const submissionId =
      urlParams.searchParams.get('metrixSubmissionId') ??   // common Unqork pattern
      url.match(/\/display\/([^?#]+)/)?.[1] ??              // path segment fallback
      'UNKNOWN';                                             // should never happen

    return {
      submissionId,
      submissionUrl: url,
      role,
      createdAt: new Date().toISOString(),
      label: options.label,
    };
  }
}
