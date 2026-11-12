/**
 * FormsFixtureBuilder.ts
 *
 * Generates the Excel fixture file used to drive Forms tests.
 *
 * ── SHEET STRUCTURE ───────────────────────────────────────────────────────────
 *
 *   ONE sheet: "Form Field Mapping"
 *
 *   Each ROW = one form field.  Form-level columns (Form Name, Form ID, etc.)
 *   repeat on every row that belongs to that form — this flat layout makes it
 *   easy for FormsDataReader to parse without JOIN logic.
 *
 * ── COLUMN GUIDE ─────────────────────────────────────────────────────────────
 *
 *   Column  Header               Purpose
 *   ──────  ───────────────────  ───────────────────────────────────────────────
 *   A       Form Name            Human-readable form name (e.g. "Inland Marine
 *                                Table of Contents")
 *   B       Form ID              Unique key used to match forms to fields and
 *                                to locate the form in the UI
 *   C       Form Number          Official form number (e.g. "IM FGL TG 14")
 *   D       Formset Name         Exact text of the radio-button Formset in the UI
 *   E       Product              Must match Product dropdown value in the app
 *   F       Sub Segment          Must match Sub-Segment dropdown value
 *   G       Mandatory / Optional Exactly "Mandatory" or "Optional"
 *   H       Applicable State(s)  "ALL" or comma-separated codes "NY,CA,TX"
 *   I       Template Version     PDF template version for template-vs-generated
 *                                comparison (e.g. "v1.0")
 *   J       Form Field           Field label as shown in the UI
 *   K       Field ID / Key       Comma-separated selector hints for the field:
 *                                CSS selector / aria-label / data-testid.
 *                                FormsPage.resolveFieldLocator() tries each in order.
 *                                e.g. "[data-key='policyNumber'], #policyNum"
 *   L       Field Type           text | dropdown | radio | checkbox | date |
 *                                currency | textarea | number
 *   M       Expected Value       Value to enter / select during the test
 *   N       Value Source         Static | Derived | Submission | API:<fieldName>
 *   O       PDF Label            Label as printed in the PDF (may differ from UI label)
 *   P       Required             Y or N
 *   Q       Notes                Freeform remarks, placeholder reminders, etc.
 *
 * ── USAGE ────────────────────────────────────────────────────────────────────
 *
 *   Generate the sample fixture once:
 *     npx ts-node src/data/fixtures/generate-forms-fixture.ts
 *
 *   Open the generated Excel in Excel / LibreOffice, fill in real form/field
 *   data, save.  FormsDataReader reads it at test time.
 *
 * ── DEPENDENCY ───────────────────────────────────────────────────────────────
 *
 *   npm install --save-dev exceljs
 */

import path   from 'path';
import ExcelJS from 'exceljs';

// ── Column headers (order matters — matches FormsDataReader column mapping) ─────

const COLUMNS: { header: string; width: number }[] = [
  { header: 'Form Name',            width: 44 },
  { header: 'Form ID',              width: 20 },
  { header: 'Form Number',          width: 22 },
  { header: 'Formset Name',         width: 26 },
  { header: 'Product',              width: 22 },
  { header: 'Sub Segment',          width: 28 },
  { header: 'Mandatory / Optional', width: 20 },
  { header: 'Applicable State(s)',  width: 20 },
  { header: 'Template Version',     width: 18 },
  { header: 'Form Field',           width: 32 },
  { header: 'Field ID / Key',       width: 48 },
  { header: 'Field Type',           width: 14 },
  { header: 'Expected Value',       width: 36 },
  { header: 'Value Source',         width: 20 },
  { header: 'PDF Label',            width: 36 },
  { header: 'Required',             width: 10 },
  { header: 'Notes',                width: 44 },
];

// ── Sample data ────────────────────────────────────────────────────────────────
//
// Replace every row with your actual form + field inventory.
// Keep at least one real form + field so the reader validates successfully.
//
// Field ID / Key column: comma-separated selector hints that FormsPage uses to
// resolve the Playwright Locator. Supply as many as you can observe in DevTools.
// Priority order: aria-label, data-testid, CSS class + attribute, role+name.

type Row = {
  'Form Name':            string;
  'Form ID':              string;
  'Form Number':          string;
  'Formset Name':         string;
  'Product':              string;
  'Sub Segment':          string;
  'Mandatory / Optional': string;
  'Applicable State(s)':  string;
  'Template Version':     string;
  'Form Field':           string;
  'Field ID / Key':       string;
  'Field Type':           string;
  'Expected Value':       string;
  'Value Source':         string;
  'PDF Label':            string;
  'Required':             string;
  'Notes':                string;
};

// ── Utility: build a row with form-level fields shared and field-level filled ──
function row(
  formLevel: Omit<Row, 'Form Field' | 'Field ID / Key' | 'Field Type' | 'Expected Value' | 'Value Source' | 'PDF Label' | 'Required' | 'Notes'>,
  fieldLevel: Pick<Row, 'Form Field' | 'Field ID / Key' | 'Field Type' | 'Expected Value' | 'Value Source' | 'PDF Label' | 'Required' | 'Notes'>
): Row {
  return { ...formLevel, ...fieldLevel };
}

// ── Shared form-level definitions ──────────────────────────────────────────────
//
//  Form IDs and names taken from the real Allianz Builder's Risk form list
//  visible in the UI (Forms tab → Form Fields panel).

/** BR 4000DEC 11 15 — Builder's Risk Declarations QTLR (Mandatory) */
const FORM_BR_DEC = {
  'Form Name':            "Builder's Risk Declarations QTLR",
  'Form ID':              'BR-4000DEC-11-15',
  'Form Number':          'BR 4000DEC 11 15',
  'Formset Name':         "Builder's Risk",
  'Product':              'Construction',
  'Sub Segment':          "Builder's Risk",
  'Mandatory / Optional': 'Mandatory',
  'Applicable State(s)':  'ALL',
  'Template Version':     'v1.0',
};

/** TER 9015PHN 02 15 — Important Notice Regarding Terrorism Coverage (Mandatory) */
const FORM_TER = {
  'Form Name':            'Important Notice Regarding Terrorism Coverage',
  'Form ID':              'TER-9015PHN-02-15',
  'Form Number':          'TER 9015PHN 02 15',
  'Formset Name':         "Builder's Risk",
  'Product':              'Construction',
  'Sub Segment':          "Builder's Risk",
  'Mandatory / Optional': 'Mandatory',
  'Applicable State(s)':  'ALL',
  'Template Version':     'v1.0',
};

/** IM 8035 12 20 — Electronic Data Exclusion Endorsement (Mandatory) */
const FORM_IM_ELEC = {
  'Form Name':            'Electronic Data Exclusion Endorsement',
  'Form ID':              'IM-8035-12-20',
  'Form Number':          'IM 8035 12 20',
  'Formset Name':         "Builder's Risk",
  'Product':              'Construction',
  'Sub Segment':          "Builder's Risk",
  'Mandatory / Optional': 'Mandatory',
  'Applicable State(s)':  'ALL',
  'Template Version':     'v1.0',
};

/** IM 8010 08 15 — Windstorm and Hail Deductible Endorsement (Optional) */
const FORM_IM_WIND = {
  'Form Name':            'Windstorm and Hail Deductible Endorsement',
  'Form ID':              'IM-8010-08-15',
  'Form Number':          'IM 8010 08 15',
  'Formset Name':         "Builder's Risk",
  'Product':              'Construction',
  'Sub Segment':          "Builder's Risk",
  'Mandatory / Optional': 'Optional',
  'Applicable State(s)':  'ALL',
  'Template Version':     'v1.0',
};

// ── Flat rows ──────────────────────────────────────────────────────────────────

const SAMPLE_ROWS: Row[] = [

  // ── BR 4000DEC 11 15 — Builder's Risk Declarations QTLR (Mandatory) ──────────
  //   Real field labels from the UI (Form Fields panel screenshot).
  row(FORM_BR_DEC, {
    'Form Field':     'Occupancy / Intended Use',
    'Field ID / Key': "[aria-label='Occupancy / Intended Use'], [data-key='occupancyIntendedUse']",
    'Field Type':     'text',
    'Expected Value': 'Residential Construction',
    'Value Source':   'Static',
    'PDF Label':      'OCCUPANCY / INTENDED USE',
    'Required':       'Y',
    'Notes':          'Describe how the building will be used after completion',
  }),
  row(FORM_BR_DEC, {
    'Form Field':     'Number of Stories',
    'Field ID / Key': "[aria-label='Number of Stories'], [data-key='numberOfStories']",
    'Field Type':     'number',
    'Expected Value': '5',
    'Value Source':   'Static',
    'PDF Label':      'NUMBER OF STORIES',
    'Required':       'Y',
    'Notes':          '',
  }),
  row(FORM_BR_DEC, {
    'Form Field':     'Square Footage',
    'Field ID / Key': "[aria-label='Square Footage'], [data-key='squareFootage']",
    'Field Type':     'number',
    'Expected Value': '25000',
    'Value Source':   'Static',
    'PDF Label':      'SQUARE FOOTAGE',
    'Required':       'Y',
    'Notes':          '',
  }),
  row(FORM_BR_DEC, {
    'Form Field':     'Construction Start Date',
    'Field ID / Key': "[aria-label='Construction Start Date'], [data-key='constructionStartDate']",
    'Field Type':     'date',
    'Expected Value': '01/01/2026',
    'Value Source':   'Static',
    'PDF Label':      'CONSTRUCTION START DATE',
    'Required':       'Y',
    'Notes':          'MM/DD/YYYY format',
  }),
  row(FORM_BR_DEC, {
    'Form Field':     'Estimated Completion Date',
    'Field ID / Key': "[aria-label='Estimated Completion Date'], [data-key='estimatedCompletionDate']",
    'Field Type':     'date',
    'Expected Value': '12/31/2026',
    'Value Source':   'Static',
    'PDF Label':      'ESTIMATED COMPLETION DATE',
    'Required':       'Y',
    'Notes':          '',
  }),
  row(FORM_BR_DEC, {
    'Form Field':     'Construction Project Site(s)',
    'Field ID / Key': "[aria-label='Construction Project Site(s)'], [data-key='constructionProjectSites']",
    'Field Type':     'textarea',
    'Expected Value': '100 Main Street, New York, NY 10001',
    'Value Source':   'Static',
    'PDF Label':      'CONSTRUCTION PROJECT SITE(S)',
    'Required':       'Y',
    'Notes':          'Full address of the job site',
  }),
  row(FORM_BR_DEC, {
    'Form Field':     'Description of Covered Property',
    'Field ID / Key': "[aria-label='Description of Covered Property'], [data-key='descriptionOfCoveredProperty']",
    'Field Type':     'textarea',
    'Expected Value': 'New residential building, wood frame construction',
    'Value Source':   'Static',
    'PDF Label':      'DESCRIPTION OF COVERED PROPERTY',
    'Required':       'Y',
    'Notes':          '',
  }),
  row(FORM_BR_DEC, {
    'Form Field':     'Limit of Insurance - Description',
    'Field ID / Key': "[aria-label='Limit of Insurance - Description'], [data-key='limitOfInsuranceDesc']",
    'Field Type':     'text',
    'Expected Value': 'Completed Value Form',
    'Value Source':   'Static',
    'PDF Label':      'LIMIT OF INSURANCE - DESCRIPTION',
    'Required':       'N',
    'Notes':          '',
  }),
  row(FORM_BR_DEC, {
    'Form Field':     'Limit',
    'Field ID / Key': "[aria-label='Limit'], [data-key='limit']",
    'Field Type':     'currency',
    'Expected Value': '2500000',
    'Value Source':   'Static',
    'PDF Label':      'LIMIT',
    'Required':       'Y',
    'Notes':          'Total insured value at completion',
  }),
  row(FORM_BR_DEC, {
    'Form Field':     'Limit of Location',
    'Field ID / Key': "[aria-label='Limit of Location'], [data-key='limitOfLocation']",
    'Field Type':     'currency',
    'Expected Value': '2500000',
    'Value Source':   'Static',
    'PDF Label':      'LIMIT OF LOCATION',
    'Required':       'N',
    'Notes':          '',
  }),
  row(FORM_BR_DEC, {
    'Form Field':     'Any One Occurrence - Transit',
    'Field ID / Key': "[aria-label='Any One Occurrence - Transit'], [data-key='anyOneOccurrenceTransit']",
    'Field Type':     'currency',
    'Expected Value': '100000',
    'Value Source':   'Static',
    'PDF Label':      'ANY ONE "OCCURRENCE" WITH RESPECT TO PROPERTY IN TRANSIT',
    'Required':       'N',
    'Notes':          '',
  }),
  row(FORM_BR_DEC, {
    'Form Field':     'Deductible Amount',
    'Field ID / Key': "[aria-label='Deductible Amount'], [data-key='deductibleAmount']",
    'Field Type':     'currency',
    'Expected Value': '10000',
    'Value Source':   'Static',
    'PDF Label':      'DEDUCTIBLE AMOUNT',
    'Required':       'Y',
    'Notes':          'All Other Perils deductible',
  }),
  row(FORM_BR_DEC, {
    'Form Field':     'Coinsurance',
    'Field ID / Key': "[aria-label='Coinsurance'], [data-key='coinsurance']",
    'Field Type':     'text',
    'Expected Value': '90%',
    'Value Source':   'Static',
    'PDF Label':      'COINSURANCE',
    'Required':       'N',
    'Notes':          'Enter as percentage e.g. "90%"',
  }),

  // ── TER 9015PHN 02 15 — Important Notice Regarding Terrorism Coverage (Mandatory)
  row(FORM_TER, {
    'Form Field':     'Named Insured',
    'Field ID / Key': "[aria-label='Named Insured'], [data-key='namedInsured']",
    'Field Type':     'text',
    'Expected Value': 'Automation Forms Insurance Ltd',
    'Value Source':   'Submission',
    'PDF Label':      'NAMED INSURED',
    'Required':       'Y',
    'Notes':          'Pre-populates from submission insured name',
  }),
  row(FORM_TER, {
    'Form Field':     'Policy Number',
    'Field ID / Key': "[aria-label='Policy Number'], [data-key='policyNumber']",
    'Field Type':     'text',
    'Expected Value': 'POL-2026-001',
    'Value Source':   'Static',
    'PDF Label':      'POLICY NO.',
    'Required':       'Y',
    'Notes':          '',
  }),
  row(FORM_TER, {
    'Form Field':     'Terrorism Coverage Selection',
    'Field ID / Key': "[aria-label='Terrorism Coverage'], [data-key='terrorismCoverage']",
    'Field Type':     'radio',
    'Expected Value': 'Accepted',
    'Value Source':   'Static',
    'PDF Label':      'TERRORISM COVERAGE (TRIA)',
    'Required':       'Y',
    'Notes':          'Options: Accepted | Rejected',
  }),

  // ── IM 8035 12 20 — Electronic Data Exclusion Endorsement (Mandatory) ─────────
  row(FORM_IM_ELEC, {
    'Form Field':     'Named Insured',
    'Field ID / Key': "[aria-label='Named Insured'], [data-key='namedInsured']",
    'Field Type':     'text',
    'Expected Value': 'Automation Forms Insurance Ltd',
    'Value Source':   'Submission',
    'PDF Label':      'NAMED INSURED',
    'Required':       'Y',
    'Notes':          '',
  }),
  row(FORM_IM_ELEC, {
    'Form Field':     'Policy Number',
    'Field ID / Key': "[aria-label='Policy Number'], [data-key='policyNumber']",
    'Field Type':     'text',
    'Expected Value': 'POL-2026-001',
    'Value Source':   'Static',
    'PDF Label':      'POLICY NO.',
    'Required':       'Y',
    'Notes':          '',
  }),

  // ── IM 8010 08 15 — Windstorm and Hail Deductible Endorsement (Optional) ──────
  row(FORM_IM_WIND, {
    'Form Field':     'Named Insured',
    'Field ID / Key': "[aria-label='Named Insured'], [data-key='namedInsured']",
    'Field Type':     'text',
    'Expected Value': 'Automation Forms Insurance Ltd',
    'Value Source':   'Submission',
    'PDF Label':      'NAMED INSURED',
    'Required':       'Y',
    'Notes':          '',
  }),
  row(FORM_IM_WIND, {
    'Form Field':     'Deductible %',
    'Field ID / Key': "[aria-label='Deductible %'], [data-key='windHailDeductiblePct']",
    'Field Type':     'number',
    'Expected Value': '2',
    'Value Source':   'Static',
    'PDF Label':      'WINDSTORM AND HAIL DEDUCTIBLE',
    'Required':       'Y',
    'Notes':          'Enter as integer e.g. "2" for 2% of insured value',
  }),
  row(FORM_IM_WIND, {
    'Form Field':     'Location Number',
    'Field ID / Key': "[aria-label='Location Number'], [data-key='locationNumber']",
    'Field Type':     'text',
    'Expected Value': '001',
    'Value Source':   'Static',
    'PDF Label':      'LOCATION NO.',
    'Required':       'N',
    'Notes':          'Location this endorsement applies to',
  }),
];

// ═════════════════════════════════════════════════════════════════════════════
// FormsFixtureBuilder
// ═════════════════════════════════════════════════════════════════════════════

export class FormsFixtureBuilder {

  /**
   * Generates the forms fixture Excel file.
   *
   * @param outputPath - Absolute path for the .xlsx file.
   *                     Default: src/data/fixtures/forms-fixture.xlsx
   */
  static async generate(
    outputPath: string = path.resolve(__dirname, 'forms-fixture.xlsx'),
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();

    workbook.creator  = 'FormsFixtureBuilder';
    workbook.created  = new Date();
    workbook.modified = new Date();

    // ── Sheet: Form Field Mapping ──────────────────────────────────────────
    const sheet = workbook.addWorksheet('Form Field Mapping');

    sheet.columns = COLUMNS.map(c => ({
      header: c.header,
      key:    c.header,
      width:  c.width,
    }));

    for (const dataRow of SAMPLE_ROWS) {
      sheet.addRow(dataRow);
    }

    // Style header row
    const headerRow        = sheet.getRow(1);
    headerRow.font         = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill         = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003366' } };
    headerRow.alignment    = { vertical: 'middle', wrapText: true };
    headerRow.height       = 24;
    sheet.views            = [{ state: 'frozen', ySplit: 1 }];

    // Colour-code Mandatory / Optional column per data row
    sheet.eachRow((r, rowNum) => {
      if (rowNum === 1) return;
      const cell = r.getCell('Mandatory / Optional');
      if (cell.value === 'Mandatory') {
        cell.font = { color: { argb: 'FFCC0000' }, bold: true };
      } else if (cell.value === 'Optional') {
        cell.font = { color: { argb: 'FF007700' } };
      }

      const req = r.getCell('Required');
      if (req.value === 'Y') {
        req.font = { color: { argb: 'FFCC0000' }, bold: true };
      }

      // Alternate row shading for readability
      if (rowNum % 2 === 0) {
        for (let col = 1; col <= COLUMNS.length; col++) {
          const c = r.getCell(col);
          if (!c.fill || (c.fill as ExcelJS.FillPattern).fgColor?.argb === 'FFFFFFFF') {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
          }
        }
      }
    });

    // ── Sheet: README ──────────────────────────────────────────────────────
    const readme = workbook.addWorksheet('README');
    readme.getColumn(1).width = 100;
    const lines = [
      'FORMS FIXTURE — Form Field Mapping Sheet',
      '',
      'HOW TO USE',
      '  1. Each row = one form field.  Form-level columns (A–I) repeat on every',
      '     field row that belongs to the same form.',
      '  2. Leave form-level columns identical for every row of the same form.',
      '  3. Leave "Form Field" (col J) blank on rows that describe the form itself.',
      '',
      'COLUMN GUIDE',
      '  A  Form Name            — Human-readable name, e.g. "Inland Marine Table of Contents"',
      '  B  Form ID              — Unique key; must match Form ID references in test code.',
      '                            FormsPage uses this ID to find the form in the UI.',
      '  C  Form Number          — Official number, e.g. "IM FGL TG 14"',
      '  D  Formset Name         — Exact radio-button label in the Forms tab',
      '  E  Product              — Matches Product dropdown in the app',
      '  F  Sub Segment          — Matches Sub-Segment dropdown in the app',
      "  G  Mandatory / Optional — Exactly 'Mandatory' or 'Optional'",
      '  H  Applicable State(s)  — "ALL" or comma-separated e.g. "NY,CA"',
      '  I  Template Version     — PDF template version; used for template vs generated comparison',
      '  J  Form Field           — Label as shown in the UI field',
      '  K  Field ID / Key       — Comma-separated selector hints for Playwright:',
      '                            CSS selector, aria-label, data-testid.',
      "                            e.g. \"[aria-label='Policy Number'], #policyNum\"",
      '  L  Field Type           — text | dropdown | radio | checkbox | date | currency | textarea | number',
      '  M  Expected Value       — Value to enter/select; for checkbox: "true" or "false"',
      '  N  Value Source         — Static | Derived | Submission | API:<fieldName>',
      '  O  PDF Label            — How the value appears in the generated PDF',
      '  P  Required             — "Y" or "N"',
      '  Q  Notes                — Remarks, PLACEHOLDER reminders, known issues',
      '',
      'SELECTOR HINTS (Field ID / Key)',
      '  Supply as many as you can observe in browser DevTools → Elements.',
      '  FormsPage.resolveFieldLocator() tries getByLabel(fieldName) first,',
      '  then each selector in Field ID / Key in order, then a text-heuristic fallback.',
      '  The more hints you supply, the more resilient the locator resolution is.',
    ];
    lines.forEach((text, i) => {
      const cell  = readme.getCell(`A${i + 1}`);
      cell.value  = text;
      if (i === 0) cell.font = { bold: true, size: 13 };
    });

    await workbook.xlsx.writeFile(outputPath);

    console.log(`[FormsFixtureBuilder] Generated: ${outputPath}`);
    console.log(`[FormsFixtureBuilder] Rows:  ${SAMPLE_ROWS.length} (${new Set(SAMPLE_ROWS.map(r => r['Form ID'])).size} forms)`);
    console.log('[FormsFixtureBuilder] Open the file and replace sample rows with your real form inventory.');
  }
}
