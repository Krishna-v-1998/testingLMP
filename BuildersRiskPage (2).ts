/**
 * BuildersRiskPage.ts
 *
 * Page Object for the Builder's Risk product details tab.
 * Handles Exposure Information, Limits & Deductibles, and Premium Summary sections.
 */

import { type Locator, expect } from '@playwright/test';
import { BasePage }             from './base/BasePage';
import type {
  BuildersRiskData,
  BuildersRiskExposureData,
  BuildersRiskLimitsData,
  BuildersRiskPremiumSummary,
} from '../types/builders-risk.types';

export class BuildersRiskPage extends BasePage {

  // ── Section headers ───────────────────────────────────────────────────

  get sectionExposureInfo(): Locator {
    return this.page.getByText(/exposure\s*information/i).first();
  }

  get sectionLimitsAndDed(): Locator {
    return this.page.getByText(/limits\s*(&|and)\s*deductibles/i).first();
  }

  // ── Exposure Information fields ───────────────────────────────────────

  get inputHardCosts(): Locator {
    return this.page.getByLabel(/hard\s*costs/i).first();
  }

  get inputSoftCosts(): Locator {
    return this.page.getByLabel(/soft\s*costs/i).first();
  }

  get inputTestingPeriod(): Locator {
    return this.page.getByLabel(/testing\s*period/i).first();
  }

  get inputDelayInCompletion(): Locator {
    return this.page.getByLabel(/delay\s*in\s*completion/i).first();
  }

  get selectExistingBuilding(): Locator {
    return this.page.getByLabel(/existing\s*building/i).first();
  }

  get inputExistingBuildingLimit(): Locator {
    return this.page.getByLabel(/existing\s*building\s*limit/i).first();
  }

  get inputExistingBuildingConstClass(): Locator {
    return this.page.getByLabel(/construction\s*class/i).first();
  }

  get inputEarnings(): Locator {
    return this.page.getByLabel(/earnings/i).first();
  }

  get inputRentalValue(): Locator {
    return this.page.getByLabel(/rental\s*value/i).first();
  }

  // ── Limits & Deductibles fields ───────────────────────────────────────

  get inputOneConstructionSiteLimit(): Locator {
    return this.page.getByLabel(/one\s*construction\s*site\s*limit/i).first();
  }

  get inputOneOccurrenceLimit(): Locator {
    return this.page.getByLabel(/one\s*occurrence\s*limit/i).first();
  }

  get inputTemporaryLocationsLimit(): Locator {
    return this.page.getByLabel(/temporary\s*locations\s*limit/i).first();
  }

  get inputTransitUnit(): Locator {
    return this.page.getByLabel(/transit\s*unit/i).first();
  }

  get inputDeductibleAllOtherPerils(): Locator {
    return this.page.getByLabel(/deductible.*all\s*other\s*perils/i).first();
  }

  get inputCoinsurance(): Locator {
    return this.page.getByLabel(/coinsurance/i).first();
  }

  // ── Premium Summary fields ────────────────────────────────────────────

  get displayTotalPremium(): Locator {
    return this.page.getByTestId('total-premium')
      .or(this.page.getByText(/total\s*premium/i).locator('..').getByRole('cell').last())
      .first();
  }

  // ── High-level actions ────────────────────────────────────────────────

  async fillExposureInformation(data: BuildersRiskExposureData): Promise<void> {
    this.log('Filling Exposure Information');
    if (data.hardCosts !== undefined)
      await this.clearAndFill(this.inputHardCosts, data.hardCosts);
    if (data.softCosts !== undefined)
      await this.clearAndFill(this.inputSoftCosts, data.softCosts);
    if (data.testingPeriod !== undefined)
      await this.clearAndFill(this.inputTestingPeriod, data.testingPeriod);
    if (data.delayInCompletion !== undefined)
      await this.clearAndFill(this.inputDelayInCompletion, data.delayInCompletion);
    if (data.existingBuilding !== undefined)
      await this.selectExistingBuilding.selectOption(data.existingBuilding);
    if (data.existingBuildingLimit !== undefined)
      await this.clearAndFill(this.inputExistingBuildingLimit, data.existingBuildingLimit);
    if (data.existingBuildingConstClass !== undefined)
      await this.clearAndFill(this.inputExistingBuildingConstClass, data.existingBuildingConstClass);
    if (data.earnings !== undefined)
      await this.clearAndFill(this.inputEarnings, data.earnings);
    if (data.rentalValue !== undefined)
      await this.clearAndFill(this.inputRentalValue, data.rentalValue);
  }

  async fillLimitsAndDeductibles(data: BuildersRiskLimitsData): Promise<void> {
    this.log('Filling Limits & Deductibles');
    if (data.amtOneConstructionSiteLimit !== undefined)
      await this.clearAndFill(this.inputOneConstructionSiteLimit, data.amtOneConstructionSiteLimit);
    if (data.amtOneOccurrenceLimit !== undefined)
      await this.clearAndFill(this.inputOneOccurrenceLimit, data.amtOneOccurrenceLimit);
    if (data.temporaryLocationsLimit !== undefined)
      await this.clearAndFill(this.inputTemporaryLocationsLimit, data.temporaryLocationsLimit);
    if (data.transitUnit !== undefined)
      await this.clearAndFill(this.inputTransitUnit, data.transitUnit);
    if (data.amtDeductibleAllOtherPerils !== undefined)
      await this.clearAndFill(this.inputDeductibleAllOtherPerils, data.amtDeductibleAllOtherPerils);
    if (data.coinsurance !== undefined)
      await this.clearAndFill(this.inputCoinsurance, data.coinsurance);
  }

  async fillProductDetails(data: BuildersRiskData): Promise<void> {
    this.log('Filling Builder\'s Risk product details');
    if (data.exposure) await this.fillExposureInformation(data.exposure);
    if (data.limits)   await this.fillLimitsAndDeductibles(data.limits);
  }

  // ── Assertions ────────────────────────────────────────────────────────

  async assertPremiumSummary(expected: BuildersRiskPremiumSummary): Promise<void> {
    this.log('Asserting premium summary values');
    if (expected.totalPremium) {
      await expect(
        this.page.getByText(expected.totalPremium, { exact: false }).first(),
        `Total premium should be "${expected.totalPremium}"`
      ).toBeVisible();
    }
    if (expected.triaPremium) {
      await expect(
        this.page.getByText(expected.triaPremium, { exact: false }).first(),
        `TRIA premium should be "${expected.triaPremium}"`
      ).toBeVisible();
    }
    if (expected.totalPremiumWithTria) {
      await expect(
        this.page.getByText(expected.totalPremiumWithTria, { exact: false }).first(),
        `Total premium with TRIA should be "${expected.totalPremiumWithTria}"`
      ).toBeVisible();
    }
  }
}
