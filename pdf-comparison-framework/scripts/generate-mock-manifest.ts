/**
 * generate-mock-manifest.ts
 *
 * Creates test-data/form-manifest.xlsx with the correct 15-column schema
 * and two sample rows so your team can see the exact format expected.
 *
 * Run ONCE to bootstrap the manifest, then fill it in with real forms:
 *
 *   npx tsx scripts/generate-mock-manifest.ts
 *
 * ── COLUMN GUIDE ─────────────────────────────────────────────────────────────
 *
 *  Column              Description                             Example
 *  ──────────────────  ──────────────────────────────────────  ───────────────────────────
 *  Product             Product line name                       Builder's Risk
 *  Sub Segment         Sub-segment within the product          Standard
 *  Formset             Radio-button group name in the UI       FS-Alpha
 *  Transaction         Pipe-separated: Quote|Binder|Policy     Quote|Binder
 *  Lotus Notes Form Number  Client form reference number       LN-001
 *  Unqork Form Number  Unqork internal form ID (PDF filename)  UQ-001
 *  Form Name           Display name shown in the UI            Builder's Risk Coverage
 *  Lotus Notes Form ID The ID label shown next to the form     LN-001
 *  Form Order          Sort order within the formset           1
 *  Category            Mandatory or Optional                   Mandatory
 *  States Applicable   Pipe-separated state codes, or ALL      CA|NY|TX
 *  Fields              Field label as shown in the UI          Named Insured
 *  Field ID            CSS selector for the field              #namedInsured
 *  Type                Textfield|Dropdown|Checkbox|Date|Radio  Textfield
 *  Mapping             Source path if auto-populated           submission.policyNumber
 *
 * ── ADDING NEW FORMS ─────────────────────────────────────────────────────────
 *
 *  For each new form, add one row PER FIELD.  Repeat the form-level columns
 *  (Product through States Applicable) on every row for that form — they will
 *  be de-duplicated automatically when the reader groups rows by Unqork Form Number.
 *
 *  Example — a form with 3 fields uses 3 rows, all with the same form columns:
 *
 *  Product | Sub Segment | Formset | ...  | Unqork Form Number | Fields         | Field ID        | Type
 *  ───────────────────────────────────────────────────────────────────────────────────────────────────────
 *  Bldr Risk | Standard  | FS-Alpha| ...  | UQ-100             | Named Insured  | #namedInsured   | Textfield
 *  Bldr Risk | Standard  | FS-Alpha| ...  | UQ-100             | Policy Number  | #policyNum      | Textfield
 *  Bldr Risk | Standard  | FS-Alpha| ...  | UQ-100             | Effective Date | #effectiveDate  | Date
 *
 * ── AFTER ADDING ROWS ────────────────────────────────────────────────────────
 *
 *  1. Run:  npx tsx scripts/generate-mock-pdfs.ts
 *     → Generates template + preview PDFs for every form automatically.
 *
 *  2. Run:  npx playwright test tests/forms/forms-validation.spec.ts
 *     → Picks up all new forms with zero code changes.
 *
 * ── DEPENDENCY ───────────────────────────────────────────────────────────────
 *
 *   npm install --save-dev exceljs
 */

import * as fs   from 'fs';
import * as path from 'path';
import ExcelJS   from 'exceljs';

const OUTPUT_PATH = path.resolve(__dirname, '../test-data/form-manifest.xlsx');

// ── Column definitions ────────────────────────────────────────────────────────

const HEADERS = [
  'Product',
  'Sub Segment',
  'Formset',
  'Transaction',
  'Lotus Notes Form Number',
  'Unqork Form Number',
  'Form Name',
  'Lotus Notes Form ID',
  'Form Order',
  'Category',
  'States Applicable',
  'Fields',
  'Field ID',
  'Type',
  'Mapping',
] as const;

// ── Sample rows (3 forms, with fields AND required statement rows) ────────────
//
//  HOW REQUIRED STATEMENTS WORK:
//  ─────────────────────────────
//  Set Type = 'statement' on a row, and put the full static text in the
//  Fields column.  Leave Field ID and Mapping empty.
//
//  The reader routes these rows into FormEntry.requiredStatements[] instead
//  of fields[].  The PDF generator embeds the text verbatim in the PDF.
//  The validator checks that every statement appears in the preview PDF.
//
//  Example use-cases:
//    • Regulatory disclosures that must appear word-for-word
//    • Coverage agreement paragraphs
//    • TRIA election notices
//
// Replace or extend these rows with your real forms.

type Row = Record<typeof HEADERS[number], string | number>;

/** Shorthand: returns the 11 form-level columns (same for every row of one form) */
function formBase(opts: {
  product:    string; subSegment: string; formset:  string; transaction: string;
  lnNum:      string; uqNum:      string; formName: string; lnId:        string;
  formOrder:  number; category:   string; states:   string;
}): Omit<Row, 'Fields' | 'Field ID' | 'Type' | 'Mapping'> {
  return {
    'Product':                  opts.product,
    'Sub Segment':              opts.subSegment,
    'Formset':                  opts.formset,
    'Transaction':              opts.transaction,
    'Lotus Notes Form Number':  opts.lnNum,
    'Unqork Form Number':       opts.uqNum,
    'Form Name':                opts.formName,
    'Lotus Notes Form ID':      opts.lnId,
    'Form Order':               opts.formOrder,
    'Category':                 opts.category,
    'States Applicable':        opts.states,
  };
}

const BR_COVERAGE = formBase({
  product: "Builder's Risk", subSegment: 'Standard', formset: 'FS-Alpha',
  transaction: 'Quote|Binder|Policy',
  lnNum: 'LN-BR-001', uqNum: 'UQ-BR-001', formName: "Builder's Risk Coverage",
  lnId: 'LN-BR-001', formOrder: 1, category: 'Mandatory', states: 'CA|NY|TX',
});

const TERRORISM = formBase({
  product: "Builder's Risk", subSegment: 'Standard', formset: 'FS-Alpha',
  transaction: 'Quote|Binder',
  lnNum: 'LN-TER-001', uqNum: 'UQ-TER-001',
  formName: 'Terrorism Risk Insurance Act Endorsement',
  lnId: 'LN-TER-001', formOrder: 2, category: 'Optional', states: 'ALL',
});

const SPRINKLER = formBase({
  product: "Builder's Risk", subSegment: 'Standard', formset: 'FS-Alpha',
  transaction: 'Quote',
  lnNum: 'LN-SPR-002', uqNum: 'UQ-SPR-002', formName: 'Sprinkler Leakage Endorsement',
  lnId: 'LN-SPR-002', formOrder: 3, category: 'Optional', states: 'CA|FL|TX',
});

const SAMPLE_ROWS: Row[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // FORM 1: Builder's Risk Coverage  (Mandatory | Quote+Binder+Policy | CA|NY|TX)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── UI fields ──────────────────────────────────────────────────────────────
  { ...BR_COVERAGE, 'Fields': 'Named Insured',  'Field ID': '#namedInsured',  'Type': 'Textfield', 'Mapping': '' },
  { ...BR_COVERAGE, 'Fields': 'Policy Number',  'Field ID': '#policyNumber',  'Type': 'Textfield', 'Mapping': 'submission.policyNumber' },
  { ...BR_COVERAGE, 'Fields': 'Effective Date', 'Field ID': '#effectiveDate', 'Type': 'Date',      'Mapping': '' },
  { ...BR_COVERAGE, 'Fields': 'Expiration Date','Field ID': '#expirationDate','Type': 'Date',      'Mapping': '' },
  { ...BR_COVERAGE, 'Fields': 'Total Insured Value', 'Field ID': '#totalInsuredValue', 'Type': 'Textfield', 'Mapping': '' },
  { ...BR_COVERAGE, 'Fields': 'Deductible',     'Field ID': '#deductible',    'Type': 'Dropdown',  'Mapping': '' },

  // ── Required statements (Type = statement) ─────────────────────────────────
  // These phrases must appear verbatim in the preview PDF.
  // The PDF generator embeds them as paragraph text; the validator checks them.
  {
    ...BR_COVERAGE,
    'Fields':   "In consideration of the premium charged, it is hereby agreed that this policy covers the property described herein against direct physical loss or damage.",
    'Field ID': '',
    'Type':     'statement',
    'Mapping':  '',
  },
  {
    ...BR_COVERAGE,
    'Fields':   "This form is subject to all terms and conditions of the Policy to which it is attached, except as modified herein.",
    'Field ID': '',
    'Type':     'statement',
    'Mapping':  '',
  },
  {
    ...BR_COVERAGE,
    'Fields':   "Coverage applies only during the policy period shown above and only while the Named Insured has an insurable interest in the covered property.",
    'Field ID': '',
    'Type':     'statement',
    'Mapping':  '',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FORM 2: Terrorism Risk Insurance Act Endorsement  (Optional | Quote+Binder | ALL)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── UI fields ──────────────────────────────────────────────────────────────
  { ...TERRORISM, 'Fields': 'Terrorism Coverage',  'Field ID': '#terrorismCoverage',  'Type': 'Dropdown',  'Mapping': '' },
  { ...TERRORISM, 'Fields': 'Terrorism Premium',   'Field ID': '#terrorismPremium',   'Type': 'Textfield', 'Mapping': 'quote.terrorismPremium' },
  { ...TERRORISM, 'Fields': 'TRIA Election',        'Field ID': '#triaElection',        'Type': 'Radio',     'Mapping': '' },

  // ── Required statements ────────────────────────────────────────────────────
  {
    ...TERRORISM,
    'Fields':   "Pursuant to the Terrorism Risk Insurance Act, as amended, you are hereby notified that under your policy, any losses caused by certified acts of terrorism may be partially reimbursed by the United States Government.",
    'Field ID': '',
    'Type':     'statement',
    'Mapping':  '',
  },
  {
    ...TERRORISM,
    'Fields':   "The portion of your annual premium that is attributable to coverage for acts of terrorism is shown above.",
    'Field ID': '',
    'Type':     'statement',
    'Mapping':  '',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FORM 3: Sprinkler Leakage Endorsement  (Optional | Quote | CA|FL|TX)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── UI fields ──────────────────────────────────────────────────────────────
  { ...SPRINKLER, 'Fields': 'Sprinkler System Type', 'Field ID': '#sprinklerType',    'Type': 'Dropdown',  'Mapping': '' },
  { ...SPRINKLER, 'Fields': 'Year Installed',         'Field ID': '#yearInstalled',    'Type': 'Textfield', 'Mapping': '' },
  { ...SPRINKLER, 'Fields': 'Last Inspection Date',   'Field ID': '#lastInspection',   'Type': 'Date',      'Mapping': '' },
  { ...SPRINKLER, 'Fields': 'Leakage Deductible',     'Field ID': '#leakageDeductible','Type': 'Dropdown',  'Mapping': '' },

  // ── Required statements ────────────────────────────────────────────────────
  {
    ...SPRINKLER,
    'Fields':   "This endorsement modifies insurance provided under the Builders Risk Coverage Form and covers accidental discharge or leakage of water or other substance from within an automatic sprinkler system.",
    'Field ID': '',
    'Type':     'statement',
    'Mapping':  '',
  },
  {
    ...SPRINKLER,
    'Fields':   "Coverage is excluded for loss or damage caused by freezing unless the building is heated or the Named Insured has taken reasonable precautions to maintain heat.",
    'Field ID': '',
    'Type':     'statement',
    'Mapping':  '',
  },

];

// ── Builder ────────────────────────────────────────────────────────────────────

async function generate(): Promise<void> {
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const workbook  = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Forms');

  // ── Header row (bold, frozen, light blue background) ─────────────────────
  const headerRow = worksheet.addRow(HEADERS as unknown as string[]);
  headerRow.font      = { bold: true };
  headerRow.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
  headerRow.alignment = { vertical: 'middle' };
  headerRow.height    = 20;

  // ── Auto-filter and freeze first row ─────────────────────────────────────
  worksheet.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + HEADERS.length)}1` };
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  // ── Set column widths ─────────────────────────────────────────────────────
  const widths: Record<string, number> = {
    'Product': 22, 'Sub Segment': 18, 'Formset': 14, 'Transaction': 20,
    'Lotus Notes Form Number': 26, 'Unqork Form Number': 22, 'Form Name': 36,
    'Lotus Notes Form ID': 22, 'Form Order': 14, 'Category': 14,
    'States Applicable': 20, 'Fields': 28, 'Field ID': 24, 'Type': 14, 'Mapping': 36,
  };
  HEADERS.forEach((header, i) => {
    worksheet.getColumn(i + 1).width = widths[header] ?? 18;
  });

  // ── Data rows ─────────────────────────────────────────────────────────────
  for (const row of SAMPLE_ROWS) {
    const dataRow = worksheet.addRow(HEADERS.map(h => row[h]));
    dataRow.alignment = { vertical: 'middle' };

    // Colour-code Category column (column index 10)
    const catIdx  = HEADERS.indexOf('Category') + 1;
    const catCell = dataRow.getCell(catIdx);
    if (String(catCell.value) === 'Mandatory') {
      catCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } }; // light red
    } else {
      catCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } }; // light green
    }
  }

  // ── Notes row ─────────────────────────────────────────────────────────────
  worksheet.addRow([]); // blank separator
  const noteRow = worksheet.addRow([
    '← Add new forms below this line. Repeat form-level columns on every row (one row per field).',
  ]);
  noteRow.font = { italic: true, color: { argb: 'FF888888' } };

  await workbook.xlsx.writeFile(OUTPUT_PATH);

  console.log('═'.repeat(60));
  console.log('  Manifest created:');
  console.log(`  ${OUTPUT_PATH}`);
  console.log('═'.repeat(60));
  console.log('');
  console.log('  Sheet:  "Forms"');
  console.log(`  Columns (${HEADERS.length}):  ${HEADERS.join(' | ')}`);
  const formCount = new Set(SAMPLE_ROWS.map(r => String(r['Unqork Form Number']))).size;
  const stmtCount = SAMPLE_ROWS.filter(r => r['Type'] === 'statement').length;
  console.log(`  Sample rows: ${SAMPLE_ROWS.length} (${formCount} forms, ${stmtCount} required-statement rows)`);
  console.log('');
  console.log('  Next steps:');
  console.log('  1. Open test-data/form-manifest.xlsx and add your real form rows.');
  console.log('  2. Run:  npx tsx scripts/generate-mock-pdfs.ts');
  console.log('  3. Run:  npx playwright test tests/forms/forms-validation.spec.ts');
  console.log('');
}

generate().catch(err => { console.error(err); process.exit(1); });
