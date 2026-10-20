import { Page, Locator, expect } from '@playwright/test';
import { BasePage }               from './base/BasePage';
import { SubmissionFormData }     from '../types/submission.types';
import { WinsNumberOverviewInfo } from '../types/wins-number.types';
import { DateHelper }             from '../helpers/DateHelper';
import { UrlHelper }              from '../helpers/UrlHelper';
import { EnvironmentConfig }      from '../config/environment.config';

/**
 * SubmissionOverviewPage
 *
 * Handles the top bar (read-only summary) and sidebar navigation
 * of the submission detail page.
 *
 * DATA LOADING BEHAVIOUR (TWO PHASES):
 *
 *   Phase 1 — DOM renders (fast, ~200ms):
 *     Named Insured:  ""      or "None"  ← PLACEHOLDER
 *     Submission No:  ""      or "None"  ← PLACEHOLDER
 *     Status:         "Open"             ← this one loads immediately
 *
 *   Phase 2 — API responds (slow, 1-3 seconds):
 *     Named Insured:  "AUTOMATION-Aurora Enterprises"  ← REAL DATA
 *     Submission No:  "4061442121"                     ← REAL DATA
 *
 *   DO NOT ASSERT after Phase 1 — you will get placeholder values.
 *   ALWAYS call waitForDataLoaded(expectedNamedInsured) before asserting.
 *
 * WINS NUMBER AUTO-POPULATION:
 *   When a Wins Number is selected in Broker Information, some Overview
 *   top-bar fields (underwriter, current assignee, zone, broker) may
 *   update automatically. After selectWinsNumber() + networkidle, call
 *   assertAutoPopulatedFromWinsNumber() to verify those fields.
 *
 * SETUP REQUIRED: Replace all YOUR_*_SELECTOR with actual selectors.
 */
export class SubmissionOverviewPage extends BasePage {

  // ── Loading ────────────────────────────────────────────────────────────────
  private readonly pageLoadedIndicator:   Locator;

  // ── Top Bar Read-Only Fields ───────────────────────────────────────────────
  // All are span/div elements (innerText) not input fields
  private readonly namedInsuredValue:     Locator;
  private readonly submissionNoValue:     Locator;
  private readonly inceptionDateValue:    Locator;
  private readonly policyNumberValue:     Locator;
  private readonly underwriterValue:      Locator;
  private readonly currentAssigneeValue:  Locator;
  private readonly statusDropdown:        Locator;

  // ── NEW: Wins-Number-driven fields in the top bar ─────────────────────────
  // These update when a Wins Number is selected in Broker Information.
  // Replace selectors with actual DOM locators.
  private readonly zoneValue:             Locator;   // territory/zone from routing
  private readonly brokerDisplayValue:    Locator;   // broker name shown in top bar

  // ── Sidebar Navigation Links ──────────────────────────────────────────────
  private readonly generalInformationLink:  Locator;
  private readonly exposuresAndQuotesLink:  Locator;
  private readonly locationManagementLink:  Locator;
  private readonly manageReferralsLink:     Locator;

  // ── General Information Sub-tabs ──────────────────────────────────────────
  private readonly insuredInfoTab:  Locator;
  private readonly policyInfoTab:   Locator;
  private readonly brokerInfoTab:   Locator;

  constructor(page: Page) {
    super(page);

    this.pageLoadedIndicator  = page.locator('YOUR_PAGE_LOADED_INDICATOR_SELECTOR');

    // Top bar fields — all read-only display elements
    this.namedInsuredValue    = page.locator('YOUR_NAMED_INSURED_VALUE_SELECTOR');
    this.submissionNoValue    = page.locator('YOUR_SUBMISSION_NO_VALUE_SELECTOR');
    this.inceptionDateValue   = page.locator('YOUR_INCEPTION_DATE_VALUE_SELECTOR');
    this.policyNumberValue    = page.locator('YOUR_POLICY_NUMBER_VALUE_SELECTOR');
    this.underwriterValue     = page.locator('YOUR_UNDERWRITER_VALUE_SELECTOR');
    this.currentAssigneeValue = page.locator('YOUR_CURRENT_ASSIGNEE_VALUE_SELECTOR');
    this.statusDropdown       = page.locator('YOUR_STATUS_DROPDOWN_SELECTOR');

    // Wins-Number-driven top-bar fields — replace placeholders
    this.zoneValue            = page.locator('YOUR_ZONE_VALUE_SELECTOR');
    this.brokerDisplayValue   = page.locator('YOUR_BROKER_DISPLAY_VALUE_SELECTOR');

    // Sidebar
    this.generalInformationLink = page.locator('YOUR_GENERAL_INFORMATION_LINK_SELECTOR');
    this.exposuresAndQuotesLink = page.locator('YOUR_EXPOSURES_AND_QUOTES_LINK_SELECTOR');
    this.locationManagementLink = page.locator('YOUR_LOCATION_MANAGEMENT_LINK_SELECTOR');
    this.manageReferralsLink    = page.locator('YOUR_MANAGE_REFERRALS_LINK_SELECTOR');

    // General Information sub-tabs
    this.insuredInfoTab = page.locator('YOUR_INSURED_INFO_TAB_SELECTOR');
    this.policyInfoTab  = page.locator('YOUR_POLICY_INFO_TAB_SELECTOR');
    this.brokerInfoTab  = page.locator('YOUR_BROKER_INFO_TAB_SELECTOR');
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async navigate(displayId: string, metrixSubmissionId: string): Promise<void> {
    const config = EnvironmentConfig.getConfig();
    const url    = UrlHelper.buildSubmissionUrl(config.baseUrl, displayId, metrixSubmissionId);
    await this.page.goto(url);
    await this.page.waitForURL(
      (u) => UrlHelper.isSubmissionPage(u),
      { timeout: 30_000 },
    );
    await this.page.waitForLoadState('networkidle');
    this.log(`Navigated to submission | ${metrixSubmissionId}`);
  }

  async navigateByUrl(url: string): Promise<void> {
    await this.page.goto(url);
    await this.page.waitForURL(
      (u) => UrlHelper.isSubmissionPage(u),
      { timeout: 30_000 },
    );
    await this.page.waitForLoadState('networkidle');
    this.log(`Navigated by URL: ${url}`);
  }

  // ── Page Load — Phase 1 ────────────────────────────────────────────────────

  /**
   * Waits for the page DOM to be present.
   * Does NOT guarantee real data is loaded — call waitForDataLoaded() next.
   */
  async verifyPageLoaded(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.pageLoadedIndicator.waitFor({ state: 'visible', timeout: 15_000 });
    this.log('Submission page DOM loaded');
  }

  // ── Data Load — Phase 2 (THE KEY FIX) ─────────────────────────────────────

  /**
   * Waits for the REAL submission data to load in the Overview top bar.
   *
   * WHY THIS IS NEEDED:
   *   When a submission opens, the page renders immediately with placeholder values.
   *   Then an API call fetches the real data (Named Insured, Submission No etc.).
   *   This can take 1-3 seconds after the DOM is visible.
   *
   *   Without this wait:
   *     namedInsuredValue.innerText() → "" or "None"   ← WRONG (placeholder)
   *
   *   With this wait:
   *     namedInsuredValue.innerText() → "AUTOMATION-Aurora Enterprises" ← RIGHT
   *
   * HOW IT WORKS:
   *   We wait until the Named Insured field shows the EXACT expected value.
   *   This uses Playwright's built-in retry — it keeps checking every 100ms
   *   until the value appears or the timeout is reached (30 seconds).
   *
   * @param expectedNamedInsured - The exact Named Insured we expect to see.
   *                               Pass data.insured.namedInsured from your test.
   */
  async waitForDataLoaded(expectedNamedInsured: string): Promise<void> {
    this.log(`Waiting for Overview data to load... expecting: "${expectedNamedInsured}"`);

    // Playwright's expect() has built-in retry — it polls until the assertion passes.
    // This is the correct way to wait for dynamic content in Playwright.
    // Default retry interval: every 100ms until timeout.
    await expect(
      this.namedInsuredValue,
      `Named Insured should show "${expectedNamedInsured}" but still showing placeholder.\n` +
      `The API response is taking longer than expected.`
    ).toHaveText(expectedNamedInsured, { timeout: 30_000 });

    this.log(`Overview data loaded: "${expectedNamedInsured}"`);
  }

  /**
   * Use this when you don't know the exact expected value.
   * Waits until the Named Insured shows ANYTHING that's not a placeholder.
   *
   * Placeholders detected: "", "None", "-", "N/A", "Loading"
   */
  async waitForAnyDataLoaded(): Promise<void> {
    this.log('Waiting for Overview to load non-placeholder data...');

    // expect.poll() retries the function until it returns true or times out.
    // Use this when you need a custom condition (not a simple value match).
    await expect.poll(
      async () => {
        const text = (await this.namedInsuredValue.innerText()).trim();
        // Return true only when field has real data — not a placeholder
        const isPlaceholder = (
          text === '' ||
          text === 'None' ||
          text === '-' ||
          text === 'N/A' ||
          text.toLowerCase() === 'loading'
        );
        return !isPlaceholder;
      },
      {
        message: 'Named Insured field still showing placeholder value',
        timeout:   30_000,
        intervals: [200, 500, 1000, 2000],
      }
    ).toBeTruthy();

    this.log(`Overview data loaded: "${await this.getNamedInsured()}"`);
  }

  // ── Field Readers ──────────────────────────────────────────────────────────

  private async getFieldText(locator: Locator): Promise<string> {
    return (await locator.innerText()).trim();
  }

  async getNamedInsured():    Promise<string> { return this.getFieldText(this.namedInsuredValue);    }
  async getSubmissionNumber(): Promise<string> { return this.getFieldText(this.submissionNoValue);    }
  async getInceptionDate():   Promise<string> { return this.getFieldText(this.inceptionDateValue);   }
  async getPolicyNumber():    Promise<string> { return this.getFieldText(this.policyNumberValue);    }
  async getUnderwriter():     Promise<string> { return this.getFieldText(this.underwriterValue);     }
  async getCurrentAssignee(): Promise<string> { return this.getFieldText(this.currentAssigneeValue); }
  async getStatus():          Promise<string> { return this.getFieldText(this.statusDropdown);       }
  async getZone():            Promise<string> { return this.getFieldText(this.zoneValue);            }
  async getBrokerDisplay():   Promise<string> { return this.getFieldText(this.brokerDisplayValue);   }

  // ── Field Assertions ───────────────────────────────────────────────────────

  async assertNamedInsured(expected: string): Promise<void> {
    // toHaveText() retries automatically — no need for waitForDataLoaded before this
    // if you call assertNamedInsured directly with timeout: 30_000
    await expect(
      this.namedInsuredValue,
      `Named Insured: expected "${expected}"`
    ).toHaveText(expected, { timeout: 30_000 });
    this.log(`✅ Named Insured: ${expected}`);
  }

  async assertSubmissionNumber(expected: string): Promise<void> {
    await expect(
      this.submissionNoValue,
      `Submission No: expected "${expected}"`
    ).toHaveText(expected, { timeout: 15_000 });
    this.log(`✅ Submission No: ${expected}`);
  }

  async assertInceptionDate(expected: string): Promise<void> {
    await expect(
      this.inceptionDateValue,
      `Inception Date: expected "${expected}"`
    ).toHaveText(expected, { timeout: 15_000 });
    this.log(`✅ Inception Date: ${expected}`);
  }

  async assertPolicyNumber(expected: string = 'None'): Promise<void> {
    await expect(
      this.policyNumberValue,
      `Policy Number: expected "${expected}"`
    ).toHaveText(expected, { timeout: 15_000 });
    this.log(`✅ Policy Number: ${expected}`);
  }

  async assertDefaultStatus(): Promise<void> {
    await expect(
      this.statusDropdown,
      'Status should default to "Open"'
    ).toContainText('Open', { timeout: 15_000 });
    this.log('✅ Status: Open (default)');
  }

  async assertStatus(expected: string): Promise<void> {
    await expect(
      this.statusDropdown,
      `Status: expected "${expected}"`
    ).toContainText(expected, { timeout: 15_000 });
    this.log(`✅ Status: ${expected}`);
  }

  async assertUnderwriter(expected: string): Promise<void> {
    await expect(
      this.underwriterValue,
      `Underwriter: expected "${expected}"`
    ).toHaveText(expected, { timeout: 15_000 });
    this.log(`✅ Underwriter: ${expected}`);
  }

  async assertCurrentAssignee(expected: string): Promise<void> {
    await expect(
      this.currentAssigneeValue,
      `Current Assignee: expected "${expected}"`
    ).toHaveText(expected, { timeout: 15_000 });
    this.log(`✅ Current Assignee: ${expected}`);
  }

  async assertCurrentAssigneeMatchesUnderwriter(): Promise<void> {
    const uw = await this.getUnderwriter();
    const ca = await this.getCurrentAssignee();
    expect(ca, `Current Assignee "${ca}" must match Underwriter "${uw}"`).toBe(uw);
    this.log(`✅ Current Assignee matches Underwriter: ${uw}`);
  }

  async assertZone(expected: string): Promise<void> {
    await expect(
      this.zoneValue,
      `Zone: expected "${expected}"`
    ).toHaveText(expected, { timeout: 15_000 });
    this.log(`✅ Zone: ${expected}`);
  }

  async assertBrokerDisplay(expected: string): Promise<void> {
    await expect(
      this.brokerDisplayValue,
      `Broker (overview bar): expected "${expected}"`
    ).toHaveText(expected, { timeout: 15_000 });
    this.log(`✅ Broker display: ${expected}`);
  }

  // ── Sidebar Assertions ─────────────────────────────────────────────────────

  async assertSidebarVisible(): Promise<void> {
    await expect(this.generalInformationLink, 'General Information link').toBeVisible();
    await expect(this.exposuresAndQuotesLink, 'Exposures & Quotes link').toBeVisible();
    this.log('✅ Sidebar visible');
  }

  // ── Sidebar Navigation ─────────────────────────────────────────────────────

  async clickGeneralInformation(): Promise<void> {
    await this.generalInformationLink.click();
    await this.page.waitForLoadState('networkidle');
    this.log('Clicked General Information');
  }

  async clickExposuresAndQuotes(): Promise<void> {
    await this.exposuresAndQuotesLink.click();
    await this.page.waitForLoadState('networkidle');
    this.log('Clicked Exposures & Quotes');
  }

  async clickLocationManagement(): Promise<void> {
    await this.locationManagementLink.waitFor({ state: 'visible', timeout: 10_000 });
    await this.locationManagementLink.click();
    await this.page.waitForLoadState('networkidle');
    this.log('Navigated to Location Management');
  }

  // ── General Information Sub-tab Navigation ────────────────────────────────

  /**
   * Navigates to General Information → Insured Information tab.
   * After this, insuredInfoPage fixture is ready to use directly.
   */
  async clickInsuredInformationTab(): Promise<void> {
    await this.clickGeneralInformation();
    await this.insuredInfoTab.click();
    await this.page.waitForLoadState('networkidle');
    this.log('Clicked Insured Information tab');
  }

  /**
   * Navigates to General Information → Policy Information tab.
   * After this, policyInfoPage fixture is ready to use directly.
   */
  async clickPolicyInformationTab(): Promise<void> {
    await this.clickGeneralInformation();
    await this.policyInfoTab.click();
    await this.page.waitForLoadState('networkidle');
    this.log('Clicked Policy Information tab');
  }

  /**
   * Navigates to General Information → Broker Information tab.
   * After this, brokerInfoPage fixture is ready to use directly.
   */
  async clickBrokerInformationTab(): Promise<void> {
    await this.clickGeneralInformation();
    await this.brokerInfoTab.click();
    await this.page.waitForLoadState('networkidle');
    this.log('Clicked Broker Information tab');
  }

  // ── Combined Assertions ─────────────────────────────────────────────────────

  async assertTopBarMatchesSubmissionData(data: SubmissionFormData): Promise<void> {
    this.log('--- Asserting Overview top bar ---');
    // Each assertion uses toHaveText() which has built-in retry
    // No need to call waitForDataLoaded() separately — these wait internally
    await this.assertNamedInsured(data.insured.namedInsured);
    await this.assertSubmissionNumber(data.submissionNumber);
    await this.assertInceptionDate(data.inceptionDate);
    await this.assertPolicyNumber('None');
    await this.assertDefaultStatus();
    await this.assertCurrentAssigneeMatchesUnderwriter();
    await this.assertSidebarVisible();
    this.log('--- Overview top bar verified ✅ ---');
  }

  /**
   * Verifies the Overview top-bar fields that update when a Wins Number is selected.
   *
   * WHY THIS IS NEEDED:
   *   Selecting a Wins Number in Broker Information triggers an auto-population
   *   of routing-derived fields in the Submission Overview top bar.
   *   Call this AFTER selectWinsNumber() + networkidle to confirm the update.
   *
   * WHY OPTIONAL FIELDS:
   *   Not every routing entry changes every field. For example, some Wins Numbers
   *   may not change the zone or broker display. Fields set to undefined are skipped.
   *
   * Usage:
   *   const entry = UnderwritingRouting.getByWinsNumber('WIN-2024-001');
   *   await brokerInfoPage.selectWinsNumber(entry.winsNumber);
   *   // navigate back to overview or it auto-refreshes:
   *   await submissionOverviewPage.assertAutoPopulatedFromWinsNumber(entry.overviewInfo);
   *
   * @param data - overviewInfo from the matching UnderwritingRouting entry
   */
  async assertAutoPopulatedFromWinsNumber(data: WinsNumberOverviewInfo): Promise<void> {
    this.log('--- Verifying Submission Overview auto-population from Wins Number ---');

    if (data.underwriter !== undefined) {
      await this.assertUnderwriter(data.underwriter);
    }

    if (data.currentAssignee !== undefined) {
      await this.assertCurrentAssignee(data.currentAssignee);
    } else if (data.underwriter !== undefined) {
      // If only underwriter is given, currentAssignee should still mirror it
      await this.assertCurrentAssigneeMatchesUnderwriter();
    }

    if (data.zone !== undefined) {
      await this.assertZone(data.zone);
    }

    if (data.broker !== undefined) {
      await this.assertBrokerDisplay(data.broker);
    }

    this.log('--- Submission Overview (Wins Number auto-population) verified ✅ ---');
  }

  async getPageTitle(): Promise<string> { return this.page.title(); }
}
