/**
 * LocationFixtureBuilder.ts
 *
 * Generates a pre-filled .xlsx file that matches the Location Management
 * upload template format. Used by upload tests in location-management.spec.ts.
 *
 * ── HOW TO USE ────────────────────────────────────────────────────────────────
 *
 *   Option A — generate once before running tests (recommended):
 *     npx ts-node src/data/fixtures/generate-location-fixture.ts
 *
 *   Option B — generate inside a test globalSetup:
 *     // playwright.config.ts
 *     globalSetup: './src/data/fixtures/generate-location-fixture.ts'
 *
 *   Option C — generate from a beforeAll inside the spec:
 *     test.beforeAll(async () => {
 *       await LocationFixtureBuilder.generate(UPLOAD_FIXTURE_PATH);
 *     });
 *
 * ── COLUMN NAMES ─────────────────────────────────────────────────────────────
 *
 *   The column headers MUST EXACTLY match the downloaded template.
 *   Steps to confirm:
 *     1. Open the Location Management page
 *     2. Click the "Location Data Template.xlsx" link to download
 *     3. Open the file in Excel / LibreOffice
 *     4. Copy the exact header row (Row 1) — case and spaces matter
 *     5. Replace the YOUR_COLUMN_* placeholders below with the real headers
 *
 *   Current placeholders:
 *     YOUR_COLUMN_LOCATION_NO       → e.g. "Location No."
 *     YOUR_COLUMN_COUNTRY           → e.g. "Country"
 *     YOUR_COLUMN_ADDRESS           → e.g. "Address"
 *     YOUR_COLUMN_ADDRESS_2         → e.g. "Address 2"
 *     YOUR_COLUMN_CITY              → e.g. "City"
 *     YOUR_COLUMN_STATE             → e.g. "State/Province"
 *     YOUR_COLUMN_ZIP               → e.g. "Zip/Postal Code"
 *     YOUR_COLUMN_BUILDING_NO       → e.g. "Building No."
 *     YOUR_COLUMN_OCCUPANCY_CODE    → e.g. "Occupancy Code"
 *     YOUR_COLUMN_CONSTRUCTION_DESC → e.g. "Construction Description"
 *     YOUR_COLUMN_YEAR_BUILT        → e.g. "Year Built"
 *     YOUR_COLUMN_STORIES           → e.g. "No. of Stories"
 *     YOUR_COLUMN_AREA              → e.g. "Area (Sq.Ft.)"
 *     YOUR_COLUMN_SPRINKLERED       → e.g. "Sprinklered"
 *     YOUR_COLUMN_BUILDING_VALUE    → e.g. "Building Value ($)"
 *     YOUR_COLUMN_CONTENTS_VALUE    → e.g. "Contents Value ($)"
 *     YOUR_COLUMN_BI                → e.g. "Business Interruption ($)"
 *
 * ── DEPENDENCY ───────────────────────────────────────────────────────────────
 *
 *   Requires: exceljs
 *   Install once:  npm install --save-dev exceljs
 *                  npm install --save-dev @types/node   (if not already present)
 */

import path   from 'path';
import ExcelJS from 'exceljs';

// ── Column header placeholders ─────────────────────────────────────────────
//
// Replace each YOUR_COLUMN_* with the exact header from the downloaded template.

const COL = {
  LOCATION_NO:       'YOUR_COLUMN_LOCATION_NO',
  COUNTRY:           'YOUR_COLUMN_COUNTRY',
  ADDRESS:           'YOUR_COLUMN_ADDRESS',
  ADDRESS_2:         'YOUR_COLUMN_ADDRESS_2',
  CITY:              'YOUR_COLUMN_CITY',
  STATE:             'YOUR_COLUMN_STATE',
  ZIP:               'YOUR_COLUMN_ZIP',
  BUILDING_NO:       'YOUR_COLUMN_BUILDING_NO',
  OCCUPANCY_CODE:    'YOUR_COLUMN_OCCUPANCY_CODE',
  CONSTRUCTION_DESC: 'YOUR_COLUMN_CONSTRUCTION_DESC',
  YEAR_BUILT:        'YOUR_COLUMN_YEAR_BUILT',
  STORIES:           'YOUR_COLUMN_STORIES',
  AREA:              'YOUR_COLUMN_AREA',
  SPRINKLERED:       'YOUR_COLUMN_SPRINKLERED',
  BUILDING_VALUE:    'YOUR_COLUMN_BUILDING_VALUE',
  CONTENTS_VALUE:    'YOUR_COLUMN_CONTENTS_VALUE',
  BI:                'YOUR_COLUMN_BI',
} as const;

// ── Row data type ──────────────────────────────────────────────────────────

interface FixtureRow {
  locationNo:       string;
  country:          string;
  address:          string;
  address2?:        string;
  city:             string;
  state:            string;
  zip:              string;
  buildingNo?:      string;
  occupancyCode?:   string;
  constructionDesc?: string;
  yearBuilt?:       string;
  stories?:         string;
  area?:            string;
  sprinklered:      'Yes' | 'No';
  buildingValue?:   string;
  contentsValue?:   string;
  bi?:              string;
}

// ── Default fixture data ───────────────────────────────────────────────────
//
// Two rows matching the spec assertions in location-management.spec.ts:
//   Test 14 expects location IDs '901' and '902' in the table after upload.
//
// Customise these rows to match what your test environment supports.

const DEFAULT_ROWS: FixtureRow[] = [
  {
    locationNo:       '901',
    country:          'USA',
    address:          '901 Upload Test Drive',
    address2:         'Suite 1',
    city:             'New York',
    state:            'NY - New York',
    zip:              '10001',
    buildingNo:       '1',
    occupancyCode:    'ADCl-0112 Oil & Natural Gas Exploration - Onshore',
    constructionDesc: 'Brick',
    yearBuilt:        '2005',
    stories:          '3',
    area:             '2000',
    sprinklered:      'Yes',
    buildingValue:    '100000',
    contentsValue:    '50000',
    bi:               '20000',
  },
  {
    locationNo:       '902',
    country:          'USA',
    address:          '902 Upload Test Street',
    city:             'Los Angeles',
    state:            'CA - California',
    zip:              '90001',
    sprinklered:      'No',
    buildingValue:    '200000',
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// LocationFixtureBuilder
// ═════════════════════════════════════════════════════════════════════════════

export class LocationFixtureBuilder {

  /**
   * Generates the upload fixture .xlsx file at the given path.
   *
   * @param outputPath - Absolute path for the generated file.
   *                     Default: src/data/fixtures/location-upload-fixture.xlsx
   * @param rows       - Optional override for the fixture rows.
   *                     If omitted, DEFAULT_ROWS are used.
   */
  static async generate(
    outputPath: string = path.resolve(__dirname, 'location-upload-fixture.xlsx'),
    rows: FixtureRow[] = DEFAULT_ROWS,
  ): Promise<void> {
    const workbook  = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Locations');

    // ── Header row ─────────────────────────────────────────────────────────
    worksheet.addRow([
      COL.LOCATION_NO,
      COL.COUNTRY,
      COL.ADDRESS,
      COL.ADDRESS_2,
      COL.CITY,
      COL.STATE,
      COL.ZIP,
      COL.BUILDING_NO,
      COL.OCCUPANCY_CODE,
      COL.CONSTRUCTION_DESC,
      COL.YEAR_BUILT,
      COL.STORIES,
      COL.AREA,
      COL.SPRINKLERED,
      COL.BUILDING_VALUE,
      COL.CONTENTS_VALUE,
      COL.BI,
    ]);

    // ── Data rows ───────────────────────────────────────────────────────────
    for (const r of rows) {
      worksheet.addRow([
        r.locationNo,
        r.country,
        r.address,
        r.address2        ?? '',
        r.city,
        r.state,
        r.zip,
        r.buildingNo      ?? '',
        r.occupancyCode   ?? '',
        r.constructionDesc ?? '',
        r.yearBuilt       ?? '',
        r.stories         ?? '',
        r.area            ?? '',
        r.sprinklered,
        r.buildingValue   ?? '',
        r.contentsValue   ?? '',
        r.bi              ?? '',
      ]);
    }

    // ── Style: bold header ──────────────────────────────────────────────────
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.commit();

    // ── Auto-width columns ──────────────────────────────────────────────────
    worksheet.columns.forEach(col => {
      let maxLen = 10;
      col.eachCell?.({ includeEmpty: false }, cell => {
        const len = cell.value ? String(cell.value).length : 0;
        if (len > maxLen) maxLen = len;
      });
      col.width = maxLen + 2;
    });

    await workbook.xlsx.writeFile(outputPath);
    console.log(`[LocationFixtureBuilder] Generated: ${outputPath}`);
    console.log(`[LocationFixtureBuilder] Rows: ${rows.length}`);
  }

  /**
   * Returns the Location IDs that are in the default fixture.
   * Use these in upload test assertions:
   *
   *   const ids = LocationFixtureBuilder.defaultLocationIds();
   *   for (const id of ids) {
   *     await locationPage.assertLocationInTableById(id);
   *   }
   */
  static defaultLocationIds(): string[] {
    return DEFAULT_ROWS.map(r => r.locationNo);
  }

  /**
   * Returns the default fixture rows.
   * Use in tests that need to assert specific field values after upload.
   */
  static defaultRows(): FixtureRow[] {
    return DEFAULT_ROWS;
  }
}
