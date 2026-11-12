/**
 * role.enum.ts
 *
 * User roles used throughout the Allianz / Unqork test framework.
 *
 * Each role corresponds to a saved browser storage-state file under
 * `storage-states/<role>.json`.  These files are created by an auth
 * setup script (e.g. `scripts/auth-setup.ts`) and store the browser's
 * cookies + localStorage so tests can skip the login screen.
 *
 * ── HOW STORAGE-STATE FILES ARE USED ─────────────────────────────────────
 *
 *   In playwright.config.ts:
 *
 *     projects: [
 *       {
 *         name: 'uw',
 *         use: {
 *           storageState: `storage-states/${Role.UW}.json`,
 *         },
 *       },
 *     ]
 *
 *   Or in a custom fixture (src/fixtures.ts):
 *
 *     const context = await browser.newContext({
 *       storageState: `storage-states/${Role.UW}.json`,
 *     });
 *
 * ── TO ADD A NEW ROLE ─────────────────────────────────────────────────────
 *
 *   1. Add the new value to the enum below.
 *   2. Create the matching storage-state file by running the auth-setup
 *      script with that role's credentials.
 *   3. Update playwright.config.ts if the role needs its own project.
 *
 * ─────────────────────────────────────────────────────────────────────────
 */

export enum Role {

  /**
   * Underwriter — the primary author role.
   * Most quote / binder / policy lifecycle tests run as this role.
   * Storage state: storage-states/uw.json
   */
  UW = 'uw',

  /**
   * Chief Underwriting Officer — approval / review role.
   * Used for Accounts Review approval tests and CUO-only actions.
   * Storage state: storage-states/cuo.json
   */
  CUO = 'cuo',

  /**
   * Broker — external user role.
   * Used for broker-portal / broker-visible tests.
   * Storage state: storage-states/broker.json
   */
  BROKER = 'broker',

  /**
   * Administrator — system-level role.
   * Used for admin-panel tests and configuration changes.
   * Storage state: storage-states/admin.json
   */
  ADMIN = 'admin',
}
