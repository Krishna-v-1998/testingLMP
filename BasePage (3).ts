/**
 * BasePage.ts
 *
 * Abstract base class for all Page Objects.
 * Provides shared utilities: logging, waiting, element helpers.
 */

import { type Page, type Locator, expect } from '@playwright/test';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  // ── Logging ───────────────────────────────────────────────────────────────

  protected log(message: string): void {
    const name = this.constructor.name;
    console.log(`[${name}] ${message}`);
  }

  protected warn(message: string): void {
    const name = this.constructor.name;
    console.warn(`[${name}] ⚠ ${message}`);
  }

  // ── Wait helpers ──────────────────────────────────────────────────────────

  async waitForNetworkIdle(timeout = 30_000): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  async waitForDOMContentLoaded(timeout = 30_000): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded', { timeout });
  }

  /**
   * Waits for a locator to be visible with a sensible timeout.
   */
  async waitForVisible(locator: Locator, timeout = 15_000): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout });
  }

  /**
   * Waits for a locator to be hidden / removed.
   */
  async waitForHidden(locator: Locator, timeout = 15_000): Promise<void> {
    await locator.waitFor({ state: 'hidden', timeout });
  }

  // ── Interaction helpers ───────────────────────────────────────────────────

  /**
   * Clears an input then types the given value.
   */
  async clearAndFill(locator: Locator, value: string): Promise<void> {
    await locator.click({ clickCount: 3 });
    await locator.fill(value);
  }

  /**
   * Selects a dropdown option by label text.
   */
  async selectByLabel(locator: Locator, label: string): Promise<void> {
    await locator.selectOption({ label });
  }

  // ── Assertion helpers ─────────────────────────────────────────────────────

  async assertVisible(locator: Locator, description?: string): Promise<void> {
    await expect(locator, description).toBeVisible();
  }

  async assertHidden(locator: Locator, description?: string): Promise<void> {
    await expect(locator, description).toBeHidden();
  }

  async assertText(locator: Locator, text: string, description?: string): Promise<void> {
    await expect(locator, description).toContainText(text);
  }

  // ── Scroll helpers ────────────────────────────────────────────────────────

  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }

  async scrollIntoView(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
  }

  // ── Misc ──────────────────────────────────────────────────────────────────

  get url(): string {
    return this.page.url();
  }

  async navigate(url: string): Promise<void> {
    await this.page.goto(url);
    await this.waitForNetworkIdle();
  }

  /**
   * Returns true when the given locator exists in DOM (not necessarily visible).
   */
  async exists(locator: Locator): Promise<boolean> {
    return (await locator.count()) > 0;
  }
}
