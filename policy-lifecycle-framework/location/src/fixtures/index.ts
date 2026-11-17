/**
 * fixtures/index.ts
 *
 * Playwright test fixture extensions.
 * Provides page-object fixtures so tests can receive them as function parameters.
 */

import { test as base, type Page } from '@playwright/test';
import { SubmissionOverviewPage }  from '../pages/SubmissionOverviewPage';

// ── Extended fixture types ─────────────────────────────────────────────────

type Fixtures = {
  submissionOverview: SubmissionOverviewPage;
};

// ── Extended test ──────────────────────────────────────────────────────────

export const test = base.extend<Fixtures>({
  submissionOverview: async ({ page }, use) => {
    await use(new SubmissionOverviewPage(page));
  },
});

export { expect } from '@playwright/test';
