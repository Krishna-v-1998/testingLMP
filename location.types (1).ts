/**
 * location.types.ts
 *
 * Complete data structures for the Location Management page.
 *
 * ── WHAT THE PAGE CONTAINS ─────────────────────────────────────────────────
 *
 *   Location Management page (accessed from sidebar → Location Management)
 *
 *   TWO TABS:
 *     • Location Data     — KPIs + HQ section + Locations table + Add/Edit modal
 *     • Location Summary  — Read-only aggregate view (in development)
 *
 *   KPI BAR (always visible):
 *     Total No. of Locations | Total Value | Total BI | Total PD | VERISK | COTALITY
 *
 *   HQ LOCATION DESIGNATION section (above the table, UI in development):
 *     Set one location (or a manual address) as the HQ for this account.
 *
 *   LOCATIONS TABLE:
 *     CHECKBOX | TYPE | LOCATION ID | ADDRESS | ADDRESS 2 | CITY |
 *     STATE/PROVINCE | ZIP/POSTAL CODE | COUNTRY | PROTECTION CLASS |
 *     TOTAL PD | TOTAL BI | ACTIONS (Edit, Delete)
 *
 * ── AUTO-CALCULATED FIELDS ─────────────────────────────────────────────────
 *
 *   These are filled by the app — DO NOT fill them, only assert:
 *
 *   PROPERTY DAMAGE TOTAL LIMIT
 *     = Building Value + Contents Value + Stocks Value + Machinery Value + EDP + Other($)
 *
 *   BI/EE TOTAL
 *     = Business Interruption + Extra Expense
 *
 *   LOCATION TOTAL
 *     = Property Damage Total Limit + BI/EE Total
 *
 *   BUILDING ITV
 *     = Building Value / Area (Sq.Ft.)
 */

// ── Input data for the Add/Edit Location modal ─────────────────────────────

/**
 * LocationData
 *
 * Use this when calling addLocation() or editLocation().
 * Required fields match the fields marked * in the application.
 *
 * NOTE: locationNo is manually entered by the user (NOT auto-generated).
 *       Must be between 001 and 999. Error if out of range or non-numeric.
 *
 * USAGE:
 *   const data: LocationData = LocationFactory.usaMinimal();
 *   await locationPage.addLocation(data);
 */
export interface LocationData {
  // ── REQUIRED fields (marked * in the application) ─────────────────────────

  /**
   * Manually entered by user. Must be between 001 and 999.
   * Error message: "Location No. should be between 001 and 999"
   * Format: zero-padded e.g. '001', '042', '999'
   */
  locationNo: string;

  /** dropdown: 'USA' | 'Canada' */
  country: string;

  /** text e.g. '5 Independence Way' */
  address: string;

  /** text e.g. 'New York' */
  city: string;

  /**
   * dropdown — options depend on Country.
   * USA examples:    'NY - New York', 'TX - Texas', 'CA - California'
   * Canada examples: 'ON - Ontario',  'BC - British Columbia'
   */
  stateProvince: string;

  /** text e.g. '10001' (USA) or 'M5J 2J1' (Canada) */
  zipPostalCode: string;

  /** radio button: 'Yes' | 'No' */
  sprinklered: 'Yes' | 'No';

  // ── OPTIONAL fields ────────────────────────────────────────────────────────

  /**
   * Separate field from locationNo.
   * Numeric, between 1 and 99.
   * Error messages: TODO (3 error messages to be confirmed)
   */
  buildingNo?: string;

  /** text — second address line e.g. 'Suite 205' */
  address2?: string;

  /** text — auto-populated after ZIP is entered; can be manually overridden */
  county?: string;

  /** dropdown — list of occupancy codes */
  occupancyCode?: string;

  /** text — free-form description of the construction */
  constructionDescription?: string;

  /**
   * CASUALTY / TIV CALCULATION SECTION
   * App shows a red warning if these are missing when needed.
   */

  /** dropdown + Clear button e.g. 'Site-Free Shell Barn' */
  cotalityOccupancy?: string;

  /**
   * 4-character text box, numbers only.
   * Error shown until 4 characters are added: "Enter a valid 4-digit year"
   */
  yearBuilt?: string;

  // ── PHYSICAL ATTRIBUTES ────────────────────────────────────────────────────

  /**
   * Numeric text box, max 99.
   * Error if > 99:    "No. of stories must be less than or equal to 99"
   * Error if letters: "No. of stories must be a valid number"
   */
  numberOfStories?: string;

  /** numeric text box — square footage e.g. '1800' */
  areaSqFt?: string;

  // ── VALUE FIELDS (all currency, all optional) ──────────────────────────────
  //
  // These FEED the auto-calculated fields:
  //   propertyDamageTotalLimit = buildingValue + contentsValue + stocksValue
  //                             + machineryValue + edp + otherDollar
  //   biEeTotal                = businessInterruption + extraExpense
  //   locationTotal            = propertyDamageTotalLimit + biEeTotal

  /** $ currency e.g. '1000000' */
  buildingValue?: string;

  /** $ currency e.g. '500000' */
  contentsValue?: string;

  /** $ currency e.g. '250000' */
  stocksValue?: string;

  /** $ currency e.g. '100000' (Electronic Data Processing equipment) */
  edp?: string;

  /** $ currency e.g. '50000' */
  machineryValue?: string;

  /** Text label describing the "Other" value */
  otherDescription?: string;

  /** $ currency — the dollar amount for the OTHER category */
  otherDollar?: string;

  /** $ currency e.g. '200000' */
  businessInterruption?: string;

  /** $ currency e.g. '50000' */
  extraExpense?: string;

  /** text area — general notes about the location */
  description?: string;
}

// ── Auto-calculated fields (READ-ONLY in the modal) ─────────────────────────

/**
 * LocationCalculatedValues
 *
 * Returned by getCalculatedValues() after filling the value fields.
 * All values are formatted strings as they appear in the DOM.
 */
export interface LocationCalculatedValues {
  propertyDamageTotalLimit: string;  // = Building + Contents + Stocks + Machinery + EDP + Other
  biEeTotal:                string;  // = Business Interruption + Extra Expense
  locationTotal:            string;  // = PD Total + BI/EE Total
  buildingItv?:             string;  // = Building Value / Area (Sq.Ft.)
}

// ── A single row in the Locations table ─────────────────────────────────────

/**
 * LocationTableRow
 *
 * Represents one row as it appears in the Locations table after saving.
 *
 * Table columns:
 *   CHECKBOX | TYPE | LOCATION ID | ADDRESS | ADDRESS 2 | CITY |
 *   STATE/PROVINCE | ZIP/POSTAL CODE | COUNTRY | PROTECTION CLASS |
 *   TOTAL PD | TOTAL BI | ACTIONS
 */
export interface LocationTableRow {
  /** 'HQ' | 'Standard' | '' */
  type:            string;

  /** zero-padded number e.g. '001', '042' — same value user typed as locationNo */
  locationId:      string;

  address:         string;
  address2:        string;
  city:            string;
  stateProvince:   string;
  zipPostalCode:   string;
  country:         string;

  /** may be blank on first creation, populated by Verisk */
  protectionClass: string;

  /** Property Damage Total — formatted e.g. '540' */
  totalPd:         string;

  /** Business Interruption Total — formatted e.g. '90' */
  totalBi:         string;
}

/** Use this to search/find a specific row — only provide the columns you know */
export type LocationTableFilter = Partial<LocationTableRow>;

// ── KPI bar shown at the top of the Location Data tab ─────────────────────

/**
 * LocationKpiValues
 *
 * The aggregate stats bar always visible on the Location Data tab.
 *
 * Example:
 *   Total No. of Locations: 2
 *   Total Value:            $ 1,260
 *   Total BI:               $ 180
 *   Total PD:               $ 1,080
 */
export interface LocationKpiValues {
  totalLocations: string;
  totalValue:     string;
  totalBi:        string;
  totalPd:        string;
}

// ── Verisk API response ──────────────────────────────────────────────────────

/**
 * VeriskApiResponse
 *
 * Fields populated by the Verisk external API call.
 * Note: not all fields are guaranteed to be in every response.
 * The app marks these fields as read-only once populated.
 *
 * Used in:
 *   const veriskData = await locationPage.clickVeriskAndCaptureResponse();
 *   await locationPage.assertVeriskFieldsMatchResponse(veriskData);
 */
export interface VeriskApiResponse {
  protectionClass?:                    string;
  crimeCap?:                           string;
  arsonCurrent?:                       string;
  arsonForecast?:                      string;
  robberyCurrent?:                     string;
  robberyForecast?:                    string;
  burglaryCurrent?:                    string;
  burglaryForecast?:                   string;
  larcenyCurrent?:                     string;
  larcenyForecast?:                    string;
  aggregateCrimesPropertyCurrent?:     string;
  aggregateCrimesPropertyForecast?:    string;
}

// ── Cotality API response ────────────────────────────────────────────────────

/**
 * CotalityApiResponse
 *
 * Fields populated by the Cotality external API call.
 * All fields are read-only in the modal once populated.
 *
 * Used in:
 *   const cotalityData = await locationPage.clickCotalityAndCaptureResponse();
 *   await locationPage.assertCotalityFieldsMatchResponse(cotalityData);
 */
export interface CotalityApiResponse {
  cotalityBuildingValue?: string;
  cotalityItvPerSqFt?:    string;
  itvRatio?:              string;
}

// ── HQ Location Designation ──────────────────────────────────────────────────

/**
 * HqDesignationMode
 *
 * 'existing'     = "Select HQ From Existing Risk Locations"
 * 'not-a-location' = "HQ Is Not A Risk Location" (default)
 */
export type HqDesignationMode = 'existing' | 'not-a-location';

/**
 * HqAddressData
 *
 * Used when setting HQ as a manual address (mode = 'not-a-location').
 */
export interface HqAddressData {
  locationNo?:   string;
  country:       string;
  address:       string;
  stateProvince: string;
  zipPostalCode: string;
}

// ── Summary stats (legacy alias — kept for backward compat) ─────────────────
/** @deprecated Use LocationKpiValues */
export type LocationPageSummary = LocationKpiValues;
