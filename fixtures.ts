/**
 * fixtures.ts
 *
 * Custom Playwright fixtures for the Allianz Insurance test framework.
 *
 * ── WHAT THIS FILE PROVIDES ───────────────────────────────────────────────────
 *
 *   Import `test` and `expect` from THIS file (not from @playwright/test)
 *   to get access to the extended fixtures:
 *
 *     import { test, expect } from '../../src/fixtures';
 *
 *   Available custom fixtures:
 *
 *   ┌──────────────────────┬──────────────────────────────────────────────────┐
 *   │ Fixture              │ Description                                      │
 *   ├──────────────────────┼──────────────────────────────────────────────────┤
 *   │ submissionOverview   │ SubmissionOverviewPage scoped to the current page │
 *   └──────────────────────┴──────────────────────────────────────────────────┘
 *
 * ── WHY EXTEND FIXTURES ───────────────────────────────────────────────────────
 *
 *   Playwright fixtures let us inject page objects into every test without
 *   boilerplate `new XxxPage(page)` calls, while still having the full
 *   lifecycle (setup / teardown) managed by Playwright.
 *
 * ── ADDING MORE PAGE OBJECTS ──────────────────────────────────────────────────
 *
 *   1. Import the page class below.
 *   2. Add a property to MyFixtures.
 *   3. Extend `test.extend<MyFixtures>({...})` with the new fixture.
 *
 *   Example:
 *
 *     quotePage: async ({ page }, use) => {
 *       await use(new QuotePage(page));
 *     },
 */

import { test as base, expect } from '@playwright/test';
import { SubmissionOverviewPage } from './pages/SubmissionOverviewPage';

// ── Fixture types ─────────────────────────────────────────────────────────────

type MyFixtures = {
  /**
   * A SubmissionOverviewPage scoped to the current test's `page`.
   *
   * Usage in a test:
   *   test('example', async ({ submissionOverview }) => {
   *     await submissionOverview.navigateByUrl(ctx.submissionUrl);
   *     await submissionOverview.clickExposuresAndQuotes();
   *   });
   */
  submissionOverview: SubmissionOverviewPage;
};

// ── Extended test object ──────────────────────────────────────────────────────

export const test = base.extend<MyFixtures>({

  submissionOverview: async ({ page }, use) => {
    await use(new SubmissionOverviewPage(page));
  },

  // ── Add more fixtures here ──────────────────────────────────────────────────
  //
  // quotePage: async ({ page }, use) => {
  //   await use(new QuotePage(page));
  // },
  //
  // formsPage: async ({ page }, use) => {
  //   await use(new FormsPage(page));
  // },

});

// Re-export expect so callers can import both from one place
export { expect };
