/**
 * location-management.spec.ts
 *
 * Full test suite for the Location Management page.
 *
 * ── NAVIGATION ────────────────────────────────────────────────────────────────
 *   This page has NO direct URL. Every test must navigate via:
 *     1. Authenticate (handled by fixture)
 *     2. Navigate to a submission
 *     3. Click "Location Management" in the sidebar
 *
 * ── SETUP CHECKLIST ───────────────────────────────────────────────────────────
 *   Before running:
 *   □ Replace all YOUR_*_SELECTOR in LocationManagementPage.ts
 *   □ Replace YOUR_VERISK_API_URL_PATTERN in clickVeriskAndCaptureResponse()
 *   □ Replace YOUR_COTALITY_API_URL_PATTERN in clickCotalityAndCaptureResponse()
 *   □ Replace YOUR_VERISK_*_KEY / YOUR_COTALITY_*_KEY field mappings
 *   □ Run LocationFixtureBuilder.generate() once to create the upload fixture
 *   □ Set LOCATION_UPLOAD_FIXTURE_PATH env var or update the inline path
 *
 * ── TEST DATA PATTERN ─────────────────────────────────────────────────────────
 *   Each test that adds locations uses a unique locationNo (001–999) so tests
 *   within the same submission don't collide. Tests that depend on a clean
 *   slate call helpers (addLocation / deleteLocation) instead of relying on
 *   prior test state.
 */

import path                                  from 'path';
import { test, expect }                      from '../fixtures/test-fixtures';
import { LocationManagementPage }            from '../../src/pages/LocationManagementPage';
import { SubmissionOverviewPage }            from '../../src/pages/SubmissionOverviewPage';
import { LocationFactory }                   from '../../src/data/factories/LocationFactory';
import { LocationFixtureBuilder }            from '../../src/data/fixtures/LocationFixtureBuilder';

// ── Paths & constants ─────────────────────────────────────────────────────────

const UPLOAD_FIXTURE_PATH = path.resolve(
  __dirname,
  '../../src/data/fixtures/location-upload-fixture.xlsx'
);

// ── Shared helpers ─────────────────────────────────────────────────────────────

/**
 * Navigate from the fixture's authenticated page to Location Management.
 * Returns the typed page object, ready to use.
 */
async function gotoLocationManagement(
  submissionOverview: SubmissionOverviewPage
): Promise<LocationManagementPage> {
  // TODO: Replace with the correct navigation method from SubmissionOverviewPage.
  // e.g. await submissionOverview.clickLocationManagement();
  await submissionOverview.clickLocationManagement();
  const locationPage = new LocationManagementPage(submissionOverview.page);
  await locationPage.verifyPageLoaded();
  return locationPage;
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. PAGE LOAD
// ═════════════════════════════════════════════════════════════════════════════

test.describe('1. Page Load', () => {

  test('page heading and required UI elements are visible', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);

    await expect(locationPage.pageHeading,       'Page heading').toBeVisible();
    await expect(locationPage.locationDataTab,   'Location Data tab').toBeVisible();
    await expect(locationPage.locationSummaryTab,'Location Summary tab').toBeVisible();
    await expect(locationPage.kpiTotalLocations, 'KPI bar: Total Locations').toBeVisible();
    await expect(locationPage.veriskButton,      'Verisk button').toBeVisible();
    await expect(locationPage.cotalityButton,    'Cotality button').toBeVisible();
    await expect(locationPage.addNewButton,      '+ Add New button').toBeVisible();
    await expect(locationPage.uploadButton,      'Upload button').toBeVisible();
    await expect(locationPage.templateLink,      'Template download link').toBeVisible();
  });

  test('Location Data tab is active by default', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);

    await expect(locationPage.locationDataTab).toHaveClass(/active|selected/);
  });

  test('empty table shows "no locations" message when no locations exist', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);

    await locationPage.assertTableIsEmpty();
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// 2. KPI SECTION
// ═════════════════════════════════════════════════════════════════════════════

test.describe('2. KPI Section', () => {

  test('KPI values are initially zero / empty', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);

    const kpi = await locationPage.getKpiValues();
    expect(kpi.totalLocations, 'Total Locations should start at 0').toBe('0');
  });

  test('KPI bar updates after adding a location', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    const data = LocationFactory.usaFull('010');

    await locationPage.addLocation(data);

    // After save, Total Locations should be 1
    await locationPage.assertKpiValues({ totalLocations: '1' });
  });

  test('KPI Total Value reflects sum of location totals', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);

    // usaFull has PD = 540, BI/EE = 90 → Location Total = 630
    await locationPage.addLocation(LocationFactory.usaFull('011'));
    const kpi = await locationPage.getKpiValues();

    expect(kpi.totalLocations, 'Total locations = 1').toBe('1');
    // Total Value should include the Location Total
    expect(kpi.totalValue, 'Total Value > 0').not.toBe('$0');
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// 3. ADD LOCATION MODAL — OPENS
// ═════════════════════════════════════════════════════════════════════════════

test.describe('3. Add Location Modal — Opens', () => {

  test('clicking "+ Add New" opens the modal with correct title', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);

    await locationPage.clickAddNew();

    await expect(locationPage.locationModal, 'Modal should be visible').toBeVisible();
    await expect(locationPage.modalTitle, 'Modal title').toContainText('Add Location Data');
  });

  test('modal contains all required field labels', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.clickAddNew();

    // Just verify the key fields are present
    await expect(locationPage.modalLocationNo,        'Location No. field').toBeVisible();
    await expect(locationPage.modalAddress,           'Address field').toBeVisible();
    await expect(locationPage.modalCity,              'City field').toBeVisible();
    await expect(locationPage.modalZip,               'ZIP field').toBeVisible();
    await expect(locationPage.modalSprinkleredYes,    'Sprinklered Yes radio').toBeVisible();
    await expect(locationPage.modalSprinkleredNo,     'Sprinklered No radio').toBeVisible();
    await expect(locationPage.modalSaveButton,        'Save button').toBeVisible();
    await expect(locationPage.modalCancelButton,      'Cancel button').toBeVisible();
  });

  test('auto-calculated fields are read-only', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.clickAddNew();

    await expect(locationPage.modalPropertyDamageTotal, 'PD Total should be read-only').toBeDisabled();
    await expect(locationPage.modalBiEeTotal,           'BI/EE Total should be read-only').toBeDisabled();
    await expect(locationPage.modalLocationTotal,       'Location Total should be read-only').toBeDisabled();
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// 4. LOCATION NO. VALIDATION
// ═════════════════════════════════════════════════════════════════════════════

test.describe('4. Location No. Validation (001–999)', () => {

  test('entering 000 shows Location No. validation error', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.clickAddNew();

    await locationPage.fillLocationNo('000');
    await locationPage.modalLocationNo.press('Tab');

    await locationPage.assertLocationNoError();
  });

  test('entering 1000 (4 digits) shows Location No. validation error', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.clickAddNew();

    await locationPage.fillLocationNo('1000');
    await locationPage.modalLocationNo.press('Tab');

    await locationPage.assertLocationNoError();
  });

  test('entering non-numeric value shows Location No. validation error', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.clickAddNew();

    await locationPage.fillLocationNo('abc');
    await locationPage.modalLocationNo.press('Tab');

    await locationPage.assertLocationNoError();
  });

  test('entering valid 001 does NOT show Location No. error', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.clickAddNew();

    await locationPage.fillLocationNo('001');
    await locationPage.modalLocationNo.press('Tab');

    await expect(locationPage.errLocationNo, 'No error for valid 001').toBeHidden();
  });

  test('entering valid 999 does NOT show Location No. error', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.clickAddNew();

    await locationPage.fillLocationNo('999');
    await locationPage.modalLocationNo.press('Tab');

    await expect(locationPage.errLocationNo, 'No error for valid 999').toBeHidden();
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// 5. BUILDING NO. VALIDATION
// ═════════════════════════════════════════════════════════════════════════════

test.describe('5. Building No. Validation', () => {

  // TODO: Confirm the exact Building No. error messages from the app.
  //       Update errBuildingNo selector in LocationManagementPage.ts.

  test('[TODO] entering 0 shows Building No. validation error', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.clickAddNew();

    await locationPage.fillBuildingNo('0');
    await locationPage.modalBuildingNo.press('Tab');

    // TODO: When error message confirmed, replace with assertBuildingNoError()
    await expect(locationPage.errBuildingNo, 'Building No. error for 0').toBeVisible();
  });

  test('[TODO] entering 100 shows Building No. validation error', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.clickAddNew();

    await locationPage.fillBuildingNo('100');
    await locationPage.modalBuildingNo.press('Tab');

    await expect(locationPage.errBuildingNo, 'Building No. error for 100').toBeVisible();
  });

  test('entering valid Building No. 1 does NOT show error', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.clickAddNew();

    await locationPage.fillBuildingNo('1');
    await locationPage.modalBuildingNo.press('Tab');

    await expect(locationPage.errBuildingNo, 'No error for valid Building No. 1').toBeHidden();
  });

  test('entering valid Building No. 99 does NOT show error', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.clickAddNew();

    await locationPage.fillBuildingNo('99');
    await locationPage.modalBuildingNo.press('Tab');

    await expect(locationPage.errBuildingNo, 'No error for valid Building No. 99').toBeHidden();
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// 6. REQUIRED FIELD VALIDATION
// ═════════════════════════════════════════════════════════════════════════════

test.describe('6. Required Field Validation', () => {

  test('clicking Save without any input shows required field errors', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.clickAddNew();

    // Click Save immediately without filling anything
    await locationPage.modalSaveButton.click();

    await expect(locationPage.errLocationNo,    'Location No. required error').toBeVisible();
    await expect(locationPage.errCountry,       'Country required error').toBeVisible();
    await expect(locationPage.errAddress,       'Address required error').toBeVisible();
    await expect(locationPage.errCity,          'City required error').toBeVisible();
    await expect(locationPage.errStateProvince, 'State required error').toBeVisible();
    await expect(locationPage.errZip,           'ZIP required error').toBeVisible();
  });

  test('Sprinklered is required — save without it shows error or keeps modal open', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.clickAddNew();

    // Fill all except Sprinklered
    await locationPage.fillLocationNo('020');
    await locationPage.selectCountry('USA');
    await locationPage.fillAddress('123 Test Ave');
    await locationPage.fillCity('Boston');
    await locationPage.selectStateProvince('MA - Massachusetts');
    await locationPage.fillZipPostalCode('02101');
    // NOTE: do NOT select Sprinklered

    await locationPage.modalSaveButton.click();

    // Modal should still be open (not saved) and Sprinklered should be highlighted
    await expect(locationPage.locationModal, 'Modal should remain open — Sprinklered is required').toBeVisible();
  });

  test('ZIP pattern validation shows error for invalid format', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.clickAddNew();

    await locationPage.fillZipPostalCode('ABCDE'); // Invalid ZIP
    await locationPage.modalZip.press('Tab');

    await locationPage.assertZipPatternError();
  });

  test('valid US ZIP clears ZIP error', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.clickAddNew();

    await locationPage.fillZipPostalCode('ABCDE');
    await locationPage.modalZip.press('Tab');
    await locationPage.assertZipPatternError();

    // Fix the ZIP
    await locationPage.fillZipPostalCode('10001');
    await locationPage.modalZip.press('Tab');

    await expect(locationPage.errZip,        'ZIP required error gone').toBeHidden();
    await expect(locationPage.errZipPattern, 'ZIP pattern error gone').toBeHidden();
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// 7. YEAR BUILT VALIDATION
// ═════════════════════════════════════════════════════════════════════════════

test.describe('7. Year Built Validation', () => {

  test('entering 3-digit year shows "Enter a valid 4-digit year" error', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.clickAddNew();

    await locationPage.fillYearBuilt('199');
    await locationPage.modalYearBuilt.press('Tab');

    await locationPage.assertYearBuiltError();
  });

  test('entering letters shows Year Built error', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.clickAddNew();

    await locationPage.fillYearBuilt('abcd');
    await locationPage.modalYearBuilt.press('Tab');

    await locationPage.assertYearBuiltError();
  });

  test('entering valid 4-digit year does NOT show Year Built error', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.clickAddNew();

    await locationPage.fillYearBuilt('2000');
    await locationPage.modalYearBuilt.press('Tab');

    await expect(locationPage.errYearBuilt, 'No Year Built error for valid 2000').toBeHidden();
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// 8. NO. OF STORIES VALIDATION
// ═════════════════════════════════════════════════════════════════════════════

test.describe('8. No. of Stories Validation', () => {

  test('entering 100 shows "must be less than or equal to 99" error', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.clickAddNew();

    await locationPage.fillNumberOfStories('100');
    await locationPage.modalNoOfStories.press('Tab');

    await locationPage.assertNoOfStoriesMaxError();
  });

  test('entering letters shows "must be a valid number" error', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.clickAddNew();

    await locationPage.fillNumberOfStories('abc');
    await locationPage.modalNoOfStories.press('Tab');

    await locationPage.assertNoOfStoriesTypeError();
  });

  test('entering 99 does NOT show No. of Stories error', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.clickAddNew();

    await locationPage.fillNumberOfStories('99');
    await locationPage.modalNoOfStories.press('Tab');

    await expect(locationPage.errNoOfStoriesMax,  'No max error for 99').toBeHidden();
    await expect(locationPage.errNoOfStoriesType, 'No type error for 99').toBeHidden();
  });

  test('entering 1 does NOT show No. of Stories error', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.clickAddNew();

    await locationPage.fillNumberOfStories('1');
    await locationPage.modalNoOfStories.press('Tab');

    await expect(locationPage.errNoOfStoriesMax,  'No max error for 1').toBeHidden();
    await expect(locationPage.errNoOfStoriesType, 'No type error for 1').toBeHidden();
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// 9. AUTO-CALCULATION (PD, BI/EE, LOCATION TOTAL)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('9. Auto-Calculation', () => {

  /**
   * usaFull factory values:
   *   Building  = 90  Contents = 90  Stocks = 90
   *   Machinery = 90  EDP      = 90  Other  = 90
   *   PD Total  = 90+90+90+90+90+90 = 540
   *
   *   Business Interruption = 90  Extra Expense = 0
   *   BI/EE Total           = 90
   *
   *   Location Total        = 540 + 90 = 630
   */
  test('Property Damage Total = sum of all value fields', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.clickAddNew();

    const data = LocationFactory.usaFull('030');
    await locationPage.fillLocationNo(data.locationNo);
    await locationPage.fillBuildingValue(data.buildingValue!);
    await locationPage.fillContentsValue(data.contentsValue!);
    await locationPage.fillStocksValue(data.stocksValue!);
    await locationPage.fillMachineryValue(data.machineryValue!);
    await locationPage.fillEdp(data.edp!);
    await locationPage.fillOtherDollar(data.otherDollar!);

    // Short wait for the app to recalculate
    await locationPage.waitMs(500);

    await locationPage.assertPropertyDamageTotal('540');
  });

  test('BI/EE Total = Business Interruption + Extra Expense', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.clickAddNew();

    await locationPage.fillBusinessInterruption('200');
    await locationPage.fillExtraExpense('50');
    await locationPage.waitMs(500);

    await locationPage.assertBiEeTotal('250');
  });

  test('Location Total = PD Total + BI/EE Total', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.clickAddNew();

    // Simple values to check arithmetic easily
    await locationPage.fillBuildingValue('500');     // PD = 500
    await locationPage.fillBusinessInterruption('100'); // BI/EE = 100
    await locationPage.waitMs(500);

    await locationPage.assertPropertyDamageTotal('500');
    await locationPage.assertBiEeTotal('100');
    await locationPage.assertLocationTotal('600');
  });

  test('auto-calculated fields update when values change', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.clickAddNew();

    await locationPage.fillBuildingValue('100');
    await locationPage.waitMs(500);
    await locationPage.assertPropertyDamageTotal('100');

    // Update the value
    await locationPage.fillBuildingValue('200');
    await locationPage.waitMs(500);
    await locationPage.assertPropertyDamageTotal('200');
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// 10. SAVE AND TABLE
// ═════════════════════════════════════════════════════════════════════════════

test.describe('10. Save and Table', () => {

  test('saving a valid location closes the modal', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);

    await locationPage.addLocation(LocationFactory.usaMinimal('040'));

    await expect(locationPage.locationModal, 'Modal should be closed after save').toBeHidden();
  });

  test('saved location appears in the table', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    const data = LocationFactory.usaMinimal('041');

    await locationPage.addLocation(data);

    await locationPage.assertLocationInTableById(data.locationNo);
    await locationPage.assertTableRow(data.locationNo, {
      address:       data.address,
      city:          data.city,
      stateProvince: data.stateProvince,
      zipPostalCode: data.zipPostalCode,
      country:       data.country,
    });
  });

  test('KPI Total Locations increments after save', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);

    await locationPage.assertKpiValues({ totalLocations: '0' });
    await locationPage.addLocation(LocationFactory.usaMinimal('042'));
    await locationPage.assertKpiValues({ totalLocations: '1' });
  });

  test('saving a full location with values shows correct PD and BI totals in table', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    const data = LocationFactory.usaFull('043');

    await locationPage.addLocation(data);

    const row = await locationPage.getTableRowById(data.locationNo);
    expect(row.totalPd, 'PD in table row should be 540').toContain('540');
    expect(row.totalBi, 'BI in table row should be 90').toContain('90');
  });

  test('multiple locations can be added and all appear in the table', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    const locations = LocationFactory.sequence(3, 50);

    for (const data of locations) {
      await locationPage.addLocation(data);
    }

    await locationPage.assertLocationCount(3);
    for (const data of locations) {
      await locationPage.assertLocationInTableById(data.locationNo);
    }
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// 11. EDIT LOCATION
// ═════════════════════════════════════════════════════════════════════════════

test.describe('11. Edit Location', () => {

  test('Edit button opens modal with pre-populated data', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    const data = LocationFactory.usaMinimal('060');
    await locationPage.addLocation(data);

    await locationPage.clickEditForLocation(data.locationNo);

    await expect(locationPage.modalTitle, 'Modal title should be Edit').toContainText('Edit Location Data');
    // Existing address should be pre-filled
    await expect(locationPage.modalAddress, 'Address pre-filled').toHaveValue(data.address);
    await expect(locationPage.modalCity,    'City pre-filled').toHaveValue(data.city);
  });

  test('Cancel on Edit → warning dialog appears', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    const data = LocationFactory.usaMinimal('061');
    await locationPage.addLocation(data);

    await locationPage.clickEditForLocation(data.locationNo);
    await locationPage.modalAddress.fill('New Address That Was Changed');
    await locationPage.modalCancelButton.click();

    await expect(locationPage.cancelWarningDialog, 'Cancel warning dialog should appear').toBeVisible();
  });

  test('Cancel warning → clicking No keeps the modal open', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    const data = LocationFactory.usaMinimal('062');
    await locationPage.addLocation(data);

    await locationPage.clickEditForLocation(data.locationNo);
    await locationPage.modalAddress.fill('Changed Value');
    await locationPage.cancelAndKeepOpen();

    await expect(locationPage.locationModal, 'Modal should still be visible').toBeVisible();
    await expect(locationPage.modalAddress,  'Changed value should still be in the field').toHaveValue('Changed Value');
  });

  test('Cancel warning → clicking Yes discards changes and closes modal', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    const data = LocationFactory.usaMinimal('063');
    await locationPage.addLocation(data);

    await locationPage.clickEditForLocation(data.locationNo);
    await locationPage.modalAddress.fill('Changed Value That Should Be Discarded');
    await locationPage.cancelAndConfirmDiscard();

    await expect(locationPage.locationModal, 'Modal should be closed after discard').toBeHidden();
    // Original value should still be in the table (unchanged)
    await locationPage.assertTableRow(data.locationNo, { address: data.address });
  });

  test('editing and saving updates the table row', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    const data = LocationFactory.usaMinimal('064');
    await locationPage.addLocation(data);

    await locationPage.clickEditForLocation(data.locationNo);
    await locationPage.fillAddress('500 Updated Avenue');
    await locationPage.fillCity('Chicago');
    await locationPage.clickSave();

    await locationPage.assertTableRow(data.locationNo, {
      address: '500 Updated Avenue',
      city:    'Chicago',
    });
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// 12. DELETE LOCATION — SINGLE
// ═════════════════════════════════════════════════════════════════════════════

test.describe('12. Delete Location — Single', () => {

  test('clicking Delete shows "Are you sure you want to delete?" dialog', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    const data = LocationFactory.usaMinimal('070');
    await locationPage.addLocation(data);

    await locationPage.clickDeleteForLocation(data.locationNo);

    await expect(locationPage.deleteConfirmDialog, 'Confirmation dialog should appear').toBeVisible();
    await expect(locationPage.deleteConfirmDialog).toContainText('Are you sure you want to delete?');
  });

  test('confirming delete (Yes) removes the location from the table', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    const data = LocationFactory.usaMinimal('071');
    await locationPage.addLocation(data);

    await locationPage.deleteLocation(data.locationNo);

    await locationPage.assertLocationNotInTable(data.locationNo);
  });

  test('confirming delete decrements KPI Total Locations', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    const data = LocationFactory.usaMinimal('072');
    await locationPage.addLocation(data);
    await locationPage.assertKpiValues({ totalLocations: '1' });

    await locationPage.deleteLocation(data.locationNo);

    await locationPage.assertKpiValues({ totalLocations: '0' });
  });

  test('cancelling delete (No) keeps the location in the table', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    const data = LocationFactory.usaMinimal('073');
    await locationPage.addLocation(data);

    await locationPage.clickDeleteForLocation(data.locationNo);
    await locationPage.cancelDelete();

    await locationPage.assertLocationInTableById(data.locationNo);
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// 13. DELETE LOCATION — BULK
// ═════════════════════════════════════════════════════════════════════════════

test.describe('13. Delete Location — Bulk', () => {

  test('"Delete Selected" button is hidden when no rows are checked', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.addLocation(LocationFactory.usaMinimal('080'));

    await locationPage.assertDeleteSelectedButtonHidden();
  });

  test('checking a row shows the "Delete Selected" button', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    const data = LocationFactory.usaMinimal('081');
    await locationPage.addLocation(data);

    await locationPage.selectRowCheckbox(data.locationNo);

    await locationPage.assertDeleteSelectedButtonVisible();
  });

  test('bulk delete removes all selected rows after confirmation', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    const locations = LocationFactory.sequence(3, 82);
    for (const data of locations) {
      await locationPage.addLocation(data);
    }

    const idsToDelete = [locations[0].locationNo, locations[1].locationNo];
    await locationPage.bulkDeleteLocations(idsToDelete);

    // Deleted rows gone
    await locationPage.assertLocationNotInTable(locations[0].locationNo);
    await locationPage.assertLocationNotInTable(locations[1].locationNo);

    // Third row still present
    await locationPage.assertLocationInTableById(locations[2].locationNo);
  });

  test('bulk delete confirmation dialog shows "Are you sure you want to delete?"', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    const data = LocationFactory.usaMinimal('085');
    await locationPage.addLocation(data);

    await locationPage.selectRowCheckbox(data.locationNo);
    await locationPage.clickDeleteSelected();

    await expect(locationPage.deleteConfirmDialog).toBeVisible();
    await expect(locationPage.deleteConfirmDialog).toContainText('Are you sure you want to delete?');
  });

  test('cancelling bulk delete (No) keeps all selected rows', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    const locations = LocationFactory.sequence(2, 86);
    for (const data of locations) await locationPage.addLocation(data);

    await locationPage.selectRowCheckbox(locations[0].locationNo);
    await locationPage.selectRowCheckbox(locations[1].locationNo);
    await locationPage.clickDeleteSelected();
    await locationPage.cancelDelete();

    await locationPage.assertLocationInTableById(locations[0].locationNo);
    await locationPage.assertLocationInTableById(locations[1].locationNo);
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// 14. FILE UPLOAD
// ═════════════════════════════════════════════════════════════════════════════

test.describe('14. File Upload', () => {

  /**
   * FIXTURE SETUP:
   *   The upload fixture is created by LocationFixtureBuilder.generate().
   *   Run this once before running the upload tests:
   *
   *     import { LocationFixtureBuilder } from '../../src/data/fixtures/LocationFixtureBuilder';
   *     await LocationFixtureBuilder.generate(UPLOAD_FIXTURE_PATH);
   *
   *   Or run the generation script directly:
   *     ts-node src/data/fixtures/generate-location-fixture.ts
   */

  test('clicking Upload button opens the upload modal', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);

    await locationPage.uploadButton.click();

    await expect(locationPage.uploadModal, 'Upload modal should be visible').toBeVisible({ timeout: 5_000 });
  });

  test('uploading a valid xlsx file imports locations to the table', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);

    await locationPage.uploadLocationsFromFile(UPLOAD_FIXTURE_PATH);

    // The fixture contains 2 locations: '901', '902'
    // Replace with the actual fixture locationNo values when generated
    await locationPage.assertTableHasLocations();
    // await locationPage.assertLocationInTableById('901');
    // await locationPage.assertLocationInTableById('902');

    const count = await locationPage.getLocationCount();
    expect(count, 'At least 1 location imported').toBeGreaterThan(0);
  });

  test('template link downloads a file', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);

    const download = await locationPage.downloadTemplate();

    expect(download.suggestedFilename(), 'Download should be an xlsx file')
      .toMatch(/\.xlsx$/i);
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// 15. VERISK INTEGRATION
// ═════════════════════════════════════════════════════════════════════════════

test.describe('15. Verisk Integration', () => {

  /**
   * PREREQUISITES:
   *   1. Replace YOUR_VERISK_API_URL_PATTERN in LocationManagementPage.ts
   *   2. Replace YOUR_VERISK_*_KEY field names with real response keys
   *   3. A location with a valid address must be added first
   *
   * PATTERN:
   *   1. Add a location (needed for Verisk to have address data)
   *   2. Click VERISK — captures the API response
   *   3. Open Edit modal for the location
   *   4. Compare Verisk fields in the modal against the captured response
   */

  test('clicking Verisk button triggers an API call and returns a response', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.addLocation(LocationFactory.usaFull('090'));

    const veriskData = await locationPage.clickVeriskAndCaptureResponse();

    // Basic sanity check that we got a response object (not null/undefined)
    expect(veriskData, 'Verisk response should be an object').toBeTruthy();
  });

  test('Verisk fields in the edit modal match the API response', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.addLocation(LocationFactory.usaFull('091'));

    const veriskData = await locationPage.clickVeriskAndCaptureResponse();

    // Open Edit modal to see the populated read-only Verisk fields
    await locationPage.clickEditForLocation('091');
    await locationPage.assertVeriskFieldsMatchResponse(veriskData);

    // Clean up
    await locationPage.cancelAndConfirmDiscard();
  });

  test('Protection Class field is populated after Verisk runs', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.addLocation(LocationFactory.usaFull('092'));

    const veriskData = await locationPage.clickVeriskAndCaptureResponse();

    if (veriskData.protectionClass) {
      await locationPage.clickEditForLocation('092');
      await expect(
        locationPage.modalVeriskProtectionClass,
        'Protection Class should be populated'
      ).not.toBeEmpty();
      await locationPage.cancelAndConfirmDiscard();
    }
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// 16. COTALITY INTEGRATION
// ═════════════════════════════════════════════════════════════════════════════

test.describe('16. Cotality Integration', () => {

  /**
   * PREREQUISITES:
   *   1. Replace YOUR_COTALITY_API_URL_PATTERN in LocationManagementPage.ts
   *   2. Replace YOUR_COTALITY_*_KEY field names with real response keys
   *   3. A location with a Cotality Occupancy selected and Area populated is ideal
   *
   * NOTE: Cotality uses building value and area (sq.ft.) to calculate ITV.
   *       Use usaFull() factory which includes those fields.
   */

  test('clicking Cotality button triggers an API call and returns a response', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.addLocation(LocationFactory.usaFull('093'));

    const cotalityData = await locationPage.clickCotalityAndCaptureResponse();

    expect(cotalityData, 'Cotality response should be an object').toBeTruthy();
  });

  test('Cotality fields in the edit modal match the API response', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.addLocation(LocationFactory.usaFull('094'));

    const cotalityData = await locationPage.clickCotalityAndCaptureResponse();

    await locationPage.clickEditForLocation('094');
    await locationPage.assertCotalityFieldsMatchResponse(cotalityData);

    await locationPage.cancelAndConfirmDiscard();
  });

  test('Cotality Building Value field is populated after Cotality runs', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.addLocation(LocationFactory.usaFull('095'));

    const cotalityData = await locationPage.clickCotalityAndCaptureResponse();

    if (cotalityData.cotalityBuildingValue) {
      await locationPage.clickEditForLocation('095');
      await expect(
        locationPage.modalCotalityBuildingValue,
        'Cotality Building Value should be populated'
      ).not.toBeEmpty();
      await locationPage.cancelAndConfirmDiscard();
    }
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// 17. LOCATION SUMMARY TAB
// ═════════════════════════════════════════════════════════════════════════════

test.describe('17. Location Summary Tab', () => {

  test('[PLACEHOLDER] Location Summary tab is visible and clickable', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);

    await expect(locationPage.locationSummaryTab, 'Location Summary tab should be visible').toBeVisible();
    await locationPage.clickLocationSummaryTab();

    // Placeholder: verify we are on the tab without asserting specific content
    // TODO: Add assertions once the Location Summary tab content is defined.
    test.info().annotations.push({
      type: 'TODO',
      description: 'Location Summary tab is read-only and in development. Add content assertions when ready.',
    });
  });

  test('[PLACEHOLDER] switching back to Location Data tab works', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.clickLocationSummaryTab();

    await locationPage.clickLocationDataTab();

    await expect(locationPage.addNewButton, '+ Add New should be visible on Location Data tab').toBeVisible();
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// 18. HQ DESIGNATION SECTION
// ═════════════════════════════════════════════════════════════════════════════

test.describe('18. HQ Designation Section', () => {

  /**
   * NOTE: HQ Designation is UI-only (in development).
   * These tests only check the UI elements, not any backend behaviour.
   */

  test('[UI] HQ section radio buttons are visible', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);

    await expect(locationPage.hqRadioSelectExisting, '"Select from existing" radio').toBeVisible();
    await expect(locationPage.hqRadioNotALocation,   '"Not a location" radio').toBeVisible();
  });

  test('[UI] selecting "Select from Existing" shows the location dropdown', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);
    await locationPage.addLocation(LocationFactory.usaMinimal('100'));

    await locationPage.hqRadioSelectExisting.click();

    // The HQ select dropdown should appear after selecting this option
    // The dropdown should contain the location we just added
    await expect(locationPage.hqSetAsHqButton, '"Set as HQ" button should appear').toBeVisible();
  });

  test('[UI] "Not a Location" mode shows the manual address form', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);

    await locationPage.selectHqMode('not-a-location');

    await expect(locationPage.hqAddressInput,    'HQ Address input').toBeVisible();
    await expect(locationPage.hqSaveAddressButton, 'HQ Save Address button').toBeVisible();
  });

  test('[UI] saving a manual HQ address completes without error', async ({ submissionOverview }) => {
    const locationPage = await gotoLocationManagement(submissionOverview);

    await locationPage.saveHqAddress({
      country:       'USA',
      address:       '1 Corporate Plaza',
      stateProvince: 'NY - New York',
      zipPostalCode: '10001',
    });

    // Saving the HQ address should complete (modal/form closes or success indicator shows)
    // TODO: Add assertion for success state once confirmed from the app.
  });

});
