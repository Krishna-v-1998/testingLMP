/**
 * LocationManagementPage.ts
 *
 * Page Object for the Location Management page within a submission.
 * Covers adding, editing, and asserting locations.
 */

import { type Locator, expect } from '@playwright/test';
import { BasePage }             from './base/BasePage';

// ── Data interfaces ───────────────────────────────────────────────────────────

export interface LocationData {
  country:          string;
  streetAddress:    string;
  city:             string;
  stateProvince:    string;
  zipPostalCode:    string;
  sprinklered?:     'Yes' | 'No' | 'Partial';

  buildingValue?:   string;
  contentsValue?:   string;
  stocksValue?:     string;
  machineryValue?:  string;
  edp?:             string;
  otherDollar?:     string;
}

export interface LocationRowAssertion {
  country?:          string;
  address?:          string;
  city?:             string;
  state?:            string;
  zip?:              string;
  sprinklered?:      string;
  buildingValue?:    string;
  contentsValue?:    string;
  locationTotal?:    string;
}

// ═════════════════════════════════════════════════════════════════════════════
// LocationManagementPage
// ═════════════════════════════════════════════════════════════════════════════

export class LocationManagementPage extends BasePage {

  // ── Navigation ────────────────────────────────────────────────────────────

  get btnAddNew(): Locator {
    return this.page.getByRole('button', { name: /add\s*new\s*location|add\s*location|add\s*new/i }).first();
  }

  get locationsTable(): Locator {
    return this.page.getByRole('table').filter({ hasText: /location/i }).first();
  }

  locationRow(locationNo: number): Locator {
    // Location rows in the table (1-based, skip header)
    return this.locationsTable.getByRole('row').nth(locationNo);
  }

  get locationCountLabel(): Locator {
    return this.page.getByText(/total\s*locations?|location\s*count/i).first();
  }

  // ── Modal / drawer – address fields ───────────────────────────────────────

  private get drawer(): Locator {
    // The add/edit location panel (drawer or modal)
    return this.page
      .getByRole('dialog')
      .or(this.page.locator('[data-testid="location-drawer"], .location-drawer, .location-panel'))
      .first();
  }

  private drawerLabel(label: string | RegExp): Locator {
    return this.drawer.getByLabel(label).first();
  }

  get selectCountry(): Locator {
    return this.drawerLabel(/country/i);
  }

  get inputStreetAddress(): Locator {
    return this.drawerLabel(/street\s*address|address\s*line\s*1/i);
  }

  get inputCity(): Locator {
    return this.drawerLabel(/^city$/i);
  }

  get selectStateProvince(): Locator {
    return this.drawerLabel(/state|province/i);
  }

  get inputZipPostalCode(): Locator {
    return this.drawerLabel(/zip|postal\s*code/i);
  }

  get selectSprinklered(): Locator {
    return this.drawerLabel(/sprinklered/i);
  }

  // ── Modal / drawer – value fields ─────────────────────────────────────────

  get inputBuildingValue(): Locator {
    return this.drawerLabel(/building\s*value/i);
  }

  get inputContentsValue(): Locator {
    return this.drawerLabel(/contents\s*value/i);
  }

  get inputStocksValue(): Locator {
    return this.drawerLabel(/stocks\s*value/i);
  }

  get inputMachineryValue(): Locator {
    return this.drawerLabel(/machinery\s*value/i);
  }

  get inputEdp(): Locator {
    return this.drawerLabel(/edp|electronic\s*data\s*processing/i);
  }

  get inputOtherDollar(): Locator {
    return this.drawerLabel(/other\s*\$/i);
  }

  // ── Buttons in modal ──────────────────────────────────────────────────────

  get btnSaveLocation(): Locator {
    return this.drawer.getByRole('button', { name: /save|add|confirm/i }).first();
  }

  get btnCancelLocation(): Locator {
    return this.drawer.getByRole('button', { name: /cancel/i }).first();
  }

  get btnDiscardConfirm(): Locator {
    return this.page.getByRole('button', { name: /discard|yes.*discard|confirm.*discard/i }).first();
  }

  get btnKeepOpen(): Locator {
    return this.page.getByRole('button', { name: /keep.*open|no.*discard|continue\s*editing/i }).first();
  }

  // ── Summary / total cells ─────────────────────────────────────────────────

  get cellPropertyDamageTotal(): Locator {
    return this.page.getByTestId('property-damage-total')
      .or(this.page.getByText(/property\s*damage\s*total/i).locator('..').last())
      .first();
  }

  get cellBiEeTotal(): Locator {
    return this.page.getByTestId('bi-ee-total')
      .or(this.page.getByText(/bi\/ee\s*total|business\s*income/i).locator('..').last())
      .first();
  }

  get cellLocationTotal(): Locator {
    return this.page.getByTestId('location-total')
      .or(this.page.getByText(/location\s*total/i).locator('..').last())
      .first();
  }

  // ── High-level actions ────────────────────────────────────────────────────

  async clickAddNew(): Promise<void> {
    this.log('Clicking Add New Location');
    await this.btnAddNew.click();
    await this.waitForVisible(this.drawer, 10_000);
  }

  async fillCountry(country: string): Promise<void> {
    await this.selectCountry.selectOption({ label: country });
  }

  async fillAddress(address: string): Promise<void> {
    await this.clearAndFill(this.inputStreetAddress, address);
  }

  async fillCity(city: string): Promise<void> {
    await this.clearAndFill(this.inputCity, city);
  }

  async fillStateProvince(state: string): Promise<void> {
    // Could be a select OR a text input depending on country
    const el = this.selectStateProvince;
    const tag = await el.evaluate((e: Element) => e.tagName.toLowerCase());
    if (tag === 'select') {
      await el.selectOption({ label: state });
    } else {
      await this.clearAndFill(el, state);
    }
  }

  async fillZipPostalCode(zip: string): Promise<void> {
    await this.clearAndFill(this.inputZipPostalCode, zip);
  }

  async fillSprinklered(value: 'Yes' | 'No' | 'Partial'): Promise<void> {
    await this.selectSprinklered.selectOption({ label: value });
  }

  async fillBuildingValue(value: string): Promise<void> {
    await this.clearAndFill(this.inputBuildingValue, value);
  }

  async fillContentsValue(value: string): Promise<void> {
    await this.clearAndFill(this.inputContentsValue, value);
  }

  async fillStocksValue(value: string): Promise<void> {
    await this.clearAndFill(this.inputStocksValue, value);
  }

  async fillMachineryValue(value: string): Promise<void> {
    await this.clearAndFill(this.inputMachineryValue, value);
  }

  async fillEdp(value: string): Promise<void> {
    await this.clearAndFill(this.inputEdp, value);
  }

  async fillOtherDollar(value: string): Promise<void> {
    await this.clearAndFill(this.inputOtherDollar, value);
  }

  /**
   * Full flow: open the drawer, fill all fields, save.
   * Returns after the drawer closes and the table updates.
   */
  async addLocation(data: LocationData): Promise<void> {
    this.log(`Adding location: ${data.streetAddress}, ${data.city}, ${data.stateProvince}`);

    await this.clickAddNew();

    await this.fillCountry(data.country);
    await this.fillAddress(data.streetAddress);
    await this.fillCity(data.city);
    await this.fillStateProvince(data.stateProvince);
    await this.fillZipPostalCode(data.zipPostalCode);

    if (data.sprinklered !== undefined)   await this.fillSprinklered(data.sprinklered);
    if (data.buildingValue !== undefined) await this.fillBuildingValue(data.buildingValue);
    if (data.contentsValue !== undefined) await this.fillContentsValue(data.contentsValue);
    if (data.stocksValue !== undefined)   await this.fillStocksValue(data.stocksValue);
    if (data.machineryValue !== undefined) await this.fillMachineryValue(data.machineryValue);
    if (data.edp !== undefined)           await this.fillEdp(data.edp);
    if (data.otherDollar !== undefined)   await this.fillOtherDollar(data.otherDollar);

    await this.btnSaveLocation.click();
    await this.waitForHidden(this.drawer, 15_000);
    await this.page.waitForLoadState('networkidle');

    this.log('Location added successfully');
  }

  // ── Edit flow ─────────────────────────────────────────────────────────────

  async clickEditForLocation(locationNo: number): Promise<void> {
    this.log(`Opening edit for location ${locationNo}`);
    const row = this.locationRow(locationNo);
    await row.getByRole('button', { name: /edit/i }).click();
    await this.waitForVisible(this.drawer, 10_000);
  }

  async cancelAndKeepOpen(): Promise<void> {
    this.log('Cancelling location edit — keeping drawer open');
    await this.btnCancelLocation.click();
    // A "keep open" confirmation may appear
    const keepBtn = this.btnKeepOpen;
    if (await keepBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await keepBtn.click();
    }
  }

  async cancelAndConfirmDiscard(): Promise<void> {
    this.log('Cancelling location edit — confirming discard');
    await this.btnCancelLocation.click();
    const discardBtn = this.btnDiscardConfirm;
    if (await discardBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await discardBtn.click();
    }
    await this.waitForHidden(this.drawer, 10_000);
    await this.page.waitForLoadState('networkidle');
  }

  // ── Summary helpers ───────────────────────────────────────────────────────

  async getPageSummary(): Promise<{ propertyDamage: string; biEe: string; total: string }> {
    return {
      propertyDamage: (await this.cellPropertyDamageTotal.textContent() ?? '').trim(),
      biEe:           (await this.cellBiEeTotal.textContent() ?? '').trim(),
      total:          (await this.cellLocationTotal.textContent() ?? '').trim(),
    };
  }

  async getLocationCount(): Promise<number> {
    // Count data rows (exclude header row)
    const rows = this.locationsTable.getByRole('row');
    const count = await rows.count();
    return Math.max(0, count - 1); // subtract header
  }

  // ── Assertions ────────────────────────────────────────────────────────────

  /**
   * Asserts a location row contains the expected values.
   * Only the provided fields are checked; omit a field to skip it.
   */
  async assertTableRow(locationNo: number, expected: LocationRowAssertion): Promise<void> {
    this.log(`Asserting location row ${locationNo}`);
    const row = this.locationRow(locationNo);

    for (const [key, value] of Object.entries(expected)) {
      if (value === undefined) continue;
      await expect(
        row.getByText(value, { exact: false }).first(),
        `Location ${locationNo}: expected "${key}" = "${value}"`,
      ).toBeVisible({ timeout: 10_000 });
    }
  }

  async assertLocationCount(expected: number): Promise<void> {
    const actual = await this.getLocationCount();
    expect(actual, `Expected ${expected} location(s), found ${actual}`).toBe(expected);
  }

  async assertPropertyDamageTotal(expected: string): Promise<void> {
    await expect(
      this.cellPropertyDamageTotal,
      `Property Damage total should be "${expected}"`,
    ).toContainText(expected);
  }

  async assertBiEeTotal(expected: string): Promise<void> {
    await expect(
      this.cellBiEeTotal,
      `BI/EE total should be "${expected}"`,
    ).toContainText(expected);
  }

  async assertLocationTotal(expected: string): Promise<void> {
    await expect(
      this.cellLocationTotal,
      `Location total should be "${expected}"`,
    ).toContainText(expected);
  }
}
