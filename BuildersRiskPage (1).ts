/**
 * BuildersRiskPage.ts
 *
 * Page Object for the Builder's Risk (BR) sub-segment product tab content.
 *
 * ── LIFECYCLE POSITION ──────────────────────────────────────────────────────
 *
 *   Quote Details page → BR-1 product tab selected
 *                         ↑
 *                       here
 *
 * ── RESPONSIBILITY SPLIT ────────────────────────────────────────────────────
 *
 *   QuoteDetailsPage  — navigation tabs, product tab management, coverage
 *                       structure radio, Save / Next / Previous buttons,
 *                       General Quote Information header fields
 *
 *   BuildersRiskPage  — fields that appear INSIDE the BR-1 product tab:
 *                         • Exposure Information (per-location)
 *                         • Limits & Deductibles (policy-level)
 *                         • Premium Summary (read-only assertions)
 *
 * ── USAGE IN A SPEC ─────────────────────────────────────────────────────────
 *
 *   const qdp = new QuoteDetailsPage(page);
 *   const br  = new BuildersRiskPage(page);
 *
 *   // Navigate to the BR product tab first
 *   await qdp.clickProductTab('BR-1');
 *
 *   // Fill BR-specific fields
 *   await br.fillExposureInformation({
 *     hardCosts:               '500000',
 *     softCosts:               '50000',
 *     existingBuilding:        'No',
 *   });
 *   await br.fillLimitsAndDeductibles({
 *     amtOneConstructionSiteLimit: '1000000',
 *     amtDeductibleAllOtherPerils: '10000',
 *     coinsurance:                 '90%',
 *   });
 *   await qdp.save();
 *
 *   // Assert computed premium values
 *   await br.assertPremiumSummary({ totalPremium: '25,000' });
 *
 * ── LOCATOR STATUS ──────────────────────────────────────────────────────────
 *
 *   All locators are marked PLACEHOLDER.  Replace each one after inspecting
 *   the live DOM with DevTools.  The app is built on Unqork (no-code), so
 *   DOM IDs are auto-generated — prefer:
 *     1. getByLabel('HARD COSTS', { exact: false })
 *     2. getByRole('spinbutton', { name: '...' })
 *     3. locator('[data-key="hardCosts"]')
 *
 * ── LOCATOR NAMING CONVENTION ───────────────────────────────────────────────
 *
 *   field*  — text / number / date input
 *   dropdown* — select element
 *   radio*  — radio button
 *   btn*    — action button
 */

import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage }                         from './BasePage';
import {
  BuildersRiskExposureData,
  BuildersRiskLimitsData,
  BuildersRiskPremiumSummary,
  BuildersRiskData,
} from '../types/builders-risk.types';

export class BuildersRiskPage extends BasePage {

  // ══════════════════════════════════════════════════════════════════════════
  // EXPOSURE INFORMATION
  // These fields appear in the Exposure Information section under the
  // Locations table when the BR-1 product tab is active.
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * HARD COSTS — primary insured construction value.
   * Typically a currency input.
   * PLACEHOLDER: update locator after DOM inspection.
   */
  get fieldHardCosts(): Locator {
    return this.page.getByLabel('Hard Costs', { exact: false })
      .or(this.page.getByLabel('HARD COSTS', { exact: false }));
  }

  /**
   * SOFT COSTS — architect fees, permits, etc.
   * PLACEHOLDER
   */
  get fieldSoftCosts(): Locator {
    return this.page.getByLabel('Soft Costs', { exact: false })
      .or(this.page.getByLabel('SOFT COSTS', { exact: false }));
  }

  /**
   * TESTING PERIOD — number of months for commissioning / testing.
   * PLACEHOLDER
   */
  get fieldTestingPeriod(): Locator {
    return this.page.getByLabel('Testing Period', { exact: false })
      .or(this.page.getByLabel('TESTING PERIOD', { exact: false }));
  }

  /**
   * DELAY IN COMPLETION — coverage for consequential loss from delays.
   * PLACEHOLDER
   */
  get fieldDelayInCompletion(): Locator {
    return this.page.getByLabel('Delay in Completion', { exact: false })
      .or(this.page.getByLabel('DELAY IN COMPLETION', { exact: false }));
  }

  /**
   * EXISTING BUILDING — Yes / No dropdown.
   * PLACEHOLDER
   */
  get dropdownExistingBuilding(): Locator {
    return this.page.getByLabel('Existing Building', { exact: false })
      .or(this.page.getByLabel('EXISTING BUILDING', { exact: false }));
  }

  /**
   * EXISTING BUILDING LIMIT — appears only when Existing Building = 'Yes'.
   * PLACEHOLDER
   */
  get fieldExistingBuildingLimit(): Locator {
    return this.page.getByLabel('Existing Building Limit', { exact: false })
      .or(this.page.getByLabel('EXISTING BUILDING LIMIT', { exact: false }));
  }

  /**
   * EXISTING CONST CLASS — construction class of existing building.
   * Appears only when Existing Building = 'Yes'.
   * PLACEHOLDER
   */
  get dropdownExistingBuildingConstClass(): Locator {
    return this.page.getByLabel('Existing Building Const Class', { exact: false })
      .or(this.page.getByLabel('EXISTING CONST CLASS', { exact: false }));
  }

  /**
   * EARNINGS — loss of earnings / delay in start-up limit.
   * PLACEHOLDER
   */
  get fieldEarnings(): Locator {
    return this.page.getByLabel('Earnings', { exact: false })
      .or(this.page.getByLabel('EARNINGS', { exact: false }));
  }

  /**
   * RENTAL VALUE — rental income loss limit.
   * PLACEHOLDER
   */
  get fieldRentalValue(): Locator {
    return this.page.getByLabel('Rental Value', { exact: false })
      .or(this.page.getByLabel('RENTAL VALUE', { exact: false }));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LIMITS & DEDUCTIBLES
  // These appear below the Locations table / Exposure Information section.
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * AMT ONE CONSTRUCTION SITE LIMIT
   * PLACEHOLDER
   */
  get fieldAmtOneConstructionSiteLimit(): Locator {
    return this.page.getByLabel('AMT ONE CONSTRUCTION SITE LIMIT', { exact: false })
      .or(this.page.getByLabel('Amt One Construction Site Limit', { exact: false }));
  }

  /**
   * AMT ONE OCCURRENCE LIMIT
   * PLACEHOLDER
   */
  get fieldAmtOneOccurrenceLimit(): Locator {
    return this.page.getByLabel('AMT ONE OCCURRENCE LIMIT', { exact: false })
      .or(this.page.getByLabel('Amt One Occurrence Limit', { exact: false }));
  }

  /**
   * TEMPORARY LOCATIONS LIMIT
   * PLACEHOLDER
   */
  get fieldTemporaryLocationsLimit(): Locator {
    return this.page.getByLabel('TEMPORARY LOCATIONS LIMIT', { exact: false })
      .or(this.page.getByLabel('Temporary Locations Limit', { exact: false }));
  }

  /**
   * TRANSIT UNIT — maximum per-unit transit limit.
   * PLACEHOLDER
   */
  get fieldTransitUnit(): Locator {
    return this.page.getByLabel('TRANSIT UNIT', { exact: false })
      .or(this.page.getByLabel('Transit Unit', { exact: false }));
  }

  /**
   * AMT DEDUCTIBLE ALL OTHER PERILS
   * PLACEHOLDER
   */
  get fieldAmtDeductibleAllOtherPerils(): Locator {
    return this.page.getByLabel('AMT DEDUCTIBLE ALL OTHER PERILS', { exact: false })
      .or(this.page.getByLabel('Amt Deductible All Other Perils', { exact: false }));
  }

  /**
   * COINSURANCE — percentage dropdown.
   * PLACEHOLDER
   */
  get dropdownCoinsurance(): Locator {
    return this.page.getByLabel('COINSURANCE', { exact: false })
      .or(this.page.getByLabel('Coinsurance', { exact: false }));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PREMIUM SUMMARY (read-only computed fields)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * TRIA % field inside the premium summary section.
   * PLACEHOLDER
   */
  get fieldTriaPct(): Locator {
    return this.page.getByLabel('TRIA %', { exact: false })
      .or(this.page.getByLabel('TRIA%', { exact: false }));
  }

  /**
   * COMMISSION dropdown — set by UW; affects net premium.
   * PLACEHOLDER
   */
  get dropdownCommission(): Locator {
    return this.page.getByLabel('Commission', { exact: false });
  }

  /**
   * TOTAL PREMIUM (before TRIA) — read-only computed.
   * PLACEHOLDER
   */
  get fieldTotalPremium(): Locator {
    return this.page.getByLabel('TOTAL PREMIUM', { exact: false })
      .or(this.page.locator('[aria-label*="Total Premium"]'));
  }

  /**
   * TRIA PREMIUM — read-only computed.
   * PLACEHOLDER
   */
  get fieldTriaPremium(): Locator {
    return this.page.getByLabel('TRIA PREMIUM', { exact: false });
  }

  /**
   * TOTAL PREMIUM INCLUDING TRIA — read-only computed.
   * PLACEHOLDER
   */
  get fieldTotalPremiumWithTria(): Locator {
    return this.page.getByLabel('TOTAL PREMIUM INCLUDING TRIA', { exact: false });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION HEADERS / VISIBILITY CHECKS
  // Use these to assert the page is in the right state before filling.
  // ══════════════════════════════════════════════════════════════════════════

  get sectionExposureInformation(): Locator {
    return this.page.getByText('Exposure Information', { exact: false });
  }

  get sectionLimitsAndDeductibles(): Locator {
    return this.page.getByText('Limits & Deductibles', { exact: false })
      .or(this.page.getByText('Limits and Deductibles', { exact: false }));
  }

  get sectionPremiumSummary(): Locator {
    return this.page.getByText('Premium Summary', { exact: false });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HIGH-LEVEL ACTIONS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Fills the Exposure Information section for the BR-1 tab.
   *
   * Fields are filled only when their value is provided in `data`.
   * Handles the conditional Existing Building / Limit / ConstClass flow.
   */
  async fillExposureInformation(data: BuildersRiskExposureData): Promise<void> {
    this.log('Filling Builder\'s Risk Exposure Information');

    if (data.hardCosts !== undefined) {
      await this.fieldHardCosts.clear();
      await this.fieldHardCosts.fill(data.hardCosts);
    }

    if (data.softCosts !== undefined) {
      await this.fieldSoftCosts.clear();
      await this.fieldSoftCosts.fill(data.softCosts);
    }

    if (data.testingPeriod !== undefined) {
      await this.fieldTestingPeriod.clear();
      await this.fieldTestingPeriod.fill(data.testingPeriod);
    }

    if (data.delayInCompletion !== undefined) {
      await this.fieldDelayInCompletion.clear();
      await this.fieldDelayInCompletion.fill(data.delayInCompletion);
    }

    if (data.existingBuilding !== undefined) {
      await this.dropdownExistingBuilding.selectOption({ label: data.existingBuilding });
      await this.page.waitForLoadState('networkidle');
    }

    // Conditional fields — only appear when Existing Building = 'Yes'
    if (data.existingBuildingLimit !== undefined) {
      await this.fieldExistingBuildingLimit.clear();
      await this.fieldExistingBuildingLimit.fill(data.existingBuildingLimit);
    }

    if (data.existingBuildingConstClass !== undefined) {
      await this.dropdownExistingBuildingConstClass.selectOption({
        label: data.existingBuildingConstClass,
      });
    }

    if (data.earnings !== undefined) {
      await this.fieldEarnings.clear();
      await this.fieldEarnings.fill(data.earnings);
    }

    if (data.rentalValue !== undefined) {
      await this.fieldRentalValue.clear();
      await this.fieldRentalValue.fill(data.rentalValue);
    }

    this.log('Builder\'s Risk Exposure Information filled');
  }

  /**
   * Fills the Limits & Deductibles section for the BR-1 tab.
   * Fields are filled only when provided.
   */
  async fillLimitsAndDeductibles(data: BuildersRiskLimitsData): Promise<void> {
    this.log('Filling Builder\'s Risk Limits & Deductibles');

    if (data.amtOneConstructionSiteLimit !== undefined) {
      await this.fieldAmtOneConstructionSiteLimit.clear();
      await this.fieldAmtOneConstructionSiteLimit.fill(data.amtOneConstructionSiteLimit);
    }

    if (data.amtOneOccurrenceLimit !== undefined) {
      await this.fieldAmtOneOccurrenceLimit.clear();
      await this.fieldAmtOneOccurrenceLimit.fill(data.amtOneOccurrenceLimit);
    }

    if (data.temporaryLocationsLimit !== undefined) {
      await this.fieldTemporaryLocationsLimit.clear();
      await this.fieldTemporaryLocationsLimit.fill(data.temporaryLocationsLimit);
    }

    if (data.transitUnit !== undefined) {
      await this.fieldTransitUnit.clear();
      await this.fieldTransitUnit.fill(data.transitUnit);
    }

    if (data.amtDeductibleAllOtherPerils !== undefined) {
      await this.fieldAmtDeductibleAllOtherPerils.clear();
      await this.fieldAmtDeductibleAllOtherPerils.fill(data.amtDeductibleAllOtherPerils);
    }

    if (data.coinsurance !== undefined) {
      await this.dropdownCoinsurance.selectOption({ label: data.coinsurance });
    }

    this.log('Builder\'s Risk Limits & Deductibles filled');
  }

  /**
   * Fills the entire BR product tab in one call.
   * Equivalent to calling fillExposureInformation + fillLimitsAndDeductibles.
   */
  async fillProductDetails(data: BuildersRiskData): Promise<void> {
    if (data.exposure) await this.fillExposureInformation(data.exposure);
    if (data.limits)   await this.fillLimitsAndDeductibles(data.limits);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ASSERTIONS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Asserts that the Exposure Information section header is visible,
   * confirming the page is showing BR product content.
   */
  async assertExposureInformationVisible(): Promise<void> {
    await expect(
      this.sectionExposureInformation,
      '"Exposure Information" section header should be visible for Builder\'s Risk',
    ).toBeVisible();
    this.log('✅ Exposure Information section is visible');
  }

  /**
   * Asserts that the Limits & Deductibles section header is visible.
   */
  async assertLimitsAndDeductiblesVisible(): Promise<void> {
    await expect(
      this.sectionLimitsAndDeductibles,
      '"Limits & Deductibles" section header should be visible for Builder\'s Risk',
    ).toBeVisible();
    this.log('✅ Limits & Deductibles section is visible');
  }

  /**
   * Asserts the value of a single exposure field.
   * Uses `toHaveValue` for inputs; `toContainText` for read-only displays.
   */
  async assertExposureField(
    fieldLocator: Locator,
    expectedValue: string,
    fieldName: string,
  ): Promise<void> {
    const tagName = await fieldLocator.evaluate(el => el.tagName.toLowerCase());
    if (tagName === 'input' || tagName === 'select') {
      await expect(fieldLocator, `${fieldName} should equal "${expectedValue}"`).toHaveValue(expectedValue);
    } else {
      await expect(fieldLocator, `${fieldName} should contain "${expectedValue}"`).toContainText(expectedValue);
    }
    this.log(`✅ ${fieldName} = ${expectedValue}`);
  }

  /**
   * Asserts the computed Premium Summary values.
   * Pass only the values you want to check; others are skipped.
   *
   * IMPORTANT: totalPremium / triaPremium / totalPremiumWithTria are
   * read-only computed fields.  Pass formatted values as the UI shows them
   * (e.g. '25,000' not '25000').
   */
  async assertPremiumSummary(expected: BuildersRiskPremiumSummary): Promise<void> {
    this.log('Asserting Premium Summary values');

    if (expected.totalPremium !== undefined) {
      await expect(
        this.fieldTotalPremium,
        `TOTAL PREMIUM should be "${expected.totalPremium}"`,
      ).toContainText(expected.totalPremium);
    }

    if (expected.triaPremium !== undefined) {
      await expect(
        this.fieldTriaPremium,
        `TRIA PREMIUM should be "${expected.triaPremium}"`,
      ).toContainText(expected.triaPremium);
    }

    if (expected.totalPremiumWithTria !== undefined) {
      await expect(
        this.fieldTotalPremiumWithTria,
        `TOTAL PREMIUM INCLUDING TRIA should be "${expected.totalPremiumWithTria}"`,
      ).toContainText(expected.totalPremiumWithTria);
    }

    this.log('✅ Premium Summary assertions passed');
  }

  /**
   * Asserts that HARD COSTS is visible and has the expected value.
   * Quick smoke check that the BR tab is loaded correctly.
   */
  async assertHardCosts(expectedValue: string): Promise<void> {
    await expect(
      this.fieldHardCosts,
      `HARD COSTS should be "${expectedValue}"`,
    ).toHaveValue(expectedValue);
    this.log(`✅ Hard Costs = ${expectedValue}`);
  }

  protected log(message: string): void {
    console.log(`[BuildersRiskPage] ${message}`);
  }
}
