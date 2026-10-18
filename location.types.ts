/**
 * location.types.ts
 *
 * Complete data structures for the Location Management page.
 * Derived from video analysis of the actual application.
 *
 * ── WHAT THE PAGE CONTAINS ─────────────────────────────────────────────────
 *
 *   Location Management page (accessed from sidebar: Underwriting File → Location Management)
 *
 *   TWO TABS:
 *     • Location Data     — HQ section + Locations table + Add/Edit modal
 *     • Location Summary  — Aggregated view of all locations
 *
 *   SUMMARY STATS BAR (visible when ≥1 location exists):
 *     Total No. of Locations | Total Value | Total BI | Total PD | VERISK | COTALITY
 *
 *   HQ LOCATION DESIGNATION section (above the table):
 *     Set one location (or a manual address) as the HQ for this account.
 *
 *   LOCATIONS TABLE:
 *     TYPE | LOCATION ID | ADDRESS | ADDRESS 2 | CITY | STATE/PROVINCE |
 *     ZIP/POSTAL CODE | COUNTRY | PROTECTION CLASS | TOTAL PD | TOTAL BI | ACTIONS
 *     ACTIONS = Edit (pencil) | Delete (trash)
 *
 * ── AUTO-CALCULATED FIELDS ─────────────────────────────────────────────────
 *
 *   The modal computes these fields automatically when you fill the inputs.
 *   Do NOT fill them — only assert them:
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
 * USAGE:
 *   const data: LocationData = {
 *     country:         'USA',
 *     address:         '5 Independence Way',
 *     city:            'New York',
 *     stateProvince:   'NY - New York',
 *     zipPostalCode:   '10001',
 *     sprinklered:     'Yes',
 *   };
 *   const locationId = await locationManagementPage.addLocation(data);
 */
export interface LocationData {
  // ── REQUIRED fields (marked * in the application) ────────────────────────

  /** dropdown: 'USA' | 'Canada' */
  country: string;

  /** text e.g. '5 Independence Way' */
  address: string;

  /** text e.g. 'New York' */
  city: string;

  /** dropdown — options depend on Country.
   *  USA examples:   'NY - New York', 'TX - Texas', 'CA - California'
   *  Canada examples: 'ON - Ontario', 'BC - British Columbia' */
  stateProvince: string;

  /** text e.g. '10001' (USA) or 'K1A 0A9' (Canada) */
  zipPostalCode: string;

  /** radio button: 'Yes' | 'No' */
  sprinklered: 'Yes' | 'No';

  // ── OPTIONAL fields ────────────────────────────────────────────────────────

  /** text — second address line e.g. 'Suite 205' */
  address2?: string;

  /** text — auto-populated after ZIP is entered; can be manually overridden */
  county?: string;

  /** text e.g. '3' — building number within the location */
  buildingNo?: string;

  /** dropdown + Clear button e.g. 'ADCl-0112 Oil & Natural Gas Exploration - Onshore' */
  occupancyCode?: string;

  /** text — free-form description of the construction */
  constructionDescription?: string;

  /**
   * CASUALTY / TIV CALCULATION SECTION
   * (Required when Casualty TIV calculation is needed)
   * The app shows a red warning if these are missing.
   */

  /** dropdown + Clear button e.g. 'Site-Free Shell Barn' */
  totalityOccupancy?: string;

  /** dropdown + Clear button (ISO code) e.g. 'ISO 5 - Modified or Semi-Fire Resistive' */
  constructionIsoCode?: string;

  /** text e.g. '1999' */
  yearBuilt?: string;

  // ── PHYSICAL ATTRIBUTES ────────────────────────────────────────────────────

  /** text e.g. '5' */
  numberOfStories?: string;

  /** text — square footage e.g. '1800' */
  areaSqFt?: string;

  // ── VALUE FIELDS (all currency, all optional) ──────────────────────────────
  //
  // NOTE: These FEED the auto-calculated fields:
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

  /** % — e.g. '80' — dropdown/text with "x" clear button */
  itvRatio?: string;

  /** text — crime cap index */
  crimeCap?: string;

  /** text area — general notes about the location */
  description?: string;
}

// ── Auto-calculated fields (READ-ONLY in the modal) ─────────────────────────

/**
 * LocationCalculatedValues
 *
 * These are filled automatically by the application when you enter the value inputs.
 * Use these in assertions to verify the auto-calculation is correct.
 *
 * All values are formatted as strings (e.g. '$ 540', '$ 180') by the application.
 */
export interface LocationCalculatedValues {
  protectionClass?:         string;  // auto from ZIP lookup
  propertyDamageTotalLimit: string;  // = Building + Contents + Stocks + Machinery + EDP + Other
  biEeTotal:                string;  // = Business Interruption + Extra Expense
  locationTotal:            string;  // = PD Total + BI/EE Total
  buildingItv:              string;  // = Building Value / Area (Sq.Ft.)
  totalityBuildingValue?:   string;  // from Cotality integration
  totalityTivPerSqFt?:      string;  // from Cotality integration
}

// ── A single row in the Locations table ─────────────────────────────────────

/**
 * LocationTableRow
 *
 * Represents one row as it appears in the Locations table after saving.
 *
 * Table columns:
 *   TYPE | LOCATION ID | ADDRESS | ADDRESS 2 | CITY | STATE/PROVINCE |
 *   ZIP/POSTAL CODE | COUNTRY | PROTECTION CLASS | TOTAL PD | TOTAL BI | ACTIONS
 */
export interface LocationTableRow {
  /** usually empty / blank */
  type:             string;

  /** auto-generated — zero-padded number e.g. '005' */
  locationId:       string;

  address:          string;
  address2:         string;
  city:             string;
  stateProvince:    string;
  zipPostalCode:    string;
  country:          string;

  /** may be blank on first creation */
  protectionClass:  string;

  /** Property Damage Total — formatted e.g. '540' */
  totalPd:          string;

  /** Business Interruption Total — formatted e.g. '180' */
  totalBi:          string;
}

/** Use this to search/find a specific row — only provide the columns you know */
export type LocationTableFilter = Partial<LocationTableRow>;

// ── Summary stats shown at the top of the Location Data tab ─────────────────

/**
 * LocationPageSummary
 *
 * The aggregate stats bar visible when ≥1 location has been added.
 *
 * Example:
 *   Total No. of Locations: 1
 *   Total Value:             $ 720
 *   Total BI:                $ 180
 *   Total PD:                $ 540
 */
export interface LocationPageSummary {
  totalLocations: string;
  totalValue:     string;
  totalBi:        string;
  totalPd:        string;
}

// ── HQ Location Designation ──────────────────────────────────────────────────

/**
 * HqDesignationMode
 *
 * Controls which radio button is selected in the HQ Designation section.
 *
 * 'existing' = "Select HQ From Existing Risk Locations"
 *              → pick from the dropdown of saved locations
 *
 * 'not-a-location' = "HQ Is Not A Risk Location" (default)
 *              → fill in a manual address
 */
export type HqDesignationMode = 'existing' | 'not-a-location';

/**
 * HqAddressData
 *
 * Used when setting HQ as a manual address (mode = 'not-a-location').
 */
export interface HqAddressData {
  locationNo?:    string;  // auto-populated
  country:        string;
  address:        string;
  stateProvince:  string;
  zipPostalCode:  string;
}
