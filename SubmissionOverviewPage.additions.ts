/**
 * SubmissionOverviewPage.additions.ts
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * HOW TO INTEGRATE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Add the items below into your EXISTING `src/pages/SubmissionOverviewPage.ts`.
 *
 *  STEP 1 — Add this locator to the class field declarations:
 *
 *     private readonly locationManagementLink: Locator;
 *
 *  STEP 2 — Add this line inside the constructor (after the other sidebar links):
 *
 *     this.locationManagementLink = page.locator('YOUR_LOCATION_MANAGEMENT_SIDEBAR_LINK');
 *
 *     ► Replace YOUR_LOCATION_MANAGEMENT_SIDEBAR_LINK with the actual selector.
 *       Right-click "Location Management" in the sidebar → Inspect
 *       and use its id/data-testid, e.g.:
 *         page.locator('[data-testid="nav-location-management"]')
 *         page.locator('a:has-text("Location Management")')
 *         page.locator('#location-management-link')
 *
 *  STEP 3 — Add this method to the class body:
 */

// ─── Copy this method into SubmissionOverviewPage ────────────────────────────

/*
  /**
   * Clicks "Location Management" in the sidebar to navigate to that page.
   *
   * USAGE:
   *   await submissionOverview.clickLocationManagement();
   *   await locationManagementPage.verifyPageLoaded();
   *\/
  async clickLocationManagement(): Promise<void> {
    await this.locationManagementLink.waitFor({ state: 'visible', timeout: 10_000 });
    await this.locationManagementLink.click();
    await this.page.waitForLoadState('networkidle');
    this.log('Navigated to Location Management');
  }
*/

// ─────────────────────────────────────────────────────────────────────────────
// SELECTOR DISCOVERY TIPS
// ─────────────────────────────────────────────────────────────────────────────
//
// Option A — exact id
//   page.locator('#sidebarLocationManagement')
//
// Option B — text content (last resort — fragile if text changes)
//   page.locator('a:has-text("Location Management")')
//
// Option C — data-testid (preferred)
//   page.locator('[data-testid="sidebar-location-management"]')
//
// Option D — parent section + child link
//   page.locator('.underwriting-file-section a:has-text("Location Management")')
//
// ─────────────────────────────────────────────────────────────────────────────
export {};  // makes this a module so TypeScript doesn't complain
