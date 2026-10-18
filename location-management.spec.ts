import { test, expect } from '../../src/fixtures';
import { SubmissionSetupService } from '../../src/services/SubmissionSetupService';
import { SubmissionContext }      from '../../src/types/submission.types';
import { LocationFactory }        from '../../src/data/factories/LocationFactory';
import { Role }                   from '../../src/enums/role.enum';

/**
 * location-management.spec.ts
 *
 * Tests for: Location Management page
 * Accessed via: Sidebar → Underwriting File → Location Management
 *
 * ── WHAT IS TESTED ────────────────────────────────────────────────────────────
 *
 *   1.  Page Load          — renders when navigated from sidebar
 *   2.  Tabs               — Location Data + Location Summary tabs visible
 *   3.  Empty Table        — "No locations" placeholder shows with no data
 *   4.  Add Modal Opens    — title = "Add Location Data", Location No auto-set
 *   5.  Country → State    — selecting Country reloads State/Province dropdown
 *   6.  Validation         — required-field errors, ZIP pattern error
 *   7.  Save Enabled       — Save button disabled until required fields filled
 *   8.  Auto-Calculation   — PD Total, BI/EE Total, Location Total computed
 *   9.  Add + Table        — saved location appears in table with correct data
 *  10.  Edit Modal         — Edit opens pre-filled; Cancel warning on discard
 *  11.  Page Summary Stats — totals bar updates after adding locations
 *  12.  Tab Navigation     — switch between Location Data / Location Summary
 *
 * ── SUBMISSION STRATEGY ───────────────────────────────────────────────────────
 *
 *   One submission per describe block (created in beforeAll).
 *   Page navigated fresh in beforeEach so every test starts from a clean state.
 *
 * ── SELECTOR SETUP REQUIRED ───────────────────────────────────────────────────
 *
 *   Replace all YOUR_*_SELECTOR in LocationManagementPage.ts with actual
 *   application selectors before running these tests.
 *   Quick method — paste in the browser console while on the page:
 *     [...document.querySelectorAll('[id]')].map(e=>e.id).filter(Boolean)
 */

// ─────────────────────────────────────────────────────────────────────────────
// DESCRIBE: Page Load & Empty State
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Location Management — Page Load', () => {

  let submissionCtx!: SubmissionContext;

  test.beforeAll(async ({ browser }) => {
    submissionCtx = await SubmissionSetupService.createAndStoreContext(browser, Role.UW);
  });

  test.beforeEach(async ({ submissionOverview }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);
    await submissionOverview.waitUntilLoaded();
    await submissionOverview.clickLocationManagement();
  });

  // ── 1. Page Load ────────────────────────────────────────────────────────────

  test('should load Location Management page from sidebar', async ({
    locationManagementPage,
  }) => {
    await locationManagementPage.verifyPageLoaded();
  });

  // ── 2. Tabs ─────────────────────────────────────────────────────────────────

  test('should show Location Data and Location Summary tabs', async ({
    locationManagementPage,
  }) => {
    await locationManagementPage.verifyPageLoaded();

    await expect(
      locationManagementPage.locationDataTab,
      'Location Data tab should be visible'
    ).toBeVisible();

    await expect(
      locationManagementPage.locationSummaryTab,
      'Location Summary tab should be visible'
    ).toBeVisible();
  });

  // ── 3. Empty Table ───────────────────────────────────────────────────────────

  test('should show empty-table placeholder when no locations added', async ({
    locationManagementPage,
  }) => {
    await locationManagementPage.verifyPageLoaded();
    await locationManagementPage.assertTableIsEmpty();
  });

  test('should show Add New, Upload and Export buttons', async ({
    locationManagementPage,
  }) => {
    await locationManagementPage.verifyPageLoaded();

    await expect(
      locationManagementPage.addNewButton,
      '"+ Add New" button should be visible'
    ).toBeVisible();

    await expect(
      locationManagementPage.uploadButton,
      '"Upload" button should be visible'
    ).toBeVisible();

    await expect(
      locationManagementPage.exportButton,
      '"Export" button should be visible'
    ).toBeVisible();
  });

  test('should show HQ Location Designation section', async ({
    locationManagementPage,
  }) => {
    await locationManagementPage.verifyPageLoaded();

    await expect(
      locationManagementPage.hqSaveAddressButton,
      '"Save HQ Address" button should be visible'
    ).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DESCRIBE: Add Location Modal
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Location Management — Add Location Modal', () => {

  let submissionCtx!: SubmissionContext;

  test.beforeAll(async ({ browser }) => {
    submissionCtx = await SubmissionSetupService.createAndStoreContext(browser, Role.UW);
  });

  test.beforeEach(async ({ submissionOverview, locationManagementPage }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);
    await submissionOverview.waitUntilLoaded();
    await submissionOverview.clickLocationManagement();
    await locationManagementPage.verifyPageLoaded();
  });

  // ── 4. Add Modal Opens ───────────────────────────────────────────────────────

  test('should open "Add Location Data" modal when + Add New is clicked', async ({
    locationManagementPage,
  }) => {
    await locationManagementPage.clickAddNew();

    await expect(
      locationManagementPage.locationModal,
      'Modal should become visible after clicking Add New'
    ).toBeVisible();

    await expect(
      locationManagementPage.modalTitle,
      'Modal title should be "Add Location Data"'
    ).toContainText('Add Location Data');
  });

  test('should auto-generate LOCATION NO. when modal opens', async ({
    locationManagementPage,
  }) => {
    await locationManagementPage.clickAddNew();
    const locationNo = await locationManagementPage.readAutoGeneratedLocationNo();

    expect(
      locationNo.length,
      'Location No. should be non-empty'
    ).toBeGreaterThan(0);
  });

  test('should close modal when Cancel is clicked with no data entered', async ({
    locationManagementPage,
  }) => {
    await locationManagementPage.clickAddNew();
    await locationManagementPage.clickCancel();

    await expect(
      locationManagementPage.locationModal,
      'Modal should close after Cancel'
    ).toBeHidden();
  });

  // ── 5. Country → State ──────────────────────────────────────────────────────

  test('should enable State/Province dropdown after Country = USA is selected', async ({
    locationManagementPage,
  }) => {
    await locationManagementPage.clickAddNew();
    await locationManagementPage.selectCountry('USA');

    await expect(
      locationManagementPage.modalStateDropdown.container,
      'State/Province dropdown should be enabled after selecting USA'
    ).not.toHaveAttribute('aria-disabled', 'true');
  });

  test('should enable State/Province dropdown after Country = Canada is selected', async ({
    locationManagementPage,
  }) => {
    await locationManagementPage.clickAddNew();
    await locationManagementPage.selectCountry('Canada');

    await expect(
      locationManagementPage.modalStateDropdown.container,
      'State/Province dropdown should be enabled after selecting Canada'
    ).not.toHaveAttribute('aria-disabled', 'true');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DESCRIBE: Validation
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Location Management — Validation', () => {

  let submissionCtx!: SubmissionContext;

  test.beforeAll(async ({ browser }) => {
    submissionCtx = await SubmissionSetupService.createAndStoreContext(browser, Role.UW);
  });

  test.beforeEach(async ({ submissionOverview, locationManagementPage }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);
    await submissionOverview.waitUntilLoaded();
    await submissionOverview.clickLocationManagement();
    await locationManagementPage.verifyPageLoaded();
    await locationManagementPage.clickAddNew();
    // Modal is now open — all validation tests start here
  });

  // ── 6. Validation: Required Fields ──────────────────────────────────────────

  test('should show Country required error when field is blurred without selection', async ({
    locationManagementPage,
  }) => {
    await locationManagementPage.modalCountryDropdown.input.press('Tab');
    await locationManagementPage.assertCountryRequiredError();
  });

  test('should show Address required error when field is blurred empty', async ({
    locationManagementPage,
  }) => {
    await locationManagementPage.modalAddress.press('Tab');
    await locationManagementPage.assertAddressRequiredError();
  });

  test('should show City required error when field is blurred empty', async ({
    locationManagementPage,
  }) => {
    await locationManagementPage.modalCity.press('Tab');
    await locationManagementPage.assertCityRequiredError();
  });

  test('should show State/Province required error when field is blurred without selection', async ({
    locationManagementPage,
  }) => {
    await locationManagementPage.modalStateDropdown.input.press('Tab');
    await locationManagementPage.assertStateProvinceRequiredError();
  });

  test('should show ZIP required error when field is blurred empty', async ({
    locationManagementPage,
  }) => {
    await locationManagementPage.modalZip.press('Tab');
    await locationManagementPage.assertZipRequiredError();
  });

  // ── 6b. Validation: ZIP Pattern ─────────────────────────────────────────────

  test('should show ZIP pattern error when an invalid US ZIP is entered', async ({
    locationManagementPage,
  }) => {
    await locationManagementPage.selectCountry('USA');
    await locationManagementPage.fillZipPostalCode('ABCDE'); // letters are not valid US ZIP
    await locationManagementPage.assertZipPatternError();
  });

  // ── 7. Save Button State ─────────────────────────────────────────────────────

  test('should keep Save button disabled when modal first opens (no fields filled)', async ({
    locationManagementPage,
  }) => {
    await locationManagementPage.assertSaveButtonDisabled();
  });

  test('should enable Save button once all required fields are filled', async ({
    locationManagementPage,
  }) => {
    const data = LocationFactory.usaMinimal();

    await locationManagementPage.selectCountry(data.country);
    await locationManagementPage.fillAddress(data.address);
    await locationManagementPage.fillCity(data.city);
    await locationManagementPage.selectStateProvince(data.stateProvince);
    await locationManagementPage.fillZipPostalCode(data.zipPostalCode);
    await locationManagementPage.selectSprinklered(data.sprinklered);

    await locationManagementPage.assertSaveButtonEnabled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DESCRIBE: Auto-Calculation
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Location Management — Auto-Calculation', () => {

  let submissionCtx!: SubmissionContext;

  test.beforeAll(async ({ browser }) => {
    submissionCtx = await SubmissionSetupService.createAndStoreContext(browser, Role.UW);
  });

  test.beforeEach(async ({ submissionOverview, locationManagementPage }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);
    await submissionOverview.waitUntilLoaded();
    await submissionOverview.clickLocationManagement();
    await locationManagementPage.verifyPageLoaded();
    await locationManagementPage.clickAddNew();
    // Modal open — ready for value entry
  });

  // ── 8. Auto-Calculation ──────────────────────────────────────────────────────

  test('should auto-calculate PROPERTY DAMAGE TOTAL LIMIT = sum of all value fields', async ({
    locationManagementPage,
  }) => {
    // 6 fields × $90 = $540
    await locationManagementPage.fillBuildingValue('90');
    await locationManagementPage.fillContentsValue('90');
    await locationManagementPage.fillStocksValue('90');
    await locationManagementPage.fillMachineryValue('90');
    await locationManagementPage.fillEdp('90');
    await locationManagementPage.fillOtherDollar('90');

    // Allow a short moment for the calculation to propagate in the UI
    await locationManagementPage.waitMs(500);

    await locationManagementPage.assertPropertyDamageTotal('540');
  });

  test('should auto-calculate BI/EE TOTAL = Business Interruption + Extra Expense', async ({
    locationManagementPage,
  }) => {
    await locationManagementPage.fillBusinessInterruption('90');
    await locationManagementPage.fillExtraExpense('90');

    await locationManagementPage.waitMs(500);

    await locationManagementPage.assertBiEeTotal('180');
  });

  test('should auto-calculate LOCATION TOTAL = PD Total + BI/EE Total', async ({
    locationManagementPage,
  }) => {
    // PD: 90×6 = 540 | BI/EE: 90+0 = 90 → Location Total = 630
    await locationManagementPage.fillBuildingValue('90');
    await locationManagementPage.fillContentsValue('90');
    await locationManagementPage.fillStocksValue('90');
    await locationManagementPage.fillMachineryValue('90');
    await locationManagementPage.fillEdp('90');
    await locationManagementPage.fillOtherDollar('90');
    await locationManagementPage.fillBusinessInterruption('90');

    await locationManagementPage.waitMs(500);

    await locationManagementPage.assertPropertyDamageTotal('540');
    await locationManagementPage.assertBiEeTotal('90');
    await locationManagementPage.assertLocationTotal('630');
  });

  test('should show $0 / empty for auto-calculated fields when no values entered', async ({
    locationManagementPage,
  }) => {
    // Nothing filled — all calculated fields should be zero or empty
    const calculated = await locationManagementPage.getCalculatedValues();

    // Application may render as '', '0', '$0', or '$ ' — all are acceptable
    const zeroPatterns = ['', '0', '$0', '$ '];
    expect(
      zeroPatterns,
      `Property Damage Total should be $0 when no values entered`
    ).toContain(calculated.propertyDamageTotalLimit);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DESCRIBE: Save Location & Table
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Location Management — Save and Table', () => {

  let submissionCtx!: SubmissionContext;

  test.beforeAll(async ({ browser }) => {
    submissionCtx = await SubmissionSetupService.createAndStoreContext(browser, Role.UW);
  });

  test.beforeEach(async ({ submissionOverview, locationManagementPage }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);
    await submissionOverview.waitUntilLoaded();
    await submissionOverview.clickLocationManagement();
    await locationManagementPage.verifyPageLoaded();
  });

  // ── 9. Add + Table ───────────────────────────────────────────────────────────

  test('should add a location and display it in the table', async ({
    locationManagementPage,
  }) => {
    const locationNo = await locationManagementPage.addLocation(
      LocationFactory.usaMinimal()
    );

    await locationManagementPage.assertTableHasLocations();
    await locationManagementPage.assertLocationInTableById(locationNo);
  });

  test('should display correct city, state and country in table after adding location', async ({
    locationManagementPage,
  }) => {
    const data = LocationFactory.usaFull();
    const locationNo = await locationManagementPage.addLocation(data);

    await locationManagementPage.assertTableRow(locationNo, {
      city:          data.city,
      stateProvince: data.stateProvince,
      country:       data.country,
    });
  });

  test('should display correct TOTAL PD in table after adding location with values', async ({
    locationManagementPage,
  }) => {
    // usaFull() has 6 value fields at $90 each → PD = $540
    const data = LocationFactory.usaFull();
    const locationNo = await locationManagementPage.addLocation(data);

    await locationManagementPage.assertTableRow(locationNo, {
      totalPd: '540',
    });
  });

  test('should add a Canadian location and display it in the table', async ({
    locationManagementPage,
  }) => {
    const data = LocationFactory.canada();
    const locationNo = await locationManagementPage.addLocation(data);

    await locationManagementPage.assertTableRow(locationNo, {
      country:       data.country,
      city:          data.city,
      zipPostalCode: data.zipPostalCode,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DESCRIBE: Edit Location
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Location Management — Edit Location', () => {

  let submissionCtx!: SubmissionContext;

  test.beforeAll(async ({ browser }) => {
    submissionCtx = await SubmissionSetupService.createAndStoreContext(browser, Role.UW);
  });

  /**
   * beforeEach adds a fresh location and stores its ID so every edit test
   * starts with a known, independent location.  Tests within this describe
   * run sequentially (no `test.describe.parallel()`), so each test gets its
   * own location and does not affect the others.
   */
  test.beforeEach(async ({ submissionOverview, locationManagementPage }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);
    await submissionOverview.waitUntilLoaded();
    await submissionOverview.clickLocationManagement();
    await locationManagementPage.verifyPageLoaded();
  });

  // ── 10. Edit Modal ───────────────────────────────────────────────────────────

  test('should open "Edit Location Data" modal when Edit icon is clicked', async ({
    locationManagementPage,
  }) => {
    // Add a location first so there is a row to edit
    const locationNo = await locationManagementPage.addLocation(
      LocationFactory.usaMinimal()
    );

    await locationManagementPage.clickEditForLocation(locationNo);

    await expect(
      locationManagementPage.modalTitle,
      'Modal title should be "Edit Location Data"'
    ).toContainText('Edit Location Data');
  });

  test('should show Cancel warning dialog when Cancel is clicked after editing', async ({
    locationManagementPage,
  }) => {
    const locationNo = await locationManagementPage.addLocation(
      LocationFactory.usaMinimal()
    );
    await locationManagementPage.clickEditForLocation(locationNo);

    // Make a change so the app knows something was modified
    await locationManagementPage.fillCity('Changed City');

    // Click Cancel — warning dialog should appear
    await locationManagementPage.modalCancelButton.click();

    await expect(
      locationManagementPage.cancelWarningDialog,
      'Warning dialog should appear when cancelling an Edit with unsaved changes'
    ).toBeVisible();
  });

  test('should keep modal open when "No" is clicked on Cancel warning', async ({
    locationManagementPage,
  }) => {
    const locationNo = await locationManagementPage.addLocation(
      LocationFactory.usaMinimal()
    );
    await locationManagementPage.clickEditForLocation(locationNo);
    await locationManagementPage.fillCity('Changed City');

    await locationManagementPage.cancelAndKeepOpen();

    await expect(
      locationManagementPage.locationModal,
      'Modal should remain open after clicking No on warning dialog'
    ).toBeVisible();
  });

  test('should close modal and discard changes when "Yes" is clicked on Cancel warning', async ({
    locationManagementPage,
  }) => {
    const locationNo = await locationManagementPage.addLocation(
      LocationFactory.usaMinimal()
    );
    await locationManagementPage.clickEditForLocation(locationNo);
    await locationManagementPage.fillCity('Changed City');

    await locationManagementPage.cancelAndConfirmDiscard();

    await expect(
      locationManagementPage.locationModal,
      'Modal should close after confirming discard'
    ).toBeHidden();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DESCRIBE: Page Summary Stats
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Location Management — Page Summary Stats', () => {

  let submissionCtx!: SubmissionContext;

  test.beforeAll(async ({ browser }) => {
    submissionCtx = await SubmissionSetupService.createAndStoreContext(browser, Role.UW);
  });

  test.beforeEach(async ({ submissionOverview, locationManagementPage }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);
    await submissionOverview.waitUntilLoaded();
    await submissionOverview.clickLocationManagement();
    await locationManagementPage.verifyPageLoaded();
  });

  // ── 11. Page Summary Stats ───────────────────────────────────────────────────

  test('should reflect Total Locations count in summary bar after adding a location', async ({
    locationManagementPage,
  }) => {
    const countBefore = await locationManagementPage.getLocationCount();

    await locationManagementPage.addLocation(LocationFactory.usaMinimal());

    await locationManagementPage.assertLocationCount(countBefore + 1);
  });

  test('should include the new location\'s PD value in Total PD after adding', async ({
    locationManagementPage,
  }) => {
    // usaFull() → PD = $540
    await locationManagementPage.addLocation(LocationFactory.usaFull());

    const summary = await locationManagementPage.getPageSummary();
    expect(
      summary.totalPd,
      'Total PD in summary bar should include the location\'s $540 contribution'
    ).toContain('540');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DESCRIBE: Tab Navigation
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Location Management — Tab Navigation', () => {

  let submissionCtx!: SubmissionContext;

  test.beforeAll(async ({ browser }) => {
    submissionCtx = await SubmissionSetupService.createAndStoreContext(browser, Role.UW);
  });

  test.beforeEach(async ({ submissionOverview, locationManagementPage }) => {
    await submissionOverview.navigateByUrl(submissionCtx.submissionUrl);
    await submissionOverview.waitUntilLoaded();
    await submissionOverview.clickLocationManagement();
    await locationManagementPage.verifyPageLoaded();
  });

  // ── 12. Tab Navigation ───────────────────────────────────────────────────────

  test('should switch to Location Summary tab when clicked', async ({
    locationManagementPage,
  }) => {
    await locationManagementPage.clickLocationSummaryTab();

    // Tab becomes active — class name varies by app; adjust pattern if needed
    await expect(
      locationManagementPage.locationSummaryTab,
      'Location Summary tab should become active'
    ).toHaveClass(/active|selected|is-active/);
  });

  test('should return to Location Data tab when Location Data tab is clicked', async ({
    locationManagementPage,
  }) => {
    await locationManagementPage.clickLocationSummaryTab();
    await locationManagementPage.clickLocationDataTab();

    // "Add New" button lives on Location Data tab — its visibility confirms we are back
    await expect(
      locationManagementPage.addNewButton,
      '"+ Add New" button should be visible on Location Data tab'
    ).toBeVisible();
  });
});
