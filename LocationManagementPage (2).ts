import { Page, Locator, expect } from '@playwright/test';
import { BasePage }               from './base/BasePage';
import { DropdownComponent }      from '../components/DropdownComponent';
import {
  LocationData,
  LocationTableRow,
  LocationTableFilter,
  LocationKpiValues,
  LocationPageSummary,
  LocationCalculatedValues,
  VeriskApiResponse,
  CotalityApiResponse,
  HqDesignationMode,
  HqAddressData,
} from '../types/location.types';

/**
 * LocationManagementPage
 *
 * ── PAGE STRUCTURE ────────────────────────────────────────────────────────────
 *
 *   Accessed via: Sidebar → Location Management
 *   (No direct URL — always navigate from SubmissionOverviewPage)
 *
 *   TWO TABS:
 *   ┌──────────────────────────────────────────────────────────────────────┐
 *   │  [ Location Data ]  [ Location Summary ]                             │
 *   ├──────────────────────────────────────────────────────────────────────┤
 *   │  KPI BAR (always visible):                                           │
 *   │  Total Locations: 2 | Total Value: $1260 | Total BI: $180 | ...      │
 *   │  [VERISK]  [COTALITY]                                                │
 *   ├──────────────────────────────────────────────────────────────────────┤
 *   │  HQ Location Designation (UI in development)                         │
 *   ├──────────────────────────────────────────────────────────────────────┤
 *   │  Locations  [Location Data Template.xlsx] [+ Add New] [Upload]       │
 *   │  CHECKBOX | TYPE | LOC ID | ADDR | ADDR2 | CITY | STATE | ZIP | ... │
 *   │  (when rows are checked → [Delete Selected] appears)                 │
 *   └──────────────────────────────────────────────────────────────────────┘
 *
 *   ADD / EDIT LOCATION MODAL (right-side overlay, scrollable):
 *   ┌────────────────────────────────────────────────────────────────────┐
 *   │  Add Location Data                                                 │
 *   │                                                                    │
 *   │  LOCATION NO * [text 001-999]  COUNTRY *[dropdown]  BLDG NO[num]  │
 *   │  ADDRESS *[text]           ADDRESS 2[text]                         │
 *   │  CITY *[text]              STATE/PROVINCE *[dropdown]              │
 *   │  ZIP/POSTAL CODE *[text]   COUNTY[text, auto]                      │
 *   │  OCCUPANCY CODE[dropdown][Clear]  CONSTRUCTION DESC[text]          │
 *   │  PROTECTION CLASS[read-only]                                       │
 *   │  COTALITY OCCUPANCY[dropdown][Clear]  YEAR BUILT[4-digit]          │
 *   │  NO. OF STORIES[num ≤99]  AREA (SQ/FT)[num]  SPRINKLERED *[radio] │
 *   │  BUILDING VALUE $   CONTENTS VALUE $   STOCKS VALUE $              │
 *   │  MACHINERY VALUE $  EDP $              OTHER (DESCRIPTION)[text]   │
 *   │  OTHER ($) $                                                       │
 *   │  PROPERTY DAMAGE TOTAL LIMIT $[AUTO]  BUSINESS INTERRUPTION $     │
 *   │  EXTRA EXPENSE $   BI/EE TOTAL $[AUTO]   LOCATION TOTAL $[AUTO]   │
 *   │  BUILDING ITV $[AUTO]                                              │
 *   │  DESCRIPTION[textarea]                                             │
 *   │                                    [Cancel]  [Save]               │
 *   └────────────────────────────────────────────────────────────────────┘
 *
 * ── LOCATION NO. RULES ───────────────────────────────────────────────────────
 *
 *   - Manually entered by user (NOT auto-generated)
 *   - Must be between 001 and 999
 *   - Error message: "Location No. should be between 001 and 999"
 *
 * ── AUTO-CALCULATED FIELDS ───────────────────────────────────────────────────
 *
 *   DO NOT fill these — the app calculates them automatically:
 *     PROPERTY DAMAGE TOTAL = Building + Contents + Stocks + Machinery + EDP + Other($)
 *     BI/EE TOTAL           = Business Interruption + Extra Expense
 *     LOCATION TOTAL        = PD Total + BI/EE Total
 *     BUILDING ITV          = Building Value / Area (Sq.Ft.)
 *
 * ── VERISK / COTALITY ────────────────────────────────────────────────────────
 *
 *   Clicking VERISK or COTALITY triggers an external API call.
 *   Use clickVeriskAndCaptureResponse() / clickCotalityAndCaptureResponse()
 *   to intercept the response and compare to what the UI shows.
 *
 * ── SETUP REQUIRED ────────────────────────────────────────────────────────────
 *
 *   Replace all YOUR_*_SELECTOR with actual selectors.
 */
export class LocationManagementPage extends BasePage {

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE-LEVEL LOCATORS
  //
  // `readonly` (public) so spec files can write direct expect() assertions
  // without boilerplate wrapper methods. Business logic lives in the methods.
  // ═══════════════════════════════════════════════════════════════════════════

  /** "Location Management" heading — confirms we are on the right page */
  readonly pageHeading:           Locator;

  // ── TABS ──────────────────────────────────────────────────────────────────
  readonly locationDataTab:       Locator;
  readonly locationSummaryTab:    Locator;

  // ── KPI BAR (always visible on Location Data tab) ─────────────────────────
  readonly kpiTotalLocations:     Locator;
  readonly kpiTotalValue:         Locator;
  readonly kpiTotalBi:            Locator;
  readonly kpiTotalPd:            Locator;
  readonly veriskButton:          Locator;
  readonly cotalityButton:        Locator;

  // ── HQ LOCATION DESIGNATION SECTION ──────────────────────────────────────
  readonly hqRadioSelectExisting: Locator;
  readonly hqRadioNotALocation:   Locator;
  readonly hqSelectDropdown:      DropdownComponent;
  readonly hqSetAsHqButton:       Locator;
  readonly hqLocationNoInput:     Locator;
  readonly hqCountryDropdown:     DropdownComponent;
  readonly hqAddressInput:        Locator;
  readonly hqStateDropdown:       DropdownComponent;
  readonly hqZipInput:            Locator;
  readonly hqSaveAddressButton:   Locator;

  // ── LOCATIONS TABLE SECTION ───────────────────────────────────────────────
  readonly locationsTableSection:   Locator;
  readonly addNewButton:            Locator;
  readonly uploadButton:            Locator;
  readonly exportButton:            Locator;
  readonly templateLink:            Locator;
  readonly locationsTable:          Locator;
  readonly noLocationsText:         Locator;

  /** Appears only when at least one row checkbox is checked */
  readonly deleteSelectedButton:    Locator;

  // ── UPLOAD MODAL ──────────────────────────────────────────────────────────
  readonly uploadModal:             Locator;
  readonly uploadFileInput:         Locator;   // <input type="file">
  readonly uploadSubmitButton:      Locator;   // "Upload" button inside the modal
  readonly uploadModalCloseButton:  Locator;

  // ── ADD / EDIT LOCATION MODAL — CONTAINER ────────────────────────────────
  readonly locationModal:           Locator;
  readonly modalTitle:              Locator;

  // ── MODAL: SECTION 1 — Basic Info ────────────────────────────────────────

  /**
   * LOCATION NO. — manually entered, NOT auto-generated.
   * Valid range: 001–999. Error if out of range or non-numeric.
   */
  readonly modalLocationNo:         Locator;

  /** dropdown: USA / Canada */
  readonly modalCountryDropdown:    DropdownComponent;

  /** numeric text box, between 1–99 */
  readonly modalBuildingNo:         Locator;

  readonly modalAddress:            Locator;
  readonly modalAddress2:           Locator;
  readonly modalCity:               Locator;

  /** dropdown — options depend on Country */
  readonly modalStateDropdown:      DropdownComponent;

  readonly modalZip:                Locator;

  /** auto-populated after ZIP; overridable */
  readonly modalCounty:             Locator;

  // ── MODAL: SECTION 2 — Property Details ──────────────────────────────────

  /** dropdown + Clear button */
  readonly modalOccupancyCode:      DropdownComponent;
  readonly modalOccupancyClear:     Locator;

  /** text — free-form construction description */
  readonly modalConstructionDesc:   Locator;

  /** READ-ONLY — populated by Verisk integration */
  readonly modalProtectionClass:    Locator;

  // ── MODAL: SECTION 3 — Cotality / TIV Calculation ────────────────────────

  /** dropdown + Clear button */
  readonly modalCotalityOccupancy:  DropdownComponent;
  readonly modalCotalityOccClear:   Locator;

  /**
   * 4-digit year — error until 4 chars: "Enter a valid 4-digit year"
   */
  readonly modalYearBuilt:          Locator;

  // ── MODAL: SECTION 4 — Physical Attributes ───────────────────────────────

  /**
   * Max 99.
   * Over 99:    "No. of stories must be less than or equal to 99"
   * Non-numeric: "No. of stories must be a valid number"
   */
  readonly modalNoOfStories:        Locator;

  readonly modalAreaSqFt:           Locator;

  /** radio button group: Yes / No (NOT a dropdown) */
  readonly modalSprinkleredYes:     Locator;
  readonly modalSprinkleredNo:      Locator;

  // ── MODAL: SECTION 5 — Values (Input) ────────────────────────────────────

  readonly modalBuildingValue:      Locator;
  readonly modalContentsValue:      Locator;
  readonly modalStocksValue:        Locator;
  readonly modalMachineryValue:     Locator;
  readonly modalEdp:                Locator;
  readonly modalOtherDescription:   Locator;   // text label for Other
  readonly modalOtherDollar:        Locator;   // $ amount for Other

  // ── MODAL: SECTION 6 — Auto-Calculated (READ-ONLY) ───────────────────────

  readonly modalPropertyDamageTotal:  Locator;   // = BV+CV+SV+MV+EDP+Other (AUTO)
  readonly modalBusinessInterruption: Locator;   // INPUT
  readonly modalExtraExpense:         Locator;   // INPUT
  readonly modalBiEeTotal:            Locator;   // = BI+EE (AUTO)
  readonly modalLocationTotal:        Locator;   // = PD+BI/EE (AUTO)
  readonly modalBuildingItv:          Locator;   // = BV/Area (AUTO)

  // ── MODAL: VERISK READ-ONLY FIELDS (populated by Verisk API) ─────────────

  readonly modalVeriskProtectionClass:               Locator;
  readonly modalVeriskCrimeCapIndex:                 Locator;
  readonly modalVeriskArsonCurrent:                  Locator;
  readonly modalVeriskArsonForecast:                 Locator;
  readonly modalVeriskRobberyCurrent:                Locator;
  readonly modalVeriskRobberyForecast:               Locator;
  readonly modalVeriskBurglaryCurrent:               Locator;
  readonly modalVeriskBurglaryForecast:              Locator;
  readonly modalVeriskLarcenyCurrent:                Locator;
  readonly modalVeriskLarcenyForecast:               Locator;
  readonly modalVeriskAggregateCrimesCurrent:        Locator;
  readonly modalVeriskAggregateCrimesForecast:       Locator;

  // ── MODAL: COTALITY READ-ONLY FIELDS (populated by Cotality API) ──────────

  readonly modalCotalityBuildingValue:               Locator;
  readonly modalCotalityItvPerSqFt:                  Locator;
  readonly modalCotalityItvRatio:                    Locator;

  // ── MODAL: ADDITIONAL ────────────────────────────────────────────────────

  readonly modalDescription:          Locator;

  // ── MODAL: BUTTONS ────────────────────────────────────────────────────────

  readonly modalCancelButton:         Locator;
  readonly modalSaveButton:           Locator;

  // ── MODAL: VALIDATION ERRORS ─────────────────────────────────────────────

  /** "Location No. should be between 001 and 999" */
  readonly errLocationNo:             Locator;

  /** TODO — 3 error messages to be confirmed */
  readonly errBuildingNo:             Locator;

  readonly errCountry:                Locator;
  readonly errAddress:                Locator;
  readonly errCity:                   Locator;
  readonly errStateProvince:          Locator;

  /** "Zip/Postal Code is required" */
  readonly errZip:                    Locator;

  /** "Zip does not match the valid pattern" */
  readonly errZipPattern:             Locator;

  /** "Enter a valid 4-digit year" */
  readonly errYearBuilt:              Locator;

  /** "No. of stories must be less than or equal to 99" */
  readonly errNoOfStoriesMax:         Locator;

  /** "No. of stories must be a valid number" */
  readonly errNoOfStoriesType:        Locator;

  // ── CANCEL WARNING DIALOG (Edit modal only) ───────────────────────────────

  readonly cancelWarningDialog:       Locator;
  readonly cancelWarningYes:          Locator;
  readonly cancelWarningNo:           Locator;

  // ── DELETE CONFIRMATION DIALOG ────────────────────────────────────────────

  /** "Are you sure you want to delete?" dialog */
  readonly deleteConfirmDialog:       Locator;
  readonly deleteConfirmYes:          Locator;
  readonly deleteConfirmNo:           Locator;

  constructor(page: Page) {
    super(page);

    // Page-level
    this.pageHeading          = page.locator('YOUR_LOCATION_MANAGEMENT_HEADING_SELECTOR');
    this.locationDataTab      = page.locator('YOUR_LOCATION_DATA_TAB_SELECTOR');
    this.locationSummaryTab   = page.locator('YOUR_LOCATION_SUMMARY_TAB_SELECTOR');

    // KPI bar
    this.kpiTotalLocations    = page.locator('YOUR_KPI_TOTAL_LOCATIONS_SELECTOR');
    this.kpiTotalValue        = page.locator('YOUR_KPI_TOTAL_VALUE_SELECTOR');
    this.kpiTotalBi           = page.locator('YOUR_KPI_TOTAL_BI_SELECTOR');
    this.kpiTotalPd           = page.locator('YOUR_KPI_TOTAL_PD_SELECTOR');
    this.veriskButton         = page.locator('YOUR_VERISK_BUTTON_SELECTOR');
    this.cotalityButton       = page.locator('YOUR_COTALITY_BUTTON_SELECTOR');

    // HQ designation
    this.hqRadioSelectExisting = page.locator('YOUR_HQ_RADIO_SELECT_EXISTING_SELECTOR');
    this.hqRadioNotALocation   = page.locator('YOUR_HQ_RADIO_NOT_A_LOCATION_SELECTOR');
    this.hqSelectDropdown      = new DropdownComponent(
      page, page.locator('YOUR_HQ_SELECT_DROPDOWN_CONTAINER'), page.locator('YOUR_HQ_SELECT_DROPDOWN_INPUT'),
    );
    this.hqSetAsHqButton       = page.locator('YOUR_HQ_SET_AS_HQ_BUTTON_SELECTOR');
    this.hqLocationNoInput     = page.locator('YOUR_HQ_LOCATION_NO_INPUT_SELECTOR');
    this.hqCountryDropdown     = new DropdownComponent(
      page, page.locator('YOUR_HQ_COUNTRY_DROPDOWN_CONTAINER'), page.locator('YOUR_HQ_COUNTRY_DROPDOWN_INPUT'),
    );
    this.hqAddressInput        = page.locator('YOUR_HQ_ADDRESS_INPUT_SELECTOR');
    this.hqStateDropdown       = new DropdownComponent(
      page, page.locator('YOUR_HQ_STATE_DROPDOWN_CONTAINER'), page.locator('YOUR_HQ_STATE_DROPDOWN_INPUT'),
    );
    this.hqZipInput            = page.locator('YOUR_HQ_ZIP_INPUT_SELECTOR');
    this.hqSaveAddressButton   = page.locator('YOUR_HQ_SAVE_ADDRESS_BUTTON_SELECTOR');

    // Table section
    this.locationsTableSection  = page.locator('YOUR_LOCATIONS_SECTION_SELECTOR');
    this.addNewButton           = page.locator('YOUR_LOCATION_ADD_NEW_BUTTON_SELECTOR');
    this.uploadButton           = page.locator('YOUR_LOCATION_UPLOAD_BUTTON_SELECTOR');
    this.exportButton           = page.locator('YOUR_LOCATION_EXPORT_BUTTON_SELECTOR');
    this.templateLink           = page.locator('YOUR_LOCATION_TEMPLATE_LINK_SELECTOR');
    this.locationsTable         = page.locator('YOUR_LOCATIONS_TABLE_SELECTOR');
    this.noLocationsText        = page.locator('YOUR_NO_LOCATIONS_TEXT_SELECTOR');
    this.deleteSelectedButton   = page.locator('YOUR_DELETE_SELECTED_BUTTON_SELECTOR');

    // Upload modal
    this.uploadModal            = page.locator('YOUR_UPLOAD_MODAL_SELECTOR');
    this.uploadFileInput        = page.locator('YOUR_UPLOAD_FILE_INPUT_SELECTOR');
    this.uploadSubmitButton     = page.locator('YOUR_UPLOAD_SUBMIT_BUTTON_SELECTOR');
    this.uploadModalCloseButton = page.locator('YOUR_UPLOAD_MODAL_CLOSE_BUTTON_SELECTOR');

    // Modal container
    this.locationModal  = page.locator('YOUR_LOCATION_MODAL_SELECTOR');
    this.modalTitle     = page.locator('YOUR_LOCATION_MODAL_TITLE_SELECTOR');

    // Modal: Section 1 — Basic Info
    this.modalLocationNo      = page.locator('YOUR_MODAL_LOCATION_NO_SELECTOR');
    this.modalCountryDropdown = new DropdownComponent(
      page, page.locator('YOUR_MODAL_COUNTRY_CONTAINER'), page.locator('YOUR_MODAL_COUNTRY_INPUT'),
    );
    this.modalBuildingNo      = page.locator('YOUR_MODAL_BUILDING_NO_SELECTOR');
    this.modalAddress         = page.locator('YOUR_MODAL_ADDRESS_SELECTOR');
    this.modalAddress2        = page.locator('YOUR_MODAL_ADDRESS2_SELECTOR');
    this.modalCity            = page.locator('YOUR_MODAL_CITY_SELECTOR');
    this.modalStateDropdown   = new DropdownComponent(
      page, page.locator('YOUR_MODAL_STATE_CONTAINER'), page.locator('YOUR_MODAL_STATE_INPUT'),
    );
    this.modalZip    = page.locator('YOUR_MODAL_ZIP_SELECTOR');
    this.modalCounty = page.locator('YOUR_MODAL_COUNTY_SELECTOR');

    // Modal: Section 2 — Property Details
    this.modalOccupancyCode = new DropdownComponent(
      page, page.locator('YOUR_MODAL_OCCUPANCY_CODE_CONTAINER'), page.locator('YOUR_MODAL_OCCUPANCY_CODE_INPUT'),
    );
    this.modalOccupancyClear   = page.locator('YOUR_MODAL_OCCUPANCY_CLEAR_BUTTON');
    this.modalConstructionDesc = page.locator('YOUR_MODAL_CONSTRUCTION_DESC_SELECTOR');
    this.modalProtectionClass  = page.locator('YOUR_MODAL_PROTECTION_CLASS_SELECTOR');

    // Modal: Section 3 — Cotality / TIV
    this.modalCotalityOccupancy = new DropdownComponent(
      page, page.locator('YOUR_MODAL_COTALITY_OCC_CONTAINER'), page.locator('YOUR_MODAL_COTALITY_OCC_INPUT'),
    );
    this.modalCotalityOccClear  = page.locator('YOUR_MODAL_COTALITY_OCC_CLEAR_BUTTON');
    this.modalYearBuilt         = page.locator('YOUR_MODAL_YEAR_BUILT_SELECTOR');

    // Modal: Section 4 — Physical Attributes
    this.modalNoOfStories    = page.locator('YOUR_MODAL_NO_OF_STORIES_SELECTOR');
    this.modalAreaSqFt       = page.locator('YOUR_MODAL_AREA_SQ_FT_SELECTOR');
    this.modalSprinkleredYes = page.locator('YOUR_MODAL_SPRINKLERED_YES_RADIO');
    this.modalSprinkleredNo  = page.locator('YOUR_MODAL_SPRINKLERED_NO_RADIO');

    // Modal: Section 5 — Values (Input)
    this.modalBuildingValue    = page.locator('YOUR_MODAL_BUILDING_VALUE_SELECTOR');
    this.modalContentsValue    = page.locator('YOUR_MODAL_CONTENTS_VALUE_SELECTOR');
    this.modalStocksValue      = page.locator('YOUR_MODAL_STOCKS_VALUE_SELECTOR');
    this.modalMachineryValue   = page.locator('YOUR_MODAL_MACHINERY_VALUE_SELECTOR');
    this.modalEdp              = page.locator('YOUR_MODAL_EDP_SELECTOR');
    this.modalOtherDescription = page.locator('YOUR_MODAL_OTHER_DESCRIPTION_SELECTOR');
    this.modalOtherDollar      = page.locator('YOUR_MODAL_OTHER_DOLLAR_SELECTOR');

    // Modal: Section 6 — Auto-Calculated
    this.modalPropertyDamageTotal   = page.locator('YOUR_MODAL_PROPERTY_DAMAGE_TOTAL_SELECTOR');
    this.modalBusinessInterruption  = page.locator('YOUR_MODAL_BUSINESS_INTERRUPTION_SELECTOR');
    this.modalExtraExpense          = page.locator('YOUR_MODAL_EXTRA_EXPENSE_SELECTOR');
    this.modalBiEeTotal             = page.locator('YOUR_MODAL_BI_EE_TOTAL_SELECTOR');
    this.modalLocationTotal         = page.locator('YOUR_MODAL_LOCATION_TOTAL_SELECTOR');
    this.modalBuildingItv           = page.locator('YOUR_MODAL_BUILDING_ITV_SELECTOR');

    // Modal: Verisk read-only fields
    this.modalVeriskProtectionClass        = page.locator('YOUR_MODAL_VERISK_PROTECTION_CLASS_SELECTOR');
    this.modalVeriskCrimeCapIndex          = page.locator('YOUR_MODAL_VERISK_CRIME_CAP_INDEX_SELECTOR');
    this.modalVeriskArsonCurrent           = page.locator('YOUR_MODAL_VERISK_ARSON_CURRENT_SELECTOR');
    this.modalVeriskArsonForecast          = page.locator('YOUR_MODAL_VERISK_ARSON_FORECAST_SELECTOR');
    this.modalVeriskRobberyCurrent         = page.locator('YOUR_MODAL_VERISK_ROBBERY_CURRENT_SELECTOR');
    this.modalVeriskRobberyForecast        = page.locator('YOUR_MODAL_VERISK_ROBBERY_FORECAST_SELECTOR');
    this.modalVeriskBurglaryCurrent        = page.locator('YOUR_MODAL_VERISK_BURGLARY_CURRENT_SELECTOR');
    this.modalVeriskBurglaryForecast       = page.locator('YOUR_MODAL_VERISK_BURGLARY_FORECAST_SELECTOR');
    this.modalVeriskLarcenyCurrent         = page.locator('YOUR_MODAL_VERISK_LARCENY_CURRENT_SELECTOR');
    this.modalVeriskLarcenyForecast        = page.locator('YOUR_MODAL_VERISK_LARCENY_FORECAST_SELECTOR');
    this.modalVeriskAggregateCrimesCurrent  = page.locator('YOUR_MODAL_VERISK_AGGREGATE_CRIMES_CURRENT_SELECTOR');
    this.modalVeriskAggregateCrimesForecast = page.locator('YOUR_MODAL_VERISK_AGGREGATE_CRIMES_FORECAST_SELECTOR');

    // Modal: Cotality read-only fields
    this.modalCotalityBuildingValue = page.locator('YOUR_MODAL_COTALITY_BUILDING_VALUE_SELECTOR');
    this.modalCotalityItvPerSqFt    = page.locator('YOUR_MODAL_COTALITY_ITV_PER_SQFT_SELECTOR');
    this.modalCotalityItvRatio      = page.locator('YOUR_MODAL_COTALITY_ITV_RATIO_SELECTOR');

    // Modal: Additional
    this.modalDescription = page.locator('YOUR_MODAL_DESCRIPTION_SELECTOR');

    // Modal: Buttons
    this.modalCancelButton = page.locator('YOUR_MODAL_CANCEL_BUTTON_SELECTOR');
    this.modalSaveButton   = page.locator('YOUR_MODAL_SAVE_BUTTON_SELECTOR');

    // Modal: Validation errors
    this.errLocationNo      = page.locator('YOUR_ERROR_LOCATION_NO_SELECTOR');
    this.errBuildingNo      = page.locator('YOUR_ERROR_BUILDING_NO_SELECTOR');
    this.errCountry         = page.locator('YOUR_ERROR_COUNTRY_SELECTOR');
    this.errAddress         = page.locator('YOUR_ERROR_ADDRESS_SELECTOR');
    this.errCity            = page.locator('YOUR_ERROR_CITY_SELECTOR');
    this.errStateProvince   = page.locator('YOUR_ERROR_STATE_PROVINCE_SELECTOR');
    this.errZip             = page.locator('YOUR_ERROR_ZIP_SELECTOR');
    this.errZipPattern      = page.locator('YOUR_ERROR_ZIP_PATTERN_SELECTOR');
    this.errYearBuilt       = page.locator('YOUR_ERROR_YEAR_BUILT_SELECTOR');
    this.errNoOfStoriesMax  = page.locator('YOUR_ERROR_NO_OF_STORIES_MAX_SELECTOR');
    this.errNoOfStoriesType = page.locator('YOUR_ERROR_NO_OF_STORIES_TYPE_SELECTOR');

    // Cancel warning dialog (Edit modal)
    this.cancelWarningDialog = page.locator('YOUR_CANCEL_WARNING_DIALOG_SELECTOR');
    this.cancelWarningYes    = page.locator('YOUR_CANCEL_WARNING_YES_BUTTON_SELECTOR');
    this.cancelWarningNo     = page.locator('YOUR_CANCEL_WARNING_NO_BUTTON_SELECTOR');

    // Delete confirmation dialog
    this.deleteConfirmDialog = page.locator('YOUR_DELETE_CONFIRM_DIALOG_SELECTOR');
    this.deleteConfirmYes    = page.locator('YOUR_DELETE_CONFIRM_YES_BUTTON_SELECTOR');
    this.deleteConfirmNo     = page.locator('YOUR_DELETE_CONFIRM_NO_BUTTON_SELECTOR');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE LOAD & NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Pauses execution for the given number of milliseconds.
   * Only use this for cases where expect.poll() or waitForLoadState() won't work.
   */
  async waitMs(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  /**
   * Do NOT call this directly.
   * Navigate via: await submissionOverview.clickLocationManagement()
   * Then verify: await locationPage.verifyPageLoaded()
   */
  async navigate(): Promise<void> {
    throw new Error(
      'LocationManagementPage has no direct URL.\n' +
      'Navigate via: await submissionOverview.clickLocationManagement()\n' +
      'Then call:    await locationPage.verifyPageLoaded()'
    );
  }

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
  // KPI BAR
  // ═══════════════════════════════════════════════════════════════════════════

  async getKpiValues(): Promise<LocationKpiValues> {
    return {
      totalLocations: (await this.kpiTotalLocations.innerText()).trim(),
      totalValue:     (await this.kpiTotalValue.innerText()).trim(),
      totalBi:        (await this.kpiTotalBi.innerText()).trim(),
      totalPd:        (await this.kpiTotalPd.innerText()).trim(),
    };
  }

  async assertKpiValues(expected: Partial<LocationKpiValues>): Promise<void> {
    const actual = await this.getKpiValues();
    if (expected.totalLocations !== undefined)
      expect(actual.totalLocations, 'KPI: Total Locations').toBe(expected.totalLocations);
    if (expected.totalPd !== undefined)
      expect(actual.totalPd, 'KPI: Total PD').toContain(expected.totalPd);
    if (expected.totalBi !== undefined)
      expect(actual.totalBi, 'KPI: Total BI').toContain(expected.totalBi);
    if (expected.totalValue !== undefined)
      expect(actual.totalValue, 'KPI: Total Value').toContain(expected.totalValue);
    this.log('✅ KPI values verified');
  }

  // ── Verisk integration ─────────────────────────────────────────────────────

  /**
   * Clicks the VERISK button and waits for the external API response.
   *
   * HOW IT WORKS:
   *   1. Sets up a response listener BEFORE clicking (prevents race condition)
   *   2. Clicks the button
   *   3. Waits for the response matching the Verisk API URL pattern
   *   4. Parses the JSON response body
   *   5. Returns the raw response so the test can compare fields to the UI
   *
   * NOTE: Replace 'YOUR_VERISK_API_URL_PATTERN' with the actual URL pattern.
   *       Check the Network tab in DevTools while clicking the button.
   *
   * USAGE:
   *   const veriskData = await locationPage.clickVeriskAndCaptureResponse();
   *   await locationPage.assertVeriskFieldsMatchResponse(veriskData);
   */
  async clickVeriskAndCaptureResponse(): Promise<VeriskApiResponse> {
    this.log('Clicking Verisk button — waiting for API response...');

    const responsePromise = this.page.waitForResponse(
      response =>
        response.url().includes('YOUR_VERISK_API_URL_PATTERN') &&
        response.status() === 200,
      { timeout: 30_000 }
    );

    await this.veriskButton.click();
    const response = await responsePromise;

    let body: Record<string, unknown> = {};
    try {
      body = await response.json();
    } catch {
      this.log('Warning: Verisk response was not valid JSON');
    }

    this.log(`Verisk API responded (status 200). Keys: ${Object.keys(body).join(', ')}`);

    // TODO: Map the actual response keys to VeriskApiResponse fields.
    //       Inspect the Network tab to find the real field names.
    return {
      protectionClass:                 this.extractString(body, 'YOUR_VERISK_PROTECTION_CLASS_KEY'),
      crimeCap:                        this.extractString(body, 'YOUR_VERISK_CRIME_CAP_KEY'),
      arsonCurrent:                    this.extractString(body, 'YOUR_VERISK_ARSON_CURRENT_KEY'),
      arsonForecast:                   this.extractString(body, 'YOUR_VERISK_ARSON_FORECAST_KEY'),
      robberyCurrent:                  this.extractString(body, 'YOUR_VERISK_ROBBERY_CURRENT_KEY'),
      robberyForecast:                 this.extractString(body, 'YOUR_VERISK_ROBBERY_FORECAST_KEY'),
      burglaryCurrent:                 this.extractString(body, 'YOUR_VERISK_BURGLARY_CURRENT_KEY'),
      burglaryForecast:                this.extractString(body, 'YOUR_VERISK_BURGLARY_FORECAST_KEY'),
      larcenyCurrent:                  this.extractString(body, 'YOUR_VERISK_LARCENY_CURRENT_KEY'),
      larcenyForecast:                 this.extractString(body, 'YOUR_VERISK_LARCENY_FORECAST_KEY'),
      aggregateCrimesPropertyCurrent:  this.extractString(body, 'YOUR_VERISK_AGGREGATE_CURRENT_KEY'),
      aggregateCrimesPropertyForecast: this.extractString(body, 'YOUR_VERISK_AGGREGATE_FORECAST_KEY'),
    };
  }

  /**
   * Clicks the COTALITY button and waits for the external API response.
   * Same pattern as clickVeriskAndCaptureResponse().
   */
  async clickCotalityAndCaptureResponse(): Promise<CotalityApiResponse> {
    this.log('Clicking Cotality button — waiting for API response...');

    const responsePromise = this.page.waitForResponse(
      response =>
        response.url().includes('YOUR_COTALITY_API_URL_PATTERN') &&
        response.status() === 200,
      { timeout: 30_000 }
    );

    await this.cotalityButton.click();
    const response = await responsePromise;

    let body: Record<string, unknown> = {};
    try {
      body = await response.json();
    } catch {
      this.log('Warning: Cotality response was not valid JSON');
    }

    this.log(`Cotality API responded (status 200). Keys: ${Object.keys(body).join(', ')}`);

    return {
      cotalityBuildingValue: this.extractString(body, 'YOUR_COTALITY_BUILDING_VALUE_KEY'),
      cotalityItvPerSqFt:    this.extractString(body, 'YOUR_COTALITY_ITV_PER_SQFT_KEY'),
      itvRatio:              this.extractString(body, 'YOUR_COTALITY_ITV_RATIO_KEY'),
    };
  }

  /** Helper: safely extract a string value from a response body object */
  private extractString(body: Record<string, unknown>, key: string): string | undefined {
    const value = body[key];
    return value !== undefined && value !== null ? String(value) : undefined;
  }

  // ── Verisk field assertions ────────────────────────────────────────────────

  /**
   * Opens the Edit modal for a location, then compares each Verisk field
   * shown in the modal against the values returned by the API.
   *
   * WHY open the modal:
   *   Verisk fields are shown in the EDIT modal, not on the main page.
   *   After Verisk runs, open a location's edit modal to see the populated fields.
   *
   * NOTE: Fields that are undefined in the response are skipped (not asserted).
   *       This handles the case where the API does not return every field.
   *
   * @param data - the VeriskApiResponse returned by clickVeriskAndCaptureResponse()
   */
  async assertVeriskFieldsMatchResponse(data: VeriskApiResponse): Promise<void> {
    this.log('--- Asserting Verisk fields match API response ---');
    if (data.protectionClass)               await this.assertReadOnlyField(this.modalVeriskProtectionClass,        data.protectionClass,               'Protection Class');
    if (data.crimeCap)                       await this.assertReadOnlyField(this.modalVeriskCrimeCapIndex,          data.crimeCap,                       'Crime Cap Index');
    if (data.arsonCurrent)                   await this.assertReadOnlyField(this.modalVeriskArsonCurrent,           data.arsonCurrent,                   'Arson (Current)');
    if (data.arsonForecast)                  await this.assertReadOnlyField(this.modalVeriskArsonForecast,          data.arsonForecast,                  'Arson (Forecast)');
    if (data.robberyCurrent)                 await this.assertReadOnlyField(this.modalVeriskRobberyCurrent,         data.robberyCurrent,                 'Robbery (Current)');
    if (data.robberyForecast)                await this.assertReadOnlyField(this.modalVeriskRobberyForecast,        data.robberyForecast,                'Robbery (Forecast)');
    if (data.burglaryCurrent)                await this.assertReadOnlyField(this.modalVeriskBurglaryCurrent,        data.burglaryCurrent,                'Burglary (Current)');
    if (data.burglaryForecast)               await this.assertReadOnlyField(this.modalVeriskBurglaryForecast,       data.burglaryForecast,               'Burglary (Forecast)');
    if (data.larcenyCurrent)                 await this.assertReadOnlyField(this.modalVeriskLarcenyCurrent,         data.larcenyCurrent,                 'Larceny (Current)');
    if (data.larcenyForecast)                await this.assertReadOnlyField(this.modalVeriskLarcenyForecast,        data.larcenyForecast,                'Larceny (Forecast)');
    if (data.aggregateCrimesPropertyCurrent)  await this.assertReadOnlyField(this.modalVeriskAggregateCrimesCurrent,  data.aggregateCrimesPropertyCurrent,  'Agg Crimes (Current)');
    if (data.aggregateCrimesPropertyForecast) await this.assertReadOnlyField(this.modalVeriskAggregateCrimesForecast, data.aggregateCrimesPropertyForecast, 'Agg Crimes (Forecast)');
    this.log('--- Verisk fields verified ✅ ---');
  }

  /**
   * Asserts Cotality fields in the modal match the captured API response.
   */
  async assertCotalityFieldsMatchResponse(data: CotalityApiResponse): Promise<void> {
    this.log('--- Asserting Cotality fields match API response ---');
    if (data.cotalityBuildingValue) await this.assertReadOnlyField(this.modalCotalityBuildingValue, data.cotalityBuildingValue, 'Cotality Building Value');
    if (data.cotalityItvPerSqFt)    await this.assertReadOnlyField(this.modalCotalityItvPerSqFt,    data.cotalityItvPerSqFt,    'Cotality ITV ($/SQ FT)');
    if (data.itvRatio)              await this.assertReadOnlyField(this.modalCotalityItvRatio,       data.itvRatio,              'ITV Ratio');
    this.log('--- Cotality fields verified ✅ ---');
  }

  /**
   * Helper: asserts a read-only field contains the expected text.
   * Uses toContainText() because read-only fields may have formatting (e.g. '$', '%').
   */
  private async assertReadOnlyField(locator: Locator, expected: string, fieldName: string): Promise<void> {
    await expect(locator, `${fieldName} should contain "${expected}"`).toContainText(expected, { timeout: 10_000 });
    this.log(`✅ ${fieldName}: ${expected}`);
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

  async clickAddNew(): Promise<void> {
    await expect(this.addNewButton, '"+ Add New" must be visible').toBeVisible();
    await this.addNewButton.click();
    await this.locationModal.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(this.modalTitle, 'Modal title should be "Add Location Data"').toContainText('Add Location Data');
    this.log('Add Location Data modal opened');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODAL — FILL INDIVIDUAL FIELDS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fills the LOCATION NO. field.
   * Must be between 001 and 999.
   * Error message: "Location No. should be between 001 and 999"
   */
  async fillLocationNo(locationNo: string): Promise<void> {
    await this.modalLocationNo.clear();
    await this.modalLocationNo.fill(locationNo);
    await this.modalLocationNo.press('Tab');
    this.log(`Filled Location No.: ${locationNo}`);
  }

  /**
   * Selects the Country.
   * WHY waitForLoadState after: selecting Country reloads the State dropdown.
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

  async selectStateProvince(state: string): Promise<void> {
    await this.modalStateDropdown.select(state);
    this.log(`Selected State/Province: ${state}`);
  }

  /**
   * Fills ZIP/Postal Code.
   * Short wait after: ZIP entry triggers county auto-population.
   */
  async fillZipPostalCode(zip: string): Promise<void> {
    await this.modalZip.clear();
    await this.modalZip.fill(zip);
    await this.modalZip.press('Tab');
    await this.page.waitForTimeout(500);
    this.log(`Filled ZIP: ${zip}`);
  }

  async selectOccupancyCode(code: string): Promise<void> {
    await this.modalOccupancyCode.select(code);
    this.log(`Selected Occupancy Code: ${code}`);
  }

  async clearOccupancyCode(): Promise<void> {
    await this.modalOccupancyClear.click();
  }

  async fillConstructionDescription(desc: string): Promise<void> {
    await this.modalConstructionDesc.clear();
    await this.modalConstructionDesc.fill(desc);
    await this.modalConstructionDesc.press('Tab');
  }

  async selectCotalityOccupancy(value: string): Promise<void> {
    await this.modalCotalityOccupancy.select(value);
    this.log(`Selected Cotality Occupancy: ${value}`);
  }

  async clearCotalityOccupancy(): Promise<void> {
    await this.modalCotalityOccClear.click();
  }

  /**
   * Fills Year Built.
   * Field accepts only 4 numeric characters.
   * Error shown until 4 chars are present: "Enter a valid 4-digit year"
   */
  async fillYearBuilt(year: string): Promise<void> {
    await this.modalYearBuilt.clear();
    await this.modalYearBuilt.fill(year);
    await this.modalYearBuilt.press('Tab');
    this.log(`Filled Year Built: ${year}`);
  }

  /**
   * Fills No. of Stories.
   * Max 99. Error if > 99 or non-numeric.
   */
  async fillNumberOfStories(stories: string): Promise<void> {
    await this.modalNoOfStories.clear();
    await this.modalNoOfStories.fill(stories);
    await this.modalNoOfStories.press('Tab');
  }

  async fillAreaSqFt(sqFt: string): Promise<void> {
    await this.modalAreaSqFt.clear();
    await this.modalAreaSqFt.fill(sqFt);
    await this.modalAreaSqFt.press('Tab');
    this.log(`Filled Area (Sq.Ft.): ${sqFt}`);
  }

  /**
   * Selects the Sprinklered radio button.
   * NOT a dropdown — two radio buttons: ○ Yes  ○ No
   */
  async selectSprinklered(value: 'Yes' | 'No'): Promise<void> {
    if (value === 'Yes') {
      await this.modalSprinkleredYes.click();
    } else {
      await this.modalSprinkleredNo.click();
    }
    this.log(`Selected Sprinklered: ${value}`);
  }

  // ── Value fields ───────────────────────────────────────────────────────────

  async fillBuildingValue(value: string): Promise<void> {
    await this.modalBuildingValue.clear();
    await this.modalBuildingValue.fill(value);
    await this.modalBuildingValue.press('Tab');
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
  }

  async fillExtraExpense(value: string): Promise<void> {
    await this.modalExtraExpense.clear();
    await this.modalExtraExpense.fill(value);
    await this.modalExtraExpense.press('Tab');
  }

  async fillDescription(text: string): Promise<void> {
    await this.modalDescription.clear();
    await this.modalDescription.fill(text);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODAL — SAVE / CANCEL
  // ═══════════════════════════════════════════════════════════════════════════

  async clickSave(): Promise<void> {
    await expect(this.modalSaveButton, 'Save button must be visible').toBeVisible();
    await this.modalSaveButton.click();
    await this.locationModal.waitFor({ state: 'hidden', timeout: 15_000 });
    await this.page.waitForLoadState('networkidle');
    this.log('Location saved — modal closed');
  }

  /**
   * Clicks Cancel on the Add modal (no warning dialog — no data to lose).
   */
  async clickCancelAdd(): Promise<void> {
    await this.modalCancelButton.click();
    await this.locationModal.waitFor({ state: 'hidden', timeout: 5_000 });
    this.log('Add modal cancelled — closed');
  }

  /**
   * Clicks Cancel on the Edit modal → Warning dialog → clicks Yes (discard).
   */
  async cancelAndConfirmDiscard(): Promise<void> {
    await this.modalCancelButton.click();
    await this.cancelWarningDialog.waitFor({ state: 'visible', timeout: 5_000 });
    await this.cancelWarningYes.click();
    await this.locationModal.waitFor({ state: 'hidden', timeout: 5_000 });
    this.log('Edit modal cancelled — changes discarded');
  }

  /**
   * Clicks Cancel on the Edit modal → Warning dialog → clicks No (keep editing).
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
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Complete "Add Location" workflow — one call to add a location and close the modal.
   *
   * STEPS:
   *   1. Click "+ Add New" — modal opens
   *   2. Fill Location No. (user-entered, 001–999)
   *   3. Fill required fields
   *   4. Fill optional fields if provided
   *   5. Click Save — modal closes, row appears in table
   *
   * RETURNS: the locationNo string that was provided in data (e.g. '001').
   *
   * USAGE:
   *   await locationPage.addLocation(LocationFactory.usaMinimal('001'));
   *   await locationPage.assertLocationInTableById('001');
   */
  async addLocation(data: LocationData): Promise<string> {
    this.log(`Starting addLocation() — Location No.: ${data.locationNo}`);

    await this.clickAddNew();

    // Fill Location No. first (top of modal, user must type it)
    await this.fillLocationNo(data.locationNo);

    // Required fields (modal order: top → bottom, left → right)
    await this.selectCountry(data.country);
    await this.fillAddress(data.address);
    await this.fillCity(data.city);
    await this.selectStateProvince(data.stateProvince);
    await this.fillZipPostalCode(data.zipPostalCode);
    await this.selectSprinklered(data.sprinklered);

    // Optional fields
    if (data.address2)               await this.fillAddress2(data.address2);
    if (data.buildingNo)             await this.fillBuildingNo(data.buildingNo);
    if (data.occupancyCode)          await this.selectOccupancyCode(data.occupancyCode);
    if (data.constructionDescription) await this.fillConstructionDescription(data.constructionDescription);
    if (data.cotalityOccupancy)      await this.selectCotalityOccupancy(data.cotalityOccupancy);
    if (data.yearBuilt)              await this.fillYearBuilt(data.yearBuilt);
    if (data.numberOfStories)        await this.fillNumberOfStories(data.numberOfStories);
    if (data.areaSqFt)               await this.fillAreaSqFt(data.areaSqFt);
    if (data.buildingValue)          await this.fillBuildingValue(data.buildingValue);
    if (data.contentsValue)          await this.fillContentsValue(data.contentsValue);
    if (data.stocksValue)            await this.fillStocksValue(data.stocksValue);
    if (data.machineryValue)         await this.fillMachineryValue(data.machineryValue);
    if (data.edp)                    await this.fillEdp(data.edp);
    if (data.otherDescription)       await this.fillOtherDescription(data.otherDescription);
    if (data.otherDollar)            await this.fillOtherDollar(data.otherDollar);
    if (data.businessInterruption)   await this.fillBusinessInterruption(data.businessInterruption);
    if (data.extraExpense)           await this.fillExtraExpense(data.extraExpense);
    if (data.description)            await this.fillDescription(data.description);

    await this.clickSave();

    this.log(`✅ Location added: No.${data.locationNo} — ${data.address}, ${data.city}`);
    return data.locationNo;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EDIT LOCATION WORKFLOW
  // ═══════════════════════════════════════════════════════════════════════════

  async clickEditForLocation(locationId: string): Promise<void> {
    const row = this.locationsTable.locator('tr').filter({ hasText: locationId }).first();
    await expect(row, `Row with Location ID "${locationId}" must exist`).toBeVisible();
    await row.locator('YOUR_EDIT_ACTION_ICON_SELECTOR').click();
    await this.locationModal.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(this.modalTitle, 'Modal title should be "Edit Location Data"').toContainText('Edit Location Data');
    this.log(`Edit modal opened for Location ID: ${locationId}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE — SINGLE ROW
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Clicks the Delete (trash) icon for a row.
   * The confirmation dialog is handled separately by the caller.
   */
  async clickDeleteForLocation(locationId: string): Promise<void> {
    const row = this.locationsTable.locator('tr').filter({ hasText: locationId }).first();
    await expect(row, `Row with Location ID "${locationId}" must exist`).toBeVisible();
    await row.locator('YOUR_DELETE_ACTION_ICON_SELECTOR').click();
    this.log(`Clicked Delete for Location ID: ${locationId}`);
  }

  /**
   * Confirms the delete: waits for confirmation dialog → clicks Yes.
   * Use after clickDeleteForLocation().
   */
  async confirmDelete(): Promise<void> {
    await this.deleteConfirmDialog.waitFor({ state: 'visible', timeout: 5_000 });
    await expect(this.deleteConfirmDialog).toContainText('Are you sure you want to delete?');
    await this.deleteConfirmYes.click();
    await this.deleteConfirmDialog.waitFor({ state: 'hidden', timeout: 5_000 });
    await this.page.waitForLoadState('networkidle');
    this.log('Delete confirmed — row removed');
  }

  /**
   * Cancels the delete: waits for confirmation dialog → clicks No.
   * Use after clickDeleteForLocation() to test the cancel behavior.
   */
  async cancelDelete(): Promise<void> {
    await this.deleteConfirmDialog.waitFor({ state: 'visible', timeout: 5_000 });
    await this.deleteConfirmNo.click();
    await this.deleteConfirmDialog.waitFor({ state: 'hidden', timeout: 5_000 });
    this.log('Delete cancelled — row kept');
  }

  /**
   * Full single-delete workflow: click delete → confirm → wait for table update.
   */
  async deleteLocation(locationId: string): Promise<void> {
    await this.clickDeleteForLocation(locationId);
    await this.confirmDelete();
    this.log(`✅ Location ${locationId} deleted`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE — BULK (CHECKBOX SELECT)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Clicks the checkbox for a specific row by Location ID.
   * After clicking, "Delete Selected" button should appear.
   */
  async selectRowCheckbox(locationId: string): Promise<void> {
    const row = this.locationsTable.locator('tr').filter({ hasText: locationId }).first();
    await expect(row, `Row with Location ID "${locationId}" must exist`).toBeVisible();
    // The checkbox is the first td in the row
    await row.locator('td:first-child input[type="checkbox"]').click();
    this.log(`Checkbox selected for Location ID: ${locationId}`);
  }

  /**
   * Clicks "Delete Selected" — only visible after ≥1 checkbox is checked.
   * The confirmation dialog is handled separately.
   */
  async clickDeleteSelected(): Promise<void> {
    await expect(
      this.deleteSelectedButton,
      '"Delete Selected" button must be visible (check at least one checkbox first)'
    ).toBeVisible();
    await this.deleteSelectedButton.click();
    this.log('Clicked "Delete Selected"');
  }

  /**
   * Full bulk-delete workflow: select rows → click Delete Selected → confirm.
   *
   * @param locationIds - Array of Location IDs to delete e.g. ['001', '002']
   */
  async bulkDeleteLocations(locationIds: string[]): Promise<void> {
    for (const id of locationIds) {
      await this.selectRowCheckbox(id);
    }
    await this.clickDeleteSelected();
    await this.confirmDelete();
    this.log(`✅ Bulk deleted: ${locationIds.join(', ')}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPLOAD LOCATIONS FROM FILE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Opens the upload modal, attaches the fixture file, and uploads it.
   *
   * @param filePath - Absolute path to the .xlsx fixture file.
   *                   Use path.resolve() from the project root:
   *                   path.resolve(__dirname, '../../fixtures/location-upload-fixture.xlsx')
   *
   * WHAT HAPPENS:
   *   1. Click Upload button → modal opens
   *   2. Attach file to the hidden <input type="file">
   *   3. Click Upload button inside the modal
   *   4. Wait for modal to close and table to update
   */
  async uploadLocationsFromFile(filePath: string): Promise<void> {
    this.log(`Starting upload from: ${filePath}`);

    // Open upload modal
    await this.uploadButton.click();
    await this.uploadModal.waitFor({ state: 'visible', timeout: 10_000 });
    this.log('Upload modal opened');

    // Attach file — setInputFiles works even if the input is hidden
    await this.uploadFileInput.setInputFiles(filePath);
    this.log('File attached to upload input');

    // Click Upload button inside the modal
    await this.uploadSubmitButton.click();

    // Wait for modal to close and data to load
    await this.uploadModal.waitFor({ state: 'hidden', timeout: 30_000 });
    await this.page.waitForLoadState('networkidle');

    this.log('Upload complete — modal closed');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEMPLATE DOWNLOAD
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Clicks the "Location Data Excel Template.xlsx" link and waits for the download.
   * Returns the download object so the test can verify file name / size.
   */
  async downloadTemplate(): Promise<import('@playwright/test').Download> {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.templateLink.click(),
    ]);
    this.log(`Template download triggered: ${download.suggestedFilename()}`);
    return download;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTO-CALCULATED VALUE ASSERTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async getCalculatedValues(): Promise<LocationCalculatedValues> {
    return {
      propertyDamageTotalLimit: (await this.modalPropertyDamageTotal.inputValue()).trim(),
      biEeTotal:                (await this.modalBiEeTotal.inputValue()).trim(),
      locationTotal:            (await this.modalLocationTotal.inputValue()).trim(),
      buildingItv:              (await this.modalBuildingItv.inputValue()).trim(),
    };
  }

  async assertPropertyDamageTotal(expected: string): Promise<void> {
    await expect(this.modalPropertyDamageTotal, `PD TOTAL should be "${expected}"`).toHaveValue(expected);
    this.log(`✅ Property Damage Total: ${expected}`);
  }

  async assertBiEeTotal(expected: string): Promise<void> {
    await expect(this.modalBiEeTotal, `BI/EE TOTAL should be "${expected}"`).toHaveValue(expected);
    this.log(`✅ BI/EE Total: ${expected}`);
  }

  async assertLocationTotal(expected: string): Promise<void> {
    await expect(this.modalLocationTotal, `LOCATION TOTAL should be "${expected}"`).toHaveValue(expected);
    this.log(`✅ Location Total: ${expected}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TABLE ASSERTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async assertTableIsEmpty(): Promise<void> {
    await expect(this.noLocationsText, 'Table should show no locations message').toBeVisible();
    this.log('✅ Table is empty');
  }

  async assertTableHasLocations(): Promise<void> {
    await expect(this.noLocationsText, 'Table should NOT be empty').toBeHidden();
    this.log('✅ Table has locations');
  }

  async assertLocationCount(expected: number): Promise<void> {
    const actual = await this.getLocationCount();
    expect(actual, `Expected ${expected} location(s), found ${actual}`).toBe(expected);
    this.log(`✅ Location count: ${actual}`);
  }

  async assertLocationInTableById(locationId: string): Promise<void> {
    const row = this.locationsTable.locator('tr').filter({ hasText: locationId }).first();
    await expect(row, `Location ID "${locationId}" should be visible in the table`).toBeVisible({ timeout: 10_000 });
    this.log(`✅ Location ID "${locationId}" found in table`);
  }

  async assertLocationNotInTable(locationId: string): Promise<void> {
    const row = this.locationsTable.locator('tr').filter({ hasText: locationId }).first();
    await expect(row, `Location ID "${locationId}" should NOT be in the table`).toBeHidden({ timeout: 5_000 });
    this.log(`✅ Location ID "${locationId}" not in table (deleted)`);
  }

  async assertLocationInTableByAddress(addressPart: string): Promise<void> {
    const row = this.locationsTable.locator('tr').filter({ hasText: addressPart }).first();
    await expect(row, `Address "${addressPart}" should be in the table`).toBeVisible({ timeout: 10_000 });
    this.log(`✅ Address "${addressPart}" found in table`);
  }

  async getTableRowById(locationId: string): Promise<Partial<LocationTableRow>> {
    const row = this.locationsTable.locator('tbody tr').filter({ hasText: locationId }).first();
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

  async assertTableRow(locationId: string, expected: Partial<LocationTableRow>): Promise<void> {
    const actual = await this.getTableRowById(locationId);
    if (expected.address)         expect(actual.address,         'ADDRESS').toContain(expected.address);
    if (expected.address2)        expect(actual.address2,        'ADDRESS 2').toContain(expected.address2);
    if (expected.city)            expect(actual.city,            'CITY').toBe(expected.city);
    if (expected.stateProvince)   expect(actual.stateProvince,   'STATE/PROVINCE').toBe(expected.stateProvince);
    if (expected.zipPostalCode)   expect(actual.zipPostalCode,   'ZIP/POSTAL CODE').toBe(expected.zipPostalCode);
    if (expected.country)         expect(actual.country,         'COUNTRY').toBe(expected.country);
    if (expected.protectionClass) expect(actual.protectionClass, 'PROTECTION CLASS').toBe(expected.protectionClass);
    if (expected.totalPd)         expect(actual.totalPd,         'TOTAL PD').toContain(expected.totalPd);
    if (expected.totalBi)         expect(actual.totalBi,         'TOTAL BI').toContain(expected.totalBi);
    this.log(`✅ Table row for Location ID "${locationId}" verified`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATION ERROR ASSERTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async assertLocationNoError(): Promise<void> {
    await expect(this.errLocationNo, 'Location No. error should be visible').toBeVisible();
    await expect(this.errLocationNo).toContainText('Location No. should be between 001 and 999');
    this.log('✅ Location No. validation error shown');
  }

  async assertBuildingNoError(): Promise<void> {
    // TODO: fill in the actual error message text once confirmed
    await expect(this.errBuildingNo, 'Building No. error should be visible').toBeVisible();
    this.log('✅ Building No. validation error shown');
  }

  async assertCountryRequiredError(): Promise<void> {
    await expect(this.errCountry, '"Country is required" error should be visible').toBeVisible();
    await expect(this.errCountry).toContainText('Country is required');
    this.log('✅ Country required error shown');
  }

  async assertAddressRequiredError(): Promise<void> {
    await expect(this.errAddress, '"Address is required" error should be visible').toBeVisible();
    await expect(this.errAddress).toContainText('Address is required');
    this.log('✅ Address required error shown');
  }

  async assertCityRequiredError(): Promise<void> {
    await expect(this.errCity, '"City is required" error should be visible').toBeVisible();
    await expect(this.errCity).toContainText('City is required');
    this.log('✅ City required error shown');
  }

  async assertStateProvinceRequiredError(): Promise<void> {
    await expect(this.errStateProvince, '"State is required" error should be visible').toBeVisible();
    await expect(this.errStateProvince).toContainText('State is required');
    this.log('✅ State/Province required error shown');
  }

  async assertZipRequiredError(): Promise<void> {
    await expect(this.errZip, '"Zip/Postal Code is required" error should be visible').toBeVisible();
    await expect(this.errZip).toContainText('Zip/Postal Code is required');
    this.log('✅ Zip required error shown');
  }

  async assertZipPatternError(): Promise<void> {
    await expect(this.errZipPattern, 'Zip pattern error should be visible').toBeVisible();
    await expect(this.errZipPattern).toContainText('Zip does not match the valid pattern');
    this.log('✅ Zip pattern error shown');
  }

  async assertYearBuiltError(): Promise<void> {
    await expect(this.errYearBuilt, 'Year Built error should be visible').toBeVisible();
    await expect(this.errYearBuilt).toContainText('Enter a valid 4-digit year');
    this.log('✅ Year Built error shown');
  }

  async assertNoOfStoriesMaxError(): Promise<void> {
    await expect(this.errNoOfStoriesMax, 'No. of stories max error should be visible').toBeVisible();
    await expect(this.errNoOfStoriesMax).toContainText('No. of stories must be less than or equal to 99');
    this.log('✅ No. of stories max error shown');
  }

  async assertNoOfStoriesTypeError(): Promise<void> {
    await expect(this.errNoOfStoriesType, 'No. of stories type error should be visible').toBeVisible();
    await expect(this.errNoOfStoriesType).toContainText('No. of stories must be a valid number');
    this.log('✅ No. of stories type error shown');
  }

  async assertSaveButtonEnabled(): Promise<void> {
    await expect(this.modalSaveButton, 'Save button should be enabled').toBeEnabled();
  }

  async assertSaveButtonDisabled(): Promise<void> {
    await expect(this.modalSaveButton, 'Save button should be disabled').toBeDisabled();
  }

  async assertDeleteSelectedButtonVisible(): Promise<void> {
    await expect(this.deleteSelectedButton, '"Delete Selected" button should be visible').toBeVisible();
    this.log('✅ Delete Selected button visible');
  }

  async assertDeleteSelectedButtonHidden(): Promise<void> {
    await expect(this.deleteSelectedButton, '"Delete Selected" button should be hidden').toBeHidden();
    this.log('✅ Delete Selected button hidden');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HQ LOCATION DESIGNATION
  // ═══════════════════════════════════════════════════════════════════════════

  async selectHqMode(mode: HqDesignationMode): Promise<void> {
    if (mode === 'existing') {
      await this.hqRadioSelectExisting.click();
    } else {
      await this.hqRadioNotALocation.click();
    }
    this.log(`HQ mode selected: ${mode}`);
  }

  async selectHqFromExistingLocation(locationId: string): Promise<void> {
    await this.selectHqMode('existing');
    await this.hqSelectDropdown.select(locationId);
    await this.hqSetAsHqButton.click();
    await this.page.waitForLoadState('networkidle');
    this.log(`HQ set from existing location: ${locationId}`);
  }

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
    this.log(`HQ address saved: ${data.address}`);
  }

  // ── Backward compatibility ─────────────────────────────────────────────────

  /** @deprecated Use getKpiValues() */
  async getPageSummary(): Promise<LocationPageSummary> {
    return this.getKpiValues();
  }

  /** @deprecated Use assertKpiValues() */
  async assertPageSummary(expected: Partial<LocationKpiValues>): Promise<void> {
    return this.assertKpiValues(expected);
  }
}
