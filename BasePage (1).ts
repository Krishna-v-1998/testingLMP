/**
 * BasePage.ts  (re-export shim)
 *
 * Some page objects import BasePage from './BasePage' (same directory),
 * while LocationManagementPage imports from './base/BasePage'.
 *
 * This shim re-exports from the canonical location so both import paths work.
 */
export { BasePage } from './base/BasePage';
