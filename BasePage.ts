/**
 * BasePage.ts
 *
 * Abstract base class for all Page Objects in this framework.
 *
 * Every page object that represents a screen in the Allianz / Unqork app
 * should extend this class.  It provides:
 *
 *   • `this.page`  — the Playwright `Page` instance
 *   • `this.log()` — a tagged console helper for debug output
 *
 * ── USAGE ────────────────────────────────────────────────────────────────────
 *
 *   import { BasePage } from './base/BasePage';
 *
 *   export class MyPage extends BasePage {
 *     constructor(page: Page) {
 *       super(page);
 *     }
 *   }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { type Page } from '@playwright/test';

export abstract class BasePage {

  /** The Playwright Page instance shared across this page object. */
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LOGGING
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Tagged console log scoped to the concrete class name.
   *
   * Output is only visible when Playwright is run with `--reporter=line` or
   * `--reporter=verbose`, or when `DEBUG=true` / `PW_TEST_DEBUG_MODE=1`.
   *
   * Usage:
   *   this.log('Navigated to Forms tab');
   *   this.log('Filled Hard Costs:', value);
   */
  protected log(message: string, ...args: unknown[]): void {
    const tag = `[${this.constructor.name}]`;
    console.log(tag, message, ...args);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // COMMON WAIT HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Waits for the page network to be fully idle (no pending requests).
   * Use after navigation or form submission to ensure the page has settled.
   */
  async waitForNetworkIdle(timeout = 15_000): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Waits for the DOM to be fully loaded.
   * Lighter than waitForNetworkIdle — use after lightweight interactions.
   */
  async waitForDomContentLoaded(timeout = 10_000): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded', { timeout });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // NAVIGATION HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Navigates directly to a URL and waits for network idle.
   *
   * @param url — Full URL, e.g. 'https://app.example.com/submission/123456'
   */
  async navigateByUrl(url: string): Promise<void> {
    this.log(`Navigating to: ${url}`);
    await this.page.goto(url, { waitUntil: 'networkidle' });
  }

  /**
   * Waits until the page is fully loaded (networkidle + DOM).
   * Override in subclasses to add page-specific assertions (e.g. heading visible).
   */
  async waitUntilLoaded(timeout = 20_000): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout });
  }
}
