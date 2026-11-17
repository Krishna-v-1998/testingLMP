/**
 * SubmissionOverviewPage.ts
 *
 * Page Object for the Submission Overview / top-level submission page.
 * Handles navigation, top-bar assertions, and sidebar accordion expansion.
 */

import { type Locator, expect } from '@playwright/test';
import { BasePage }             from './base/BasePage';

export class SubmissionOverviewPage extends BasePage {

  // ── Navigation ─────────────────────────────────────────────────────────

  async navigateByUrl(url: string): Promise<void> {
    this.log(`Navigating to ${url}`);
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForDataLoaded(expectedNamedInsured?: string): Promise<void> {
    this.log('Waiting for submission data to load');
    // Wait for the top bar / named insured to appear
    if (expectedNamedInsured) {
      await expect(
        this.page.getByText(expectedNamedInsured, { exact: false }),
        `Named insured "${expectedNamedInsured}" should be visible`
      ).toBeVisible({ timeout: 30_000 });
    }
    await this.page.waitForLoadState('networkidle');
  }

  async waitForAnyDataLoaded(): Promise<void> {
    this.log('Waiting for any submission data to load');
    await this.page.waitForLoadState('networkidle');
  }

  /** Alias kept for compatibility with premium-booking spec */
  async waitUntilLoaded(): Promise<void> {
    await this.waitForAnyDataLoaded();
  }

  // ── Sidebar navigation ─────────────────────────────────────────────────

  async clickExposuresAndQuotes(): Promise<void> {
    this.log('Clicking Exposures & Quotes sidebar link');
    const link = this.page.getByRole('link', { name: /exposures\s*&?\s*quotes/i })
      .or(this.page.getByText(/exposures\s*&?\s*quotes/i).first());
    await link.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickBrokerInformationTab(): Promise<void> {
    this.log('Clicking Broker Information tab / link');
    const el = this.page.getByRole('tab', { name: /broker\s*information/i })
      .or(this.page.getByRole('link', { name: /broker\s*information/i }))
      .or(this.page.getByText(/broker\s*information/i).first());
    await el.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickGeneralInformation(): Promise<void> {
    this.log('Clicking General Information sidebar link');
    const el = this.page.getByRole('link', { name: /general\s*information/i })
      .or(this.page.getByText(/general\s*information/i).first());
    await el.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ── Status ─────────────────────────────────────────────────────────────

  async assertStatus(expected: string): Promise<void> {
    this.log(`Asserting submission status = "${expected}"`);
    const statusEl = this.page.getByText(expected, { exact: false }).first();
    await expect(statusEl, `Submission status should be "${expected}"`).toBeVisible({ timeout: 15_000 });
  }

  // ── Top-bar assertions ─────────────────────────────────────────────────

  async assertTopBarMatchesSubmissionData(data: {
    namedInsured?: string;
    submissionNumber?: string;
  }): Promise<void> {
    if (data.namedInsured) {
      await expect(
        this.page.getByText(data.namedInsured, { exact: false }).first(),
        `Named insured "${data.namedInsured}" should appear in top bar`
      ).toBeVisible();
    }
    if (data.submissionNumber) {
      await expect(
        this.page.getByText(data.submissionNumber, { exact: false }).first(),
        `Submission number "${data.submissionNumber}" should appear in top bar`
      ).toBeVisible();
    }
  }
}
