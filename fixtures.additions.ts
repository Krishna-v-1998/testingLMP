/**
 * fixtures.additions.ts
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * HOW TO INTEGRATE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Open your EXISTING `src/fixtures/index.ts` and apply the three changes below.
 *
 * ─── CHANGE 1: Add import ────────────────────────────────────────────────────
 *
 *   import { LocationManagementPage } from '../pages/LocationManagementPage';
 *
 * ─── CHANGE 2: Extend the MyFixtures type ────────────────────────────────────
 *
 *   In the `type MyFixtures = { ... }` block, add:
 *
 *     locationManagementPage: LocationManagementPage;
 *
 *   Example (existing fixtures shown for context):
 *
 *     type MyFixtures = {
 *       submissionOverview:     SubmissionOverviewPage;
 *       // ... other pages ...
 *       locationManagementPage: LocationManagementPage;   // ← ADD THIS
 *     };
 *
 * ─── CHANGE 3: Add the fixture factory ──────────────────────────────────────
 *
 *   Inside the `test.extend<MyFixtures>({ ... })` call, add:
 *
 *     locationManagementPage: async ({ authenticatedPage }, use) => {
 *       await use(new LocationManagementPage(authenticatedPage));
 *     },
 *
 *   IMPORTANT: use `authenticatedPage` (not `page`) — this keeps all fixtures
 *   sharing the same browser page instance, which is the established pattern
 *   in this framework.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FULL EXAMPLE (simplified fixtures/index.ts with the addition highlighted)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   import { test as base }              from '@playwright/test';
 *   import { SubmissionOverviewPage }    from '../pages/SubmissionOverviewPage';
 *   import { LocationManagementPage }    from '../pages/LocationManagementPage';  // ← NEW
 *   // ... other imports ...
 *
 *   type MyFixtures = {
 *     authenticatedPage:      Page;
 *     submissionOverview:     SubmissionOverviewPage;
 *     // ... other pages ...
 *     locationManagementPage: LocationManagementPage;                            // ← NEW
 *   };
 *
 *   export const test = base.extend<MyFixtures>({
 *
 *     authenticatedPage: async ({ browser }, use) => {
 *       const context = await browser.newContext({
 *         storageState: `storage-states/${Role.UW}.json`,
 *       });
 *       const page = await context.newPage();
 *       await use(page);
 *       await context.close();
 *     },
 *
 *     submissionOverview: async ({ authenticatedPage }, use) => {
 *       await use(new SubmissionOverviewPage(authenticatedPage));
 *     },
 *
 *     // ... other pages ...
 *
 *     locationManagementPage: async ({ authenticatedPage }, use) => {  // ← NEW BLOCK
 *       await use(new LocationManagementPage(authenticatedPage));
 *     },
 *
 *   });
 *
 *   export { expect } from '@playwright/test';
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */
export {};
