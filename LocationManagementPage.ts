import { Page, Locator, expect } from '@playwright/test';
import { BasePage }               from './base/BasePage';
import { DropdownComponent }      from '../components/DropdownComponent';
import {
  LocationData,
  LocationTableRow,
  LocationTableFilter,
  LocationPageSummary,
  LocationCalculatedValues,
  HqDesignationMode,
  HqAddressData,
} from '../types/location.types';

/**
 * LocationManagementPage
 *
 * ── PAGE STRUCTURE ────────────────────────────────────────────────────────────
 *
 *   Accessed via: Sidebar → Underwriting File → Location Management
 *   (No direct URL — always navigate from SubmissionOverviewPage)
 *
 *   TWO TABS:
 *   ┌──────────────────────────────────────────────────────────────────────┐
 *   │  [ Location Data ]  [ Location Summary ]                             │
 *   ├──────────────────────────────────────────────────────────────────────┤
 *   │  Total Locations: 1 | Total Value: $720 | Total BI: $180 | ...       │
 *   │  [VERISK]  [COTALITY]                                                │
 *   ├──────────────────────────────────────────────────────────────────────┤
 *   │  HQ Location Designation                                             │
 *   │    ○ Select HQ From Existing Risk Locations                          │
 *   │    ● HQ Is Not A Risk Location                                       │
 *   │    [Set As HQ]  LOCATION NO: [...]  COUNTRY: [...]  ADDRESS: [...]   │
 *   │    STATE/PROVINCE: [...]  ZIP/POSTAL CODE: [...]                     │
 *   │    [Save HQ Address]                                                 │
 *   ├──────────────────────────────────────────────────────────────────────┤
 *   │  Locations                     [Template.xlsx] [+Add New] [Upload]  │
 *   │  [Export]                                                            │
 *   │  TYPE | LOCATION ID | ADDRESS | ADDR 2 | CITY | STATE | ZIP | ...   │
 *   │  (No locations added yet)                                            │
 *   └──────────────────────────────────────────────────────────────────────┘
 *
 *   ADD / EDIT LOCATION MODAL (right-side overlay, scrollable):
 *   ┌────────────────────────────────────────────────────────────────────┐
 *   │  Add Location Data                                                 │
 *   │                                                                    │
 *   │  LOCATION NO.[auto]  COUNTRY *[dropdown]  BUILDING NO.[text]      │
 *   │  ADDRESS *[text]           ADDRESS 2[text]                         │
 *   │  CITY *[text]              STATE/PROVINCE *[dropdown]              │
 *   │  ZIP/POSTAL CODE *[text]   COUNTY[text, auto-populated]            │
 *   │  OCCUPANCY CODE[dropdown][Clear]  CONSTRUCTION DESC[text]          │
 *   │  PROTECTION CLASS[read-only]                                       │
 *   │  ┌─[red warning] ALL of the following required for Casualty/TIV──┐ │
 *   │  │ TOTALITY OCCUPANCY[dropdown][Clear]                            │ │
 *   │  │ CONSTRUCTION ISO CODE *[dropdown][Clear]  YEAR BUILT[text]    │ │
 *   │  │ [Totality Occupancy Code.pdf link]                            │ │
 *   │  └────────────────────────────────────────────────────────────────┘ │
 *   │  NO. OF STORIES[text]  AREA (SQ.FT.)[text]  SPRINKLERED *[○Yes ●No]│
 *   │                                                                    │
 *   │  BUILDING VALUE $    CONTENTS VALUE $    STOCKS VALUE $            │
 *   │  MACHINERY VALUE $   EDP $               OTHER (DESCRIPTION)[text] │
 *   │  OTHER ($) $                                                       │
 *   │  PROPERTY DAMAGE TOTAL LIMIT $[AUTO]  BUSINESS INTERRUPTION $     │
 *   │  EXTRA EXPENSE $   BI/EE TOTAL $[AUTO]   LOCATION TOTAL $[AUTO]   │
 *   │  BUILDING ITV $[AUTO]  COTALITY BLDG VALUE $[AUTO]                │
 *   │  COTALITY TIV ($/SQ.FT.) $[AUTO]  ITV RATIO %[x]                 │
 *   │  CRIME CAP INDEX[text]                                             │
 *   │  DESCRIPTION[textarea]                                             │
 *   │                                    [Cancel]  [Save]               │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 * ── AUTO-CALCULATED FIELDS ───────────────────────────────────────────────────
 *
 *   DO NOT fill these — the app calculates them automatically:
 *     PROPERTY DAMAGE TOTAL LIMIT = Building + Contents + Stocks + Machinery + EDP + Other($)
 *     BI/EE TOTAL                 = Business Interruption + Extra Expense
 *     LOCATION TOTAL              = PD Total + BI/EE Total
 *     BUILDING ITV                = Building Value / Area (Sq.Ft.)
 *
 * ── SETUP REQUIRED ────────────────────────────────────────────────────────────
 *
 *   Replace all YOUR_*_SELECTOR with actual selectors.
 *   To find a selector:
 *     1. Open app in Chrome → right-click field → Inspect
 *     2. Look for id="..." or data-testid="..."
 *     3. Use page.locator('#id') or page.locator('[data-testid="x"]')
 *
 *   QUICK WAY: Run this in the browser console to list all field IDs:
 *     [...document.querySelectorAll('[id]')].map(e => e.id).filter(Boolean)
 */
export class LocationManagementPage extends BasePage {

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE-LEVEL LOCATORS
  //
  // Intentionally `readonly` (public) so spec files can write direct
  // `expect(page.someLocator).toBeVisible()` assertions without boilerplate
  // wrapper methods for every single element.  Business logic still lives
  // in the high-level methods below — locators are just handles.
  // ═══════════════════════════════════════════════════════════════════════════

  /** "Location Management" heading — confirms we are on the right page */
  readonly pageHeading:           Locator;

  // ── TABS ──────────────────────────────────────────────────────────────────
  readonly locationDataTab:       Locator;
  readonly locationSummaryTab:    Locator;

  // ── SUMMARY STATS BAR (visible when ≥1 location exists) ──────────────────
  readonly statTotalLocations:    Locator;
  readonly statTotalValue:        Locator;
  readonly statTotalBi:           Locator;
  readonly statTotalPd:           Locator;
  readonly veriskButton:          Locator;
  readonly cotalityButton:        Locator;

  // ═══════════════════════════════════════════════════════════════════════════
  // HQ LOCATION DESIGNATION SECTION
  // ═══════════════════════════════════════════════════════════════════════════

  readonly hqRadioSelectExisting: Locator;  // "Select HQ From Existing Risk Locations"
  readonly hqRadioNotALocation:   Locator;  // "HQ Is Not A Risk Location"
  readonly hqSelectDropdown:      DropdownComponent;
  readonly hqSetAsHqButton:       Locator;
  readonly hqLocationNoInput:     Locator;
  readonly hqCountryDropdown:     DropdownComponent;
  readonly hqAddressInput:        Locator;
  readonly hqStateDropdown:       DropdownComponent;
  readonly hqZipInput:            Locator;
  readonly hqSaveAddressButton:   Locator;

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCATIONS TABLE SECTION
  // ═══════════════════════════════════════════════════════════════════════════

  readonly locationsTableSection: Locator;
  readonly addNewButton:          Locator;
  readonly uploadButton:          Locator;
  readonly exportButton:          Locator;
  readonly templateLink:          Locator;
  readonly locationsTable:        Locator;
  readonly noLocationsText:       Locator;

  // ═══════════════════════════════════════════════════════════════════════════
  // ADD / EDIT LOCATION MODAL — CONTAINER
  // ═══════════════════════════════════════════════════════════════════════════

  /** The modal overlay — wait for this to be visible after clicking + Add New */
  readonly locationModal:         Locator;

  /** The modal's title text — confirms whether we are in Add vs Edit mode */
  readonly modalTitle:            Locator;

  // ── MODAL: SECTION 1 — Basic Info ────────────────────────────────────────

  /** auto-generated, READ-ONLY — e.g. '005' */
  readonly modalLocationNo:       Locator;

  /** dropdown: USA / Canada */
  readonly modalCountryDropdown:  DropdownComponent;

  /** text input — building number e.g. '3' */
  readonly modalBuildingNo:       Locator;

  /** text — required */
  readonly modalAddress:          Locator;

  /** text — optional */
  readonly modalAddress2:         Locator;

  /** text — required */
  readonly modalCity:             Locator;

  /** dropdown — depends on Country */
  readonly modalStateDropdown:    DropdownComponent;

  /** text — required — validated against pattern */
  readonly modalZip:              Locator;

  /** text — auto-populated after ZIP is entered */
  readonly modalCounty:           Locator;

  // ── MODAL: SECTION 2 — Property Details ──────────────────────────────────

  /** dropdown + Clear button */
  readonly modalOccupancyCode:    DropdownComponent;
  readonly modalOccupancyClear:   Locator;

  /** text — free-form */
  readonly modalConstructionDesc: Locator;

  /** READ-ONLY — auto-calculated from ZIP/address */
  readonly modalProtectionClass:  Locator;

  // ── MODAL: SECTION 3 — Casualty / TIV Calculation ────────────────────────

  /** dropdown + Clear button — required for Casualty/TIV calculation */
  readonly modalTotalityOccupancy:  DropdownComponent;
  readonly modalTotalityOccClear:   Locator;

  /** dropdown + Clear button — ISO code — required for Casualty/TIV */
  readonly modalConstructionIso:    DropdownComponent;
  readonly modalConstructionIsoClear: Locator;

  /** text — e.g. '1999' */
  readonly modalYearBuilt:          Locator;

  // ── MODAL: SECTION 4 — Physical Attributes ───────────────────────────────

  readonly modalNoOfStories:      Locator;
  readonly modalAreaSqFt:         Locator;

  /** radio button group — SPRINKLERED */
  readonly modalSprinkleredYes:   Locator;
  readonly modalSprinkleredNo:    Locator;

  // ── MODAL: SECTION 5 — Values (Input) ────────────────────────────────────

  readonly modalBuildingValue:    Locator;
  readonly modalContentsValue:    Locator;
  readonly modalStocksValue:      Locator;
  readonly modalMachineryValue:   Locator;
  readonly modalEdp:              Locator;
  readonly modalOtherDescription: Locator;  // text label for Other
  readonly modalOtherDollar:      Locator;  // $ amount for Other

  // ── MODAL: SECTION 6 — Values (Auto-Calculated — READONLY) ───────────────
  //
  // DO NOT fill these — assert them only.

  readonly modalPropertyDamageTotal:    Locator;  // = BV + CV + SV + MV + EDP + Other
  readonly modalBusinessInterruption:   Locator;  // INPUT (not auto)
  readonly modalExtraExpense:           Locator;  // INPUT (not auto)
  readonly modalBiEeTotal:              Locator;  // = BI + EE (AUTO)
  readonly modalLocationTotal:          Locator;  // = PD + BI/EE (AUTO)
  readonly modalBuildingItv:            Locator;  // = BV / Area (AUTO)
  readonly modalTotalityBuildingValue:  Locator;  // AUTO
  readonly modalTotalityTivPerSqFt:     Locator;  // AUTO

  // ── MODAL: SECTION 7 — Additional Fields ─────────────────────────────────

  /** % ratio — dropdown/text with "x" clear */
  readonly modalItvRatio:         Locator;
  readonly modalItvRatioClear:    Locator;

  /** text */
  readonly modalCrimeCap:         Locator;

  /** textarea with expand button */
  readonly modalDescription:      Locator;

  // ── MODAL: BUTTONS ────────────────────────────────────────────────────────

  readonly modalCancelButton:     Locator;
  readonly modalSaveButton:       Locator;

  // ── MODAL: VALIDATION ERRORS ─────────────────────────────────────────────

  readonly errCountry:            Locator;
  readonly errAddress:            Locator;
  readonly errCity:               Locator;
  readonly errStateProvince:      Locator;
  readonly errZip:                Locator;
  readonly errZipPattern:         Locator;
  readonly errConstructionIso:    Locator;

  // ── CANCEL WARNING DIALOG ─────────────────────────────────────────────────

  /** Warning shown when clicking Cancel on the Edit modal */
  readonly cancelWarningDialog:   Locator;
  readonly cancelWarningYes:      Locator;
  readonly cancelWarningNo:       Locator;

  constructor(page: Page) {
    super(page);

    // ── Page-level ────────────────────────────────────────────────────────────
    this.pageHeading         = page.locator('YOUR_LOCATION_MANAGEMENT_HEADING_SELECTOR');
    this.locationDataTab     = page.locator('YOUR_LOCATION_DATA_TAB_SELECTOR');
    this.locationSummaryTab  = page.locator('YOUR_LOCATION_SUMMARY_TAB_SELECTOR');

    // ── Summary stats bar ─────────────────────────────────────────────────────
    this.statTotalLocations  = page.locator('YOUR_STAT_TOTAL_LOCATIONS_SELECTOR');
    this.statTotalValue      = page.locator('YOUR_STAT_TOTAL_VALUE_SELECTOR');
    this.statTotalBi         = page.locator('YOUR_STAT_TOTAL_BI_SELECTOR');
    this.statTotalPd         = page.locator('YOUR_STAT_TOTAL_PD_SELECTOR');
    this.veriskButton        = page.locator('YOUR_VERISK_BUTTON_SELECTOR');
    this.cotalityButton      = page.locator('YOUR_COTALITY_BUTTON_SELECTOR');

    // ── HQ Location Designation ──────────────────────────────────────────────
    this.hqRadioSelectExisting = page.locator('YOUR_HQ_RADIO_SELECT_EXISTING_SELECTOR');
    this.hqRadioNotALocation   = page.locator('YOUR_HQ_RADIO_NOT_A_LOCATION_SELECTOR');
    this.hqSelectDropdown      = new DropdownComponent(
      page,
      page.locator('YOUR_HQ_SELECT_DROPDOWN_CONTAINER'),
      page.locator('YOUR_HQ_SELECT_DROPDOWN_INPUT'),
    );
    this.hqSetAsHqButton       = page.locator('YOUR_HQ_SET_AS_HQ_BUTTON_SELECTOR');
    this.hqLocationNoInput     = page.locator('YOUR_HQ_LOCATION_NO_INPUT_SELECTOR');
    this.hqCountryDropdown     = new DropdownComponent(
      page,
      page.locator('YOUR_HQ_COUNTRY_DROPDOWN_CONTAINER'),
      page.locator('YOUR_HQ_COUNTRY_DROPDOWN_INPUT'),
    );
    this.hqAddressInput        = page.locator('YOUR_HQ_ADDRESS_INPUT_SELECTOR');
    this.hqStateDropdown       = new DropdownComponent(
      page,
      page.locator('YOUR_HQ_STATE_DROPDOWN_CONTAINER'),
      page.locator('YOUR_HQ_STATE_DROPDOWN_INPUT'),
    );
    this.hqZipInput            = page.locator('YOUR_HQ_ZIP_INPUT_SELECTOR');
    this.hqSaveAddressButton   = page.locator('YOUR_HQ_SAVE_ADDRESS_BUTTON_SELECTOR');

    // ── Locations table section ───────────────────────────────────────────────
    this.locationsTableSection = page.locator('YOUR_LOCATIONS_SECTION_SELECTOR');
    this.addNewButton          = page.locator('YOUR_LOCATION_ADD_NEW_BUTTON_SELECTOR');
    this.uploadButton          = page.locator('YOUR_LOCATION_UPLOAD_BUTTON_SELECTOR');
    this.exportButton          = page.locator('YOUR_LOCATION_EXPORT_BUTTON_SELECTOR');
    this.templateLink          = page.locator('YOUR_LOCATION_TEMPLATE_LINK_SELECTOR');
    this.locationsTable        = page.locator('YOUR_LOCATIONS_TABLE_SELECTOR');
    this.noLocationsText       = page.locator('YOUR_NO_LOCATIONS_TEXT_SELECTOR');

    // ── Modal container ───────────────────────────────────────────────────────
    this.locationModal         = page.locator('YOUR_LOCATION_MODAL_SELECTOR');
    this.modalTitle            = page.locator('YOUR_LOCATION_MODAL_TITLE_SELECTOR');

    // ── Modal: Section 1 — Basic Info ─────────────────────────────────────────
    this.modalLocationNo       = page.locator('YOUR_MODAL_LOCATION_NO_SELECTOR');
    this.modalCountryDropdown  = new DropdownComponent(
      page,
      page.locator('YOUR_MODAL_COUNTRY_CONTAINER'),
      page.locator('YOUR_MODAL_COUNTRY_INPUT'),
    );
    this.modalBuildingNo       = page.locator('YOUR_MODAL_BUILDING_NO_SELECTOR');
    this.modalAddress          = page.locator('YOUR_MODAL_ADDRESS_SELECTOR');
    this.modalAddress2         = page.locator('YOUR_MODAL_ADDRESS2_SELECTOR');
    this.modalCity             = page.locator('YOUR_MODAL_CITY_SELECTOR');
    this.modalStateDropdown    = new DropdownComponent(
      page,
      page.locator('YOUR_MODAL_STATE_CONTAINER'),
      page.locator('YOUR_MODAL_STATE_INPUT'),
    );
    this.modalZip              = page.locator('YOUR_MODAL_ZIP_SELECTOR');
    this.modalCounty           = page.locator('YOUR_MODAL_COUNTY_SELECTOR');

    // ── Modal: Section 2 — Property Details ───────────────────────────────────
    this.modalOccupancyCode    = new DropdownComponent(
      page,
      page.locator('YOUR_MODAL_OCCUPANCY_CODE_CONTAINER'),
      page.locator('YOUR_MODAL_OCCUPANCY_CODE_INPUT'),
    );
    this.modalOccupancyClear   = page.locator('YOUR_MODAL_OCCUPANCY_CLEAR_BUTTON');
    this.modalConstructionDesc = page.locator('YOUR_MODAL_CONSTRUCTION_DESC_SELECTOR');
    this.modalProtectionClass  = page.locator('YOUR_MODAL_PROTECTION_CLASS_SELECTOR');

    // ── Modal: Section 3 — Casualty / TIV ─────────────────────────────────────
    this.modalTotalityOccupancy = new DropdownComponent(
      page,
      page.locator('YOUR_MODAL_TOTALITY_OCC_CONTAINER'),
      page.locator('YOUR_MODAL_TOTALITY_OCC_INPUT'),
    );
    this.modalTotalityOccClear     = page.locator('YOUR_MODAL_TOTALITY_OCC_CLEAR_BUTTON');
    this.modalConstructionIso      = new DropdownComponent(
      page,
      page.locator('YOUR_MODAL_CONSTRUCTION_ISO_CONTAINER'),
      page.locator('YOUR_MODAL_CONSTRUCTION_ISO_INPUT'),
    );
    this.modalConstructionIsoClear = page.locator('YOUR_MODAL_CONSTRUCTION_ISO_CLEAR_BUTTON');
    this.modalYearBuilt            = page.locator('YOUR_MODAL_YEAR_BUILT_SELECTOR');

    // ── Modal: Section 4 — Physical Attributes ────────────────────────────────
    this.modalNoOfStories      = page.locator('YOUR_MODAL_NO_OF_STORIES_SELECTOR');
    this.modalAreaSqFt         = page.locator('YOUR_MODAL_AREA_SQ_FT_SELECTOR');
    this.modalSprinkleredYes   = page.locator('YOUR_MODAL_SPRINKLERED_YES_RADIO');
    this.modalSprinkleredNo    = page.locator('YOUR_MODAL_SPRINKLERED_NO_RADIO');

    // ── Modal: Section 5 — Values (Input) ─────────────────────────────────────
    this.modalBuildingValue    = page.locator('YOUR_MODAL_BUILDING_VALUE_SELECTOR');
    this.modalContentsValue    = page.locator('YOUR_MODAL_CONTENTS_VALUE_SELECTOR');
    this.modalStocksValue      = page.locator('YOUR_MODAL_STOCKS_VALUE_SELECTOR');
    this.modalMachineryValue   = page.locator('YOUR_MODAL_MACHINERY_VALUE_SELECTOR');
    this.modalEdp              = page.locator('YOUR_MODAL_EDP_SELECTOR');
    this.modalOtherDescription = page.locator('YOUR_MODAL_OTHER_DESCRIPTION_SELECTOR');
    this.modalOtherDollar      = page.locator('YOUR_MODAL_OTHER_DOLLAR_SELECTOR');

    // ── Modal: Section 6 — Values (Auto-Calculated) ───────────────────────────
    this.modalPropertyDamageTotal   = page.locator('YOUR_MODAL_PROPERTY_DAMAGE_TOTAL_SELECTOR');
    this.modalBusinessInterruption  = page.locator('YOUR_MODAL_BUSINESS_INTERRUPTION_SELECTOR');
    this.modalExtraExpense          = page.locator('YOUR_MODAL_EXTRA_EXPENSE_SELECTOR');
    this.modalBiEeTotal             = page.locator('YOUR_MODAL_BI_EE_TOTAL_SELECTOR');
    this.modalLocationTotal         = page.locator('YOUR_MODAL_LOCATION_TOTAL_SELECTOR');
    this.modalBuildingItv           = page.locator('YOUR_MODAL_BUILDING_ITV_SELECTOR');
    this.modalTotalityBuildingValue = page.locator('YOUR_MODAL_TOTALITY_BUILDING_VALUE_SELECTOR');
    this.modalTotalityTivPerSqFt    = page.locator('YOUR_MODAL_TOTALITY_TIV_PER_SQFT_SELECTOR');

    // ── Modal: Section 7 — Additional ─────────────────────────────────────────
    this.modalItvRatio         = page.locator('YOUR_MODAL_ITV_RATIO_SELECTOR');
    this.modalItvRatioClear    = page.locator('YOUR_MODAL_ITV_RATIO_CLEAR_SELECTOR');
    this.modalCrimeCap         = page.locator('YOUR_MODAL_CRIME_CAP_SELECTOR');
    this.modalDescription      = page.locator('YOUR_MODAL_DESCRIPTION_SELECTOR');

    // ── Modal: Buttons ────────────────────────────────────────────────────────
    this.modalCancelButton     = page.locator('YOUR_MODAL_CANCEL_BUTTON_SELECTOR');
    this.modalSaveButton       = page.locator('YOUR_MODAL_SAVE_BUTTON_SELECTOR');

    // ── Modal: Validation errors ──────────────────────────────────────────────
    this.errCountry            = page.locator('YOUR_ERROR_COUNTRY_SELECTOR');
    this.errAddress            = page.locator('YOUR_ERROR_ADDRESS_SELECTOR');
    this.errCity               = page.locator('YOUR_ERROR_CITY_SELECTOR');
    this.errStateProvince      = page.locator('YOUR_ERROR_STATE_PROVINCE_SELECTOR');
    this.errZip                = page.locator('YOUR_ERROR_ZIP_SELECTOR');
    this.errZipPattern         = page.locator('YOUR_ERROR_ZIP_PATTERN_SELECTOR');
    this.errConstructionIso    = page.locator('YOUR_ERROR_CONSTRUCTION_ISO_SELECTOR');

    // ── Cancel warning dialog ─────────────────────────────────────────────────
    this.cancelWarningDialog   = page.locator('YOUR_CANCEL_WARNING_DIALOG_SELECTOR');
    this.cancelWarningYes      = page.locator('YOUR_CANCEL_WARNING_YES_BUTTON_SELECTOR');
    this.cancelWarningNo       = page.locator('YOUR_CANCEL_WARNING_NO_BUTTON_SELECTOR');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE LOAD & NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Waits for the given number of milliseconds.
   * Prefer named waits (waitForLoadState, expect.poll, etc.) in the page
   * object itself; this is exposed for rare cases in spec files where a
   * calculated value needs a moment to propagate.
   *
   * @param ms  Duration in milliseconds e.g. 500
   */
  async waitMs(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  /**
   * Do NOT call this directly.
   * Navigation is via: await submissionOverview.clickLocationManagement()
   * Then verify load with: await locationManagementPage.verifyPageLoaded()
   */
  async navigate(): Promise<void> {
    throw new Error(
      'LocationManagementPage has no direct URL.\n' +
      'Navigate via: await submissionOverview.clickLocationManagement()\n' +
      'Then call:    await locationManagementPage.verifyPageLoaded()'
    );
  }

  /**
   * Waits until the Location Management page has fully rendered.
   *
   * Checks:
   *   1. networkidle — no pending background API calls
   *   2. Page heading visible — confirms correct page
   */
  async verifyPageLoaded(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.pageHeading.waitFor({ state: 'visible', timeout: 15_000 });
    this.log('Location Management page loaded');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════════

  async clickLocationDataTab(): Promise<void> {
    await this.locationDataTab.click();
    await this.page.waitForLoadState('networkidle');
    this.log('Switched to Location Data tab');
  }

  async clickLocationSummaryTab(): Promise<void> {
    await this.locationSummaryTab.click();
    await this.page.waitForLoadState('networkidle');
    this.log('Switched to Location Summary tab');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY STATS BAR
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Reads the summary stats bar at the top of the Location Data tab.
   * Only visible when ≥1 location has been added.
   *
   * Returns: { totalLocations, totalValue, totalBi, totalPd }
   */
  async getPageSummary(): Promise<LocationPageSummary> {
    return {
      totalLocations: (await this.statTotalLocations.innerText()).trim(),
      totalValue:     (await this.statTotalValue.innerText()).trim(),
      totalBi:        (await this.statTotalBi.innerText()).trim(),
      totalPd:        (await this.statTotalPd.innerText()).trim(),
    };
  }

  async assertPageSummary(expected: Partial<LocationPageSummary>): Promise<void> {
    const actual = await this.getPageSummary();
    if (expected.totalLocations !== undefined) {
      expect(actual.totalLocations, `Total Locations: expected "${expected.totalLocations}"`).toBe(expected.totalLocations);
    }
    if (expected.totalPd !== undefined) {
      expect(actual.totalPd, `Total PD: expected "${expected.totalPd}"`).toContain(expected.totalPd);
    }
    if (expected.totalBi !== undefined) {
      expect(actual.totalBi, `Total BI: expected "${expected.totalBi}"`).toContain(expected.totalBi);
    }
    if (expected.totalValue !== undefined) {
      expect(actual.totalValue, `Total Value: expected "${expected.totalValue}"`).toContain(expected.totalValue);
    }
    this.log('✅ Page summary verified');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TABLE STATE
  // ═══════════════════════════════════════════════════════════════════════════

  async isTableEmpty(): Promise<boolean> {
    try {
      await this.noLocationsText.waitFor({ state: 'visible', timeout: 3_000 });
      return true;
    } catch {
      return false;
    }
  }

  async getLocationCount(): Promise<number> {
    if (await this.isTableEmpty()) return 0;
    return this.locationsTable.locator('tbody tr').count();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODAL — OPEN
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Clicks "+ Add New" to open the Add Location Data modal.
   *
   * AFTER THIS:
   *   - Modal slides in from the right
   *   - LOCATION NO. is auto-generated (read-only, blue)
   *   - All other fields are empty
   *   - Required fields are marked *
   *   - COUNTY field is empty until ZIP is entered
   */
  async clickAddNew(): Promise<void> {
    await expect(this.addNewButton, '"+ Add New" must be visible').toBeVisible();
    await this.addNewButton.click();
    await this.locationModal.waitFor({ state: 'visible', timeout: 10_000 });

    // Verify we opened the ADD modal, not the EDIT modal
    await expect(
      this.modalTitle,
      'Modal title should be "Add Location Data"'
    ).toContainText('Add Location Data');

    this.log('Add Location Data modal opened');
  }

  /**
   * Reads the auto-generated Location Number from the modal.
   * Call this IMMEDIATELY after clickAddNew(), before filling any fields.
   *
   * WHY read before filling:
   *   The system assigns the Location Number when the modal opens.
   *   Once you start filling fields, it may become harder to read.
   *
   * Returns: e.g. '005', '006'
   */
  async readAutoGeneratedLocationNo(): Promise<string> {
    // Small delay — system may need a moment to populate this
    await this.page.waitForTimeout(300);
    const value = (await this.modalLocationNo.inputValue()).trim();
    this.log(`Auto-generated Location No.: "${value}"`);
    return value;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODAL — FILL INDIVIDUAL FIELDS
  //
  // Fields listed in the order they appear in the modal (top to bottom, left to right).
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Selects the Country.
   *
   * WHY waitForLoadState after:
   *   Selecting a Country reloads the State/Province dropdown options.
   *
   * @param country - 'USA' or 'Canada'
   */
  async selectCountry(country: string): Promise<void> {
    await this.modalCountryDropdown.select(country);
    await this.page.waitForLoadState('networkidle');
    this.log(`Selected Country: ${country}`);
  }

  async fillBuildingNo(buildingNo: string): Promise<void> {
    await this.modalBuildingNo.clear();
    await this.modalBuildingNo.fill(buildingNo);
    await this.modalBuildingNo.press('Tab');
  }

  async fillAddress(address: string): Promise<void> {
    await this.modalAddress.clear();
    await this.modalAddress.fill(address);
    await this.modalAddress.press('Tab');
    this.log(`Filled Address: ${address}`);
  }

  async fillAddress2(address2: string): Promise<void> {
    await this.modalAddress2.clear();
    await this.modalAddress2.fill(address2);
    await this.modalAddress2.press('Tab');
  }

  async fillCity(city: string): Promise<void> {
    await this.modalCity.clear();
    await this.modalCity.fill(city);
    await this.modalCity.press('Tab');
    this.log(`Filled City: ${city}`);
  }

  /**
   * Selects State/Province.
   * Always call selectCountry() first — the State list depends on Country.
   */
  async selectStateProvince(state: string): Promise<void> {
    await this.modalStateDropdown.select(state);
    this.log(`Selected State/Province: ${state}`);
  }

  /**
   * Fills ZIP/Postal Code.
   *
   * WHY waitForTimeout after:
   *   After a valid ZIP is entered, the app auto-populates the COUNTY field.
   *   A short wait lets that population complete before we Tab out.
   */
  async fillZipPostalCode(zip: string): Promise<void> {
    await this.modalZip.clear();
    await this.modalZip.fill(zip);
    await this.modalZip.press('Tab');
    await this.page.waitForTimeout(500); // county auto-population
    this.log(`Filled ZIP: ${zip}`);
  }

  async selectOccupancyCode(code: string): Promise<void> {
    await this.modalOccupancyCode.select(code);
    this.log(`Selected Occupancy Code: ${code}`);
  }

  async clearOccupancyCode(): Promise<void> {
    await this.modalOccupancyClear.click();
    this.log('Cleared Occupancy Code');
  }

  async fillConstructionDescription(desc: string): Promise<void> {
    await this.modalConstructionDesc.clear();
    await this.modalConstructionDesc.fill(desc);
    await this.modalConstructionDesc.press('Tab');
  }

  // ── Casualty / TIV Calculation fields ─────────────────────────────────────

  async selectTotalityOccupancy(value: string): Promise<void> {
    await this.modalTotalityOccupancy.select(value);
    this.log(`Selected Totality Occupancy: ${value}`);
  }

  async clearTotalityOccupancy(): Promise<void> {
    await this.modalTotalityOccClear.click();
  }

  async selectConstructionIsoCode(code: string): Promise<void> {
    await this.modalConstructionIso.select(code);
    this.log(`Selected Construction ISO Code: ${code}`);
  }

  async clearConstructionIsoCode(): Promise<void> {
    await this.modalConstructionIsoClear.click();
  }

  async fillYearBuilt(year: string): Promise<void> {
    await this.modalYearBuilt.clear();
    await this.modalYearBuilt.fill(year);
    await this.modalYearBuilt.press('Tab');
    this.log(`Filled Year Built: ${year}`);
  }

  // ── Physical Attributes ────────────────────────────────────────────────────

  async fillNumberOfStories(stories: string): Promise<void> {
    await this.modalNoOfStories.clear();
    await this.modalNoOfStories.fill(stories);
    await this.modalNoOfStories.press('Tab');
  }

  /**
   * Fills Area (Sq.Ft.).
   *
   * WHY: Area is used for the BUILDING ITV auto-calculation.
   *   BUILDING ITV = BUILDING VALUE / AREA
   *   Enter this before buildingValue for the calculation to work correctly.
   */
  async fillAreaSqFt(sqFt: string): Promise<void> {
    await this.modalAreaSqFt.clear();
    await this.modalAreaSqFt.fill(sqFt);
    await this.modalAreaSqFt.press('Tab');
    this.log(`Filled Area (Sq.Ft.): ${sqFt}`);
  }

  /**
   * Selects the Sprinklered radio button.
   *
   * WHY radios (not dropdown):
   *   The application renders SPRINKLERED as two radio buttons (○ Yes  ○ No).
   *   It is NOT a dropdown.
   *
   * @param value - 'Yes' or 'No'
   */
  async selectSprinklered(value: 'Yes' | 'No'): Promise<void> {
    if (value === 'Yes') {
      await this.modalSprinkleredYes.click();
    } else {
      await this.modalSprinkleredNo.click();
    }
    this.log(`Selected Sprinklered: ${value}`);
  }

  // ── Value Fields ───────────────────────────────────────────────────────────
  //
  // Each is a $ currency input.
  // After filling these, the app auto-calculates:
  //   PROPERTY DAMAGE TOTAL LIMIT, BI/EE TOTAL, LOCATION TOTAL, BUILDING ITV

  async fillBuildingValue(value: string): Promise<void> {
    await this.modalBuildingValue.clear();
    await this.modalBuildingValue.fill(value);
    await this.modalBuildingValue.press('Tab');
    this.log(`Filled Building Value: $${value}`);
  }

  async fillContentsValue(value: string): Promise<void> {
    await this.modalContentsValue.clear();
    await this.modalContentsValue.fill(value);
    await this.modalContentsValue.press('Tab');
  }

  async fillStocksValue(value: string): Promise<void> {
    await this.modalStocksValue.clear();
    await this.modalStocksValue.fill(value);
    await this.modalStocksValue.press('Tab');
  }

  async fillMachineryValue(value: string): Promise<void> {
    await this.modalMachineryValue.clear();
    await this.modalMachineryValue.fill(value);
    await this.modalMachineryValue.press('Tab');
  }

  async fillEdp(value: string): Promise<void> {
    await this.modalEdp.clear();
    await this.modalEdp.fill(value);
    await this.modalEdp.press('Tab');
  }

  async fillOtherDescription(label: string): Promise<void> {
    await this.modalOtherDescription.clear();
    await this.modalOtherDescription.fill(label);
    await this.modalOtherDescription.press('Tab');
  }

  async fillOtherDollar(value: string): Promise<void> {
    await this.modalOtherDollar.clear();
    await this.modalOtherDollar.fill(value);
    await this.modalOtherDollar.press('Tab');
  }

  async fillBusinessInterruption(value: string): Promise<void> {
    await this.modalBusinessInterruption.clear();
    await this.modalBusinessInterruption.fill(value);
    await this.modalBusinessInterruption.press('Tab');
    this.log(`Filled Business Interruption: $${value}`);
  }

  async fillExtraExpense(value: string): Promise<void> {
    await this.modalExtraExpense.clear();
    await this.modalExtraExpense.fill(value);
    await this.modalExtraExpense.press('Tab');
  }

  async fillItvRatio(ratio: string): Promise<void> {
    await this.modalItvRatio.clear();
    await this.modalItvRatio.fill(ratio);
    await this.modalItvRatio.press('Tab');
  }

  async fillCrimeCap(value: string): Promise<void> {
    await this.modalCrimeCap.clear();
    await this.modalCrimeCap.fill(value);
    await this.modalCrimeCap.press('Tab');
  }

  async fillDescription(text: string): Promise<void> {
    await this.modalDescription.clear();
    await this.modalDescription.fill(text);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODAL — SAVE / CANCEL
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Clicks the Save button in the modal.
   *
   * WHAT HAPPENS:
   *   - Modal closes (returns to page)
   *   - New location row appears in the Locations table
   *   - Summary stats bar updates
   */
  async clickSave(): Promise<void> {
    await expect(this.modalSaveButton, 'Save button must be visible').toBeVisible();
    await this.modalSaveButton.click();

    // Wait for modal to close
    await this.locationModal.waitFor({ state: 'hidden', timeout: 15_000 });
    await this.page.waitForLoadState('networkidle');

    this.log('Location saved — modal closed');
  }

  /**
   * Clicks Cancel in the modal.
   *
   * For the EDIT modal, a Warning dialog appears first:
   *   "Cancelling will discard all changes made to this page. Would you like to Cancel?"
   *   → Call cancelAndConfirmDiscard() instead.
   *
   * For the ADD modal (no existing data), it may close directly.
   */
  async clickCancel(): Promise<void> {
    await this.modalCancelButton.click();

    // Check if a Warning dialog appeared (edit mode)
    const warningVisible = await this.cancelWarningDialog
      .waitFor({ state: 'visible', timeout: 2_000 })
      .then(() => true)
      .catch(() => false);

    if (warningVisible) {
      this.log('Warning dialog appeared on Cancel — use cancelAndConfirmDiscard() or cancelAndKeepOpen()');
    } else {
      await this.locationModal.waitFor({ state: 'hidden', timeout: 5_000 });
      this.log('Add modal cancelled — closed without warning');
    }
  }

  /**
   * Clicks Cancel → Warning dialog appears → clicks "Yes" (discard changes).
   * Use this when cancelling the EDIT modal after making changes.
   */
  async cancelAndConfirmDiscard(): Promise<void> {
    await this.modalCancelButton.click();
    await this.cancelWarningDialog.waitFor({ state: 'visible', timeout: 5_000 });
    await this.cancelWarningYes.click();
    await this.locationModal.waitFor({ state: 'hidden', timeout: 5_000 });
    this.log('Edit modal cancelled — changes discarded');
  }

  /**
   * Clicks Cancel → Warning dialog appears → clicks "No" (keep editing).
   * Use this to verify the Warning dialog behavior.
   */
  async cancelAndKeepOpen(): Promise<void> {
    await this.modalCancelButton.click();
    await this.cancelWarningDialog.waitFor({ state: 'visible', timeout: 5_000 });
    await this.cancelWarningNo.click();
    await this.cancelWarningDialog.waitFor({ state: 'hidden', timeout: 5_000 });
    await expect(this.locationModal, 'Modal should still be open after clicking No').toBeVisible();
    this.log('Warning dialog dismissed — modal remains open');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HIGH-LEVEL WORKFLOW: addLocation()
  //
  // Combines all steps into one call.
  // This is the primary method you use in tests.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Complete "Add Location" workflow — one call to do everything.
   *
   * STEPS:
   *   1. Click "+ Add New" — modal opens
   *   2. Read auto-generated Location No. (before filling anything)
   *   3. Fill all required fields
   *   4. Fill optional fields if provided in data
   *   5. Click Save — modal closes, row appears in table
   *
   * RETURNS: the auto-generated Location No. (e.g. '005')
   *          Store this to find the row in the table later.
   *
   * USAGE:
   *   const locationNo = await locationManagementPage.addLocation({
   *     country:       'USA',
   *     address:       '5 Independence Way',
   *     city:          'New York',
   *     stateProvince: 'NY - New York',
   *     zipPostalCode: '10001',
   *     sprinklered:   'Yes',
   *     buildingValue: '1000000',
   *   });
   *   await locationManagementPage.assertLocationInTableById(locationNo);
   */
  async addLocation(data: LocationData): Promise<string> {
    this.log('Starting addLocation()...');

    // Step 1: Open modal
    await this.clickAddNew();

    // Step 2: Read auto-generated Location No. BEFORE filling fields
    const locationNo = await this.readAutoGeneratedLocationNo();

    // Step 3: Fill required fields (modal order: top → bottom, left → right)
    await this.selectCountry(data.country);
    await this.fillAddress(data.address);
    await this.fillCity(data.city);
    await this.selectStateProvince(data.stateProvince);
    await this.fillZipPostalCode(data.zipPostalCode);
    await this.selectSprinklered(data.sprinklered);

    // Step 4: Fill optional fields (only if provided)
    if (data.address2)               await this.fillAddress2(data.address2);
    if (data.buildingNo)             await this.fillBuildingNo(data.buildingNo);
    if (data.occupancyCode)          await this.selectOccupancyCode(data.occupancyCode);
    if (data.constructionDescription) await this.fillConstructionDescription(data.constructionDescription);
    if (data.totalityOccupancy)      await this.selectTotalityOccupancy(data.totalityOccupancy);
    if (data.constructionIsoCode)    await this.selectConstructionIsoCode(data.constructionIsoCode);
    if (data.yearBuilt)              await this.fillYearBuilt(data.yearBuilt);
    if (data.numberOfStories)        await this.fillNumberOfStories(data.numberOfStories);
    if (data.areaSqFt)               await this.fillAreaSqFt(data.areaSqFt);

    // Value fields — fill Area before Building Value for ITV calculation
    if (data.buildingValue)          await this.fillBuildingValue(data.buildingValue);
    if (data.contentsValue)          await this.fillContentsValue(data.contentsValue);
    if (data.stocksValue)            await this.fillStocksValue(data.stocksValue);
    if (data.machineryValue)         await this.fillMachineryValue(data.machineryValue);
    if (data.edp)                    await this.fillEdp(data.edp);
    if (data.otherDescription)       await this.fillOtherDescription(data.otherDescription);
    if (data.otherDollar)            await this.fillOtherDollar(data.otherDollar);
    if (data.businessInterruption)   await this.fillBusinessInterruption(data.businessInterruption);
    if (data.extraExpense)           await this.fillExtraExpense(data.extraExpense);
    if (data.itvRatio)               await this.fillItvRatio(data.itvRatio);
    if (data.crimeCap)               await this.fillCrimeCap(data.crimeCap);
    if (data.description)            await this.fillDescription(data.description);

    // Step 5: Save
    await this.clickSave();

    this.log(
      `✅ Location added:\n` +
      `   Location No.: ${locationNo}\n` +
      `   Address:      ${data.address}, ${data.city}, ${data.stateProvince} ${data.zipPostalCode}`
    );

    return locationNo;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EDIT LOCATION WORKFLOW
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Clicks the Edit (pencil) icon for a specific location row.
   *
   * @param locationId - The Location ID of the row to edit (e.g. '005')
   */
  async clickEditForLocation(locationId: string): Promise<void> {
    const row = this.locationsTable
      .locator('tr')
      .filter({ hasText: locationId })
      .first();

    await expect(row, `Row with Location ID "${locationId}" must exist`).toBeVisible();

    // Click the Edit icon (pencil) in the ACTIONS column of that row
    await row.locator('YOUR_EDIT_ACTION_ICON_SELECTOR').click();

    // Wait for modal to open
    await this.locationModal.waitFor({ state: 'visible', timeout: 10_000 });

    // Confirm this is the EDIT modal, not ADD
    await expect(
      this.modalTitle,
      'Modal title should be "Edit Location Data"'
    ).toContainText('Edit Location Data');

    this.log(`Edit modal opened for Location ID: ${locationId}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE LOCATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Clicks the Delete (trash) icon for a specific location row.
   * If a confirmation dialog appears, it will be handled by the caller.
   *
   * @param locationId - The Location ID to delete (e.g. '005')
   */
  async clickDeleteForLocation(locationId: string): Promise<void> {
    const row = this.locationsTable
      .locator('tr')
      .filter({ hasText: locationId })
      .first();

    await expect(row, `Row with Location ID "${locationId}" must exist`).toBeVisible();

    await row.locator('YOUR_DELETE_ACTION_ICON_SELECTOR').click();
    this.log(`Clicked Delete for Location ID: ${locationId}`);

    // If a delete confirmation dialog appears, handle it here.
    // TODO: Confirm whether delete has a confirmation dialog from a screenshot.
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTO-CALCULATED VALUE ASSERTIONS
  //
  // Use these to verify the application's auto-calculation is correct.
  // Do NOT use these to fill fields — they are READ-ONLY.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Reads all auto-calculated values from the modal.
   * Call this AFTER filling the value fields (buildingValue, contentsValue, etc.)
   * and BEFORE clicking Save.
   *
   * WHY read before Save:
   *   After Save, the modal closes. You can only assert auto-calculated values
   *   while the modal is open.
   */
  async getCalculatedValues(): Promise<LocationCalculatedValues> {
    return {
      propertyDamageTotalLimit: (await this.modalPropertyDamageTotal.inputValue()).trim(),
      biEeTotal:                (await this.modalBiEeTotal.inputValue()).trim(),
      locationTotal:            (await this.modalLocationTotal.inputValue()).trim(),
      buildingItv:              (await this.modalBuildingItv.inputValue()).trim(),
      protectionClass:          (await this.modalProtectionClass.inputValue()).trim(),
      totalityBuildingValue:    (await this.modalTotalityBuildingValue.inputValue()).trim(),
      totalityTivPerSqFt:       (await this.modalTotalityTivPerSqFt.inputValue()).trim(),
    };
  }

  /**
   * Asserts PROPERTY DAMAGE TOTAL LIMIT = Building + Contents + Stocks + Machinery + EDP + Other
   *
   * @param expected - expected value as a string e.g. '540'
   */
  async assertPropertyDamageTotal(expected: string): Promise<void> {
    await expect(
      this.modalPropertyDamageTotal,
      `PROPERTY DAMAGE TOTAL LIMIT should be "${expected}"`
    ).toHaveValue(expected);
    this.log(`✅ Property Damage Total: ${expected}`);
  }

  /**
   * Asserts BI/EE TOTAL = Business Interruption + Extra Expense
   *
   * @param expected - expected value as a string e.g. '90'
   */
  async assertBiEeTotal(expected: string): Promise<void> {
    await expect(
      this.modalBiEeTotal,
      `BI/EE TOTAL should be "${expected}"`
    ).toHaveValue(expected);
    this.log(`✅ BI/EE Total: ${expected}`);
  }

  /**
   * Asserts LOCATION TOTAL = PD Total + BI/EE Total
   *
   * @param expected - expected value as a string e.g. '630'
   */
  async assertLocationTotal(expected: string): Promise<void> {
    await expect(
      this.modalLocationTotal,
      `LOCATION TOTAL should be "${expected}"`
    ).toHaveValue(expected);
    this.log(`✅ Location Total: ${expected}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TABLE ASSERTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async assertTableIsEmpty(): Promise<void> {
    await expect(
      this.noLocationsText,
      'Table should show no locations message'
    ).toBeVisible();
    this.log('✅ Table is empty');
  }

  async assertTableHasLocations(): Promise<void> {
    await expect(
      this.noLocationsText,
      'Table should NOT be empty'
    ).toBeHidden();
    this.log('✅ Table has locations');
  }

  async assertLocationCount(expected: number): Promise<void> {
    const actual = await this.getLocationCount();
    expect(actual, `Expected ${expected} location(s), found ${actual}`).toBe(expected);
    this.log(`✅ Location count: ${actual}`);
  }

  /**
   * Asserts a specific Location ID appears in the table.
   *
   * @param locationId - e.g. '005'
   */
  async assertLocationInTableById(locationId: string): Promise<void> {
    const row = this.locationsTable
      .locator('tr')
      .filter({ hasText: locationId })
      .first();

    await expect(
      row,
      `Location ID "${locationId}" should be visible in the table`
    ).toBeVisible({ timeout: 10_000 });

    this.log(`✅ Location ID "${locationId}" found in table`);
  }

  /**
   * Asserts a location with the given address appears in the table.
   * Uses partial text match — you do not need the full address.
   */
  async assertLocationInTableByAddress(addressPart: string): Promise<void> {
    const row = this.locationsTable
      .locator('tr')
      .filter({ hasText: addressPart })
      .first();

    await expect(
      row,
      `A location with address containing "${addressPart}" should be in the table`
    ).toBeVisible({ timeout: 10_000 });

    this.log(`✅ Address "${addressPart}" found in table`);
  }

  /**
   * Reads all cell values for a specific table row and returns them.
   *
   * Columns (by index):
   *   0: TYPE            1: LOCATION ID    2: ADDRESS      3: ADDRESS 2
   *   4: CITY            5: STATE/PROVINCE 6: ZIP/POSTAL   7: COUNTRY
   *   8: PROTECTION CLASS  9: TOTAL PD    10: TOTAL BI    11: (ACTIONS — not read)
   *
   * @param locationId - Location ID to look up (e.g. '005')
   */
  async getTableRowById(locationId: string): Promise<Partial<LocationTableRow>> {
    const row = this.locationsTable
      .locator('tbody tr')
      .filter({ hasText: locationId })
      .first();

    await expect(row, `Row with Location ID "${locationId}" should exist`).toBeVisible();

    const cells = row.locator('td');

    return {
      type:            (await cells.nth(0).innerText()).trim(),
      locationId:      (await cells.nth(1).innerText()).trim(),
      address:         (await cells.nth(2).innerText()).trim(),
      address2:        (await cells.nth(3).innerText()).trim(),
      city:            (await cells.nth(4).innerText()).trim(),
      stateProvince:   (await cells.nth(5).innerText()).trim(),
      zipPostalCode:   (await cells.nth(6).innerText()).trim(),
      country:         (await cells.nth(7).innerText()).trim(),
      protectionClass: (await cells.nth(8).innerText()).trim(),
      totalPd:         (await cells.nth(9).innerText()).trim(),
      totalBi:         (await cells.nth(10).innerText()).trim(),
    };
  }

  /**
   * Full row assertion — verifies every provided field matches the table row.
   *
   * USAGE:
   *   await locationManagementPage.assertTableRow('005', {
   *     address:  '5 Independence Way, Suite 205',
   *     city:     'New York',
   *     state:    'NY - New York',
   *     totalPd:  '540',
   *     totalBi:  '180',
   *   });
   */
  async assertTableRow(
    locationId: string,
    expected: Partial<LocationTableRow>
  ): Promise<void> {
    const actual = await this.getTableRowById(locationId);

    if (expected.address)         expect(actual.address,         `ADDRESS`).toContain(expected.address);
    if (expected.address2)        expect(actual.address2,        `ADDRESS 2`).toContain(expected.address2);
    if (expected.city)            expect(actual.city,            `CITY`).toBe(expected.city);
    if (expected.stateProvince)   expect(actual.stateProvince,   `STATE/PROVINCE`).toBe(expected.stateProvince);
    if (expected.zipPostalCode)   expect(actual.zipPostalCode,   `ZIP/POSTAL CODE`).toBe(expected.zipPostalCode);
    if (expected.country)         expect(actual.country,         `COUNTRY`).toBe(expected.country);
    if (expected.protectionClass) expect(actual.protectionClass, `PROTECTION CLASS`).toBe(expected.protectionClass);
    if (expected.totalPd)         expect(actual.totalPd,         `TOTAL PD`).toContain(expected.totalPd);
    if (expected.totalBi)         expect(actual.totalBi,         `TOTAL BI`).toContain(expected.totalBi);

    this.log(`✅ Table row for Location ID "${locationId}" verified`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATION ERROR ASSERTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async assertCountryRequiredError(): Promise<void> {
    await expect(this.errCountry, '"Country is required" error should be visible').toBeVisible();
    this.log('✅ Country required error shown');
  }

  async assertAddressRequiredError(): Promise<void> {
    await expect(this.errAddress, '"Address is required" error should be visible').toBeVisible();
    this.log('✅ Address required error shown');
  }

  async assertCityRequiredError(): Promise<void> {
    await expect(this.errCity, '"City is required" error should be visible').toBeVisible();
    this.log('✅ City required error shown');
  }

  async assertStateProvinceRequiredError(): Promise<void> {
    await expect(this.errStateProvince, '"State/Province is required" error should be visible').toBeVisible();
    this.log('✅ State/Province required error shown');
  }

  async assertZipRequiredError(): Promise<void> {
    await expect(this.errZip, '"Zip/Postal Code is required" error should be visible').toBeVisible();
    this.log('✅ Zip required error shown');
  }

  async assertZipPatternError(): Promise<void> {
    await expect(this.errZipPattern, '"Zip does not match the valid pattern" error should be visible').toBeVisible();
    this.log('✅ Zip pattern error shown');
  }

  async assertConstructionIsoRequiredError(): Promise<void> {
    await expect(this.errConstructionIso, '"Construction ISO Code is required" error should be visible').toBeVisible();
    this.log('✅ Construction ISO Code required error shown');
  }

  async assertSaveButtonEnabled(): Promise<void> {
    await expect(this.modalSaveButton, 'Save button should be enabled').toBeEnabled();
  }

  async assertSaveButtonDisabled(): Promise<void> {
    await expect(this.modalSaveButton, 'Save button should be disabled').toBeDisabled();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HQ LOCATION DESIGNATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Sets the HQ designation mode.
   *
   * @param mode - 'existing' = pick from Locations dropdown
   *               'not-a-location' = manual address (default)
   */
  async selectHqMode(mode: HqDesignationMode): Promise<void> {
    if (mode === 'existing') {
      await this.hqRadioSelectExisting.click();
    } else {
      await this.hqRadioNotALocation.click();
    }
    this.log(`HQ mode selected: ${mode}`);
  }

  /**
   * Sets HQ from an existing Risk Location dropdown.
   * Only available when mode = 'existing'.
   *
   * @param locationId - The Location ID to select (e.g. '005')
   */
  async selectHqFromExistingLocation(locationId: string): Promise<void> {
    await this.selectHqMode('existing');
    await this.hqSelectDropdown.select(locationId);
    await this.hqSetAsHqButton.click();
    await this.page.waitForLoadState('networkidle');
    this.log(`HQ set from existing location: ${locationId}`);
  }

  /**
   * Saves a manual HQ address.
   * Only available when mode = 'not-a-location' (default).
   */
  async saveHqAddress(data: HqAddressData): Promise<void> {
    await this.selectHqMode('not-a-location');
    await this.hqCountryDropdown.select(data.country);
    await this.page.waitForLoadState('networkidle');
    await this.hqAddressInput.clear();
    await this.hqAddressInput.fill(data.address);
    await this.hqStateDropdown.select(data.stateProvince);
    await this.hqZipInput.clear();
    await this.hqZipInput.fill(data.zipPostalCode);
    await this.hqSaveAddressButton.click();
    await this.page.waitForLoadState('networkidle');
    this.log(`HQ address saved: ${data.address}, ${data.stateProvince} ${data.zipPostalCode}`);
  }
}
