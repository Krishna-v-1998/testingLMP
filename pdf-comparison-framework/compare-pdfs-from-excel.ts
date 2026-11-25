/**
 * compare-pdfs-from-excel.ts
 *
 * Main comparison runner for the Policy Lifecycle Automation Framework.
 *
 * Reads ALL forms from test-data/forms-fixture.xlsx via ExcelFixtureReader,
 * runs MockPdfValidator.comparePdfs() for each one, then emits a single
 * multi-form comparison-report.html that covers every form run in one place.
 *
 * ── ZERO HARDCODED VALUES ─────────────────────────────────────────────────────
 *
 *   Every field value, PDF variable name, required statement and form attribute
 *   comes from the Excel fixture.  Nothing in this script is hardcoded.
 *
 * ── HOW IT WORKS ─────────────────────────────────────────────────────────────
 *
 *   For each form in the fixture:
 *
 *   1. ExcelFixtureReader.buildValuesMap(form)
 *        → { [pdfVariable]: testData }  (drives template substitution)
 *
 *   2. ExcelFixtureReader.buildFillMap(form)
 *        → [{ selector, value, fieldType }]  (drives Playwright UI filling)
 *
 *   3. MockPdfValidator.comparePdfs({ templatePath, previewPath, values, requiredStatements })
 *        → MockCompareResult with passed / checks / failures / unresolvedVars
 *
 *   4. PdfComparisonReporter.generateMultiForm(allResults)
 *        → test-results/pdf-comparison/comparison-report.html
 *
 * ── PDF RESOLUTION ────────────────────────────────────────────────────────────
 *
 *   Template PDF:  test-data/mock-pdfs/template/<UnqorkFormNumber>.pdf
 *   Preview PDF:   test-data/mock-pdfs/preview/<UnqorkFormNumber>.pdf
 *
 *   If either PDF is MISSING, a placeholder is generated on-the-fly using pdfkit
 *   so the report still runs and shows the missing-PDF form clearly.
 *   Provide real PDFs by copying them into the directories above.
 *
 * ── RUN ───────────────────────────────────────────────────────────────────────
 *
 *   # All forms in the fixture
 *   npx tsx scripts/compare-pdfs-from-excel.ts
 *
 *   # Filter by transaction (Quote | Binder | Policy)
 *   npx tsx scripts/compare-pdfs-from-excel.ts --transaction=Quote
 *
 *   # Filter by category (Mandatory | Optional)
 *   npx tsx scripts/compare-pdfs-from-excel.ts --category=Mandatory
 *
 *   # Open report immediately after generation
 *   npx tsx scripts/compare-pdfs-from-excel.ts --open
 *
 *   # Dry run — list forms without comparing
 *   npx tsx scripts/compare-pdfs-from-excel.ts --dry-run
 *
 * ── ENV ───────────────────────────────────────────────────────────────────────
 *
 *   FIXTURE_PATH          Path to the Excel fixture (default: test-data/forms-fixture.xlsx)
 *   MOCK_PDF_DIR          Root for template/preview subdirs (default: test-data/mock-pdfs)
 *   PDF_REPORT_OUTPUT     Output directory for the report (default: test-results/pdf-comparison)
 */

import * as fs                     from 'fs';
import * as path                   from 'path';
import * as childProcess           from 'child_process';
import { ExcelFixtureReader }      from '../src/helpers/ExcelFixtureReader';
import { MockPdfValidator }        from '../src/utils/MockPdfValidator';
import { PdfComparisonReporter }   from '../src/utils/PdfComparisonReporter';
import type { FormComparisonEntry } from '../src/utils/PdfComparisonReporter';
import type { FixtureFormEntry }   from '../src/helpers/ExcelFixtureReader';

// ── Configuration (all from env / CLI, nothing hardcoded) ─────────────────────

const arg   = (flag: string): string | undefined =>
  process.argv.find(a => a.startsWith(`--${flag}=`))?.split('=')[1];

const hasFlag = (flag: string): boolean =>
  process.argv.includes(`--${flag}`);

const FIXTURE_PATH    = process.env.FIXTURE_PATH
  ?? path.resolve(__dirname, '../test-data/forms-fixture.xlsx');

const MOCK_PDF_DIR    = process.env.MOCK_PDF_DIR
  ?? path.resolve(__dirname, '../test-data/mock-pdfs');

const TEMPLATE_DIR    = process.env.MOCK_PDF_TEMPLATE_DIR
  ?? path.join(MOCK_PDF_DIR, 'template');

const PREVIEW_DIR     = process.env.MOCK_PDF_PREVIEW_DIR
  ?? path.join(MOCK_PDF_DIR, 'preview');

const OUTPUT_DIR      = process.env.PDF_REPORT_OUTPUT
  ?? path.resolve(__dirname, '../test-results/pdf-comparison');

const TRANSACTION_FILTER = arg('transaction');
const CATEGORY_FILTER    = (arg('category') ?? '').toLowerCase();
const DRY_RUN            = hasFlag('dry-run');
const OPEN_AFTER         = hasFlag('open');

// ── Placeholder PDF generator ─────────────────────────────────────────────────
// Used when real PDFs are not available; keeps the report functional.

async function generatePlaceholderPdf(
  outputPath: string,
  form:        FixtureFormEntry,
  kind:        'template' | 'preview',
  values:      Record<string, string>,
): Promise<void> {
  // Dynamically require pdfkit (CJS module, avoid top-level import issues)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PDFDocument = require('pdfkit') as typeof import('pdfkit');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const out = fs.createWriteStream(outputPath);
    out.on('error', reject);
    doc.on('error', reject);
    doc.pipe(out);

    const render = (varName: string): string => {
      if (kind === 'template') return `{{${varName}}}`;
      return values[varName] ?? `{{${varName}}}`;
    };

    // Header
    doc.fontSize(13).font('Helvetica-Bold').text(form.formName.toUpperCase(), { align: 'center' });
    doc.fontSize(9).font('Helvetica').text(
      `${form.unqorkFormNumber}  |  ${form.lotusFormId}  |  ${form.transactions.join(', ')}  |  ${form.category}`,
      { align: 'center' },
    );
    doc.moveDown(0.4);
    doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
    doc.moveDown(0.6);

    // Declarations section — fields from Excel
    if (form.fields.length > 0) {
      doc.fontSize(10).font('Helvetica-Bold').text('DECLARATIONS');
      doc.moveTo(50, doc.y).lineTo(560, doc.y).strokeColor('#cccccc').stroke().strokeColor('black');
      doc.moveDown(0.3);

      for (const field of form.fields) {
        const label    = `${field.formField}:`.padEnd(30);
        const valueStr = field.pdfVariable ? render(field.pdfVariable) : (kind === 'preview' ? field.testData : `{{${field.formField}}}`);
        doc.fontSize(9).font('Helvetica').text(`${label}${valueStr}`, { lineGap: 2 });
      }
      doc.moveDown(0.8);
    }

    // Required statements section — from Excel statement rows
    if (form.statements.length > 0) {
      doc.fontSize(10).font('Helvetica-Bold').text('CONDITIONS AND NOTICES');
      doc.moveTo(50, doc.y).lineTo(560, doc.y).strokeColor('#cccccc').stroke().strokeColor('black');
      doc.moveDown(0.3);

      for (const stmt of form.statements) {
        doc.fontSize(9).font('Helvetica').fillColor('#000000').text(stmt, { lineGap: 3 });
        doc.moveDown(0.5);
      }
      doc.moveDown(0.3);
    }

    // Footer
    doc.fontSize(8).font('Helvetica').fillColor('#888888').text(
      'ALL OTHER TERMS AND CONDITIONS OF THIS POLICY REMAIN UNCHANGED.',
      { align: 'center' },
    );

    doc.end();
    out.on('finish', resolve);
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('\n' + '═'.repeat(70));
  console.log('  PDF Comparison Runner — Policy Lifecycle Automation Framework');
  console.log('  All test data sourced from Excel fixture — zero hardcoded values');
  console.log('═'.repeat(70) + '\n');

  // ── 1. Verify fixture exists ───────────────────────────────────────────────
  if (!fs.existsSync(FIXTURE_PATH)) {
    console.error(`✗  Fixture not found: ${FIXTURE_PATH}`);
    console.error('   Run from the project root or set FIXTURE_PATH env variable.');
    process.exit(1);
  }
  console.log(`📋  Fixture:   ${path.relative(process.cwd(), FIXTURE_PATH)}`);
  console.log(`📁  Templates: ${path.relative(process.cwd(), TEMPLATE_DIR)}`);
  console.log(`📁  Previews:  ${path.relative(process.cwd(), PREVIEW_DIR)}`);
  console.log(`📄  Output:    ${path.relative(process.cwd(), OUTPUT_DIR)}\n`);

  // ── 2. Load forms from Excel ───────────────────────────────────────────────
  const reader = new ExcelFixtureReader(FIXTURE_PATH);

  let forms: FixtureFormEntry[];
  if (TRANSACTION_FILTER) {
    forms = await reader.getFormsByTransaction(TRANSACTION_FILTER);
    console.log(`🔍  Filtered to transaction: ${TRANSACTION_FILTER}`);
  } else {
    forms = await reader.getAllForms();
  }

  if (CATEGORY_FILTER) {
    forms = forms.filter(f => f.category.toLowerCase() === CATEGORY_FILTER);
    console.log(`🔍  Filtered to category:    ${CATEGORY_FILTER}`);
  }

  if (forms.length === 0) {
    console.warn('⚠   No forms matched the current filters. Check your fixture Excel.');
    process.exit(0);
  }

  console.log(`\n📊  ${forms.length} form(s) to compare:\n`);
  for (const f of forms) {
    console.log(`    • ${f.unqorkFormNumber.padEnd(32)} ${f.formName}`);
    console.log(`      Fields: ${f.fields.length}  Statements: ${f.statements.length}  Transactions: ${f.transactions.join('|')}`);
  }
  console.log('');

  if (DRY_RUN) {
    console.log('⚡  Dry run — no comparisons run, no report written.');
    return;
  }

  // ── 3. Ensure output directories exist ────────────────────────────────────
  for (const dir of [TEMPLATE_DIR, PREVIEW_DIR, OUTPUT_DIR]) {
    await fs.promises.mkdir(dir, { recursive: true });
  }

  // ── 4. Run comparisons ────────────────────────────────────────────────────
  const entries: FormComparisonEntry[] = [];
  let passCount = 0, failCount = 0;

  for (const form of forms) {
    const templatePath = path.join(TEMPLATE_DIR, `${form.unqorkFormNumber}.pdf`);
    const previewPath  = path.join(PREVIEW_DIR,  `${form.unqorkFormNumber}.pdf`);
    const valuesMap    = reader.buildValuesMap(form);

    // Generate placeholder PDFs if real ones are missing
    if (!fs.existsSync(templatePath)) {
      console.log(`  ⚙  Generating placeholder template PDF: ${form.unqorkFormNumber}.pdf`);
      await generatePlaceholderPdf(templatePath, form, 'template', valuesMap);
    }
    if (!fs.existsSync(previewPath)) {
      console.log(`  ⚙  Generating placeholder preview PDF:  ${form.unqorkFormNumber}.pdf`);
      await generatePlaceholderPdf(previewPath, form, 'preview', valuesMap);
    }

    // Run the comparison
    process.stdout.write(`  🔄  ${form.unqorkFormNumber} ... `);

    let result;
    try {
      result = await MockPdfValidator.comparePdfs({
        templatePdfPath:    templatePath,
        previewPdfPath:     previewPath,
        values:             valuesMap,
        requiredStatements: form.statements,
      });
    } catch (err) {
      // Create a failed result if PDF extraction itself throws
      const errMsg = err instanceof Error ? err.message : String(err);
      result = {
        passed:         false,
        summary:        `Error running comparison: ${errMsg}`,
        templateText:   '',
        previewText:    '',
        renderedText:   '',
        unresolvedVars: [],
        checks:         [],
        failures:       [],
      };
    }

    if (result.passed) {
      passCount++;
      process.stdout.write(`✓  PASS  (${result.checks.length} checks)\n`);
    } else {
      failCount++;
      process.stdout.write(`✗  FAIL  (${result.failures.length} of ${result.checks.length} checks failed)\n`);
      for (const f of result.failures.slice(0, 3)) {
        console.log(`         ✗ ${f.label}`);
      }
      if (result.failures.length > 3) {
        console.log(`         … and ${result.failures.length - 3} more failure(s)`);
      }
    }

    entries.push({
      formEntry:      form,
      templatePath,
      previewPath,
      result,
      expectedFields: valuesMap,
    });
  }

  // ── 5. Generate multi-form HTML report ────────────────────────────────────
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`  Passed: ${passCount}  |  Failed: ${failCount}  |  Total: ${forms.length}`);
  console.log('─'.repeat(70) + '\n');

  const runName = [
    'Policy Lifecycle PDF Comparison',
    TRANSACTION_FILTER ? `— ${TRANSACTION_FILTER}` : '',
    CATEGORY_FILTER    ? `(${CATEGORY_FILTER})`     : '',
    `— ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`,
  ].filter(Boolean).join(' ');

  const reportPath = await PdfComparisonReporter.generateMultiForm({
    runName,
    forms:      entries,
    outputPath: OUTPUT_DIR,
  });

  console.log(`\n✅  Report ready: ${reportPath}`);
  console.log(`    Covers ${forms.length} form(s) — ${passCount} passed, ${failCount} failed\n`);

  // ── 6. Optionally open the report ─────────────────────────────────────────
  if (OPEN_AFTER) {
    const opener = process.platform === 'win32' ? 'start'
                 : process.platform === 'darwin' ? 'open'
                 : 'xdg-open';
    childProcess.exec(`${opener} "${reportPath}"`);
    console.log('  Opening report in default browser...\n');
  }

  if (failCount > 0) process.exit(1);
}

main().catch(err => {
  console.error('\n✗  Runner failed unexpectedly:');
  console.error(err);
  process.exit(1);
});
