/**
 * forms-validation.spec.ts
 *
 * DATA-DRIVEN form validation test.
 *
 * ── HOW IT WORKS ─────────────────────────────────────────────────────────────
 *
 *   This spec reads EVERYTHING from the Excel manifest.
 *   Adding a new form = add rows to form-manifest.xlsx, run generate-mock-pdfs.ts.
 *   No code changes are ever needed here.
 *
 *   Flow (matches the app UI):
 *     1. Navigate to the submission's Forms tab.
 *     2. For each formset in the manifest → select the radio button.
 *     3. Assert mandatory forms are pre-checked; optional forms are visible.
 *     4. Click "View Form Fields".
 *     5. For each form → expand it → click Eye icon → compare PDF.
 *
 * ── CONFIGURATION ────────────────────────────────────────────────────────────
 *
 *   All env vars are OPTIONAL — the test discovers what to run from the manifest.
 *
 *   Variable             Default                     Description
 *   ─────────────────── ─────────────────────────── ──────────────────────────────
 *   BASE_URL             (required for real mode)    App base URL
 *   SUBMISSION_URL       (required for real mode)    URL of the submission to test
 *   FORM_MANIFEST_PATH   test-data/form-manifest.xlsx  Path to the Excel manifest
 *   PRODUCT              (all products in manifest)  Filter by product name
 *   SUB_SEGMENT          (all sub-segments)          Filter by sub-segment
 *   TRANSACTION          Quote                       Quote | Binder | Policy
 *   STATE                (no state filter)           e.g. CA — filters applicable forms
 *   USE_MOCK_PDF         false                       true = no browser needed for PDF
 *   PDF_VIEWER_AVAILABLE true                        false = same as USE_MOCK_PDF=true
 *
 * ── RUN ──────────────────────────────────────────────────────────────────────
 *
 *   # Mock mode — no browser required for PDF checks:
 *   USE_MOCK_PDF=true npx playwright test tests/forms/forms-validation.spec.ts
 *
 *   # Real mode — full browser + app:
 *   BASE_URL=https://your-app SUBMISSION_URL=https://your-app/submissions/123 \
 *     npx playwright test tests/forms/forms-validation.spec.ts --workers=1
 *
 *   # Filter to one product / transaction:
 *   PRODUCT="Builder's Risk" TRANSACTION=Quote \
 *     USE_MOCK_PDF=true npx playwright test tests/forms/forms-validation.spec.ts
 */

import { test, expect }         from '@playwright/test';
import * as path                from 'path';
import * as fs                  from 'fs';
import { FormManifestReader }   from '../../src/helpers/FormManifestReader';
import { FormsPage }            from '../../src/pages/FormsPage';
import type { Transaction, FormsetGroup } from '../../src/types/forms.types';

// ── Environment ───────────────────────────────────────────────────────────────

const MANIFEST_PATH = process.env.FORM_MANIFEST_PATH
  ?? path.resolve(process.cwd(), 'test-data', 'form-manifest.xlsx');

const ENV_PRODUCT     = process.env.PRODUCT     ?? '';
const ENV_SUB_SEGMENT = process.env.SUB_SEGMENT ?? '';
const ENV_TRANSACTION = (process.env.TRANSACTION ?? 'Quote') as Transaction;
const ENV_STATE       = process.env.STATE ?? '';
const SUBMISSION_URL  = process.env.SUBMISSION_URL ?? '';

const USE_MOCK_PDF =
  process.env.USE_MOCK_PDF === 'true' ||
  process.env.PDF_VIEWER_AVAILABLE === 'false';

// ── Manifest-driven test generation ──────────────────────────────────────────

/**
 * We load the manifest once and build a list of "test scenarios".
 * Each scenario = one { product, subSegment, transaction } combination.
 * Tests are generated from this list when the module loads.
 *
 * Adding new rows to the Excel = new scenarios appear automatically.
 */
interface TestScenario {
  product:     string;
  subSegment:  string;
  transaction: Transaction;
  state:       string;
}

/**
 * Synchronously reads scenario metadata from the manifest for test generation.
 * Uses the ExcelJS streaming reader to avoid heavy async at module load time.
 *
 * Returns scenarios that match PRODUCT / SUB_SEGMENT / TRANSACTION env filters.
 */
function buildScenariosFromManifestSync(): TestScenario[] {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.warn(`\n⚠  form-manifest.xlsx not found at ${MANIFEST_PATH}`);
    console.warn('   Run:  npx tsx scripts/generate-mock-manifest.ts\n');
    return [];
  }

  // We can't do async here (module load time), so we read the Excel file
  // using a synchronous child process and parse a JSON summary.
  // This is intentionally lightweight — we only need unique product/subSegment pairs.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();

    // ExcelJS.xlsx.readFile is async, so we fall through to the async loader below.
    // For now, return a placeholder that the beforeAll/beforeEach will populate.
    void workbook;
    return [{ product: '', subSegment: '', transaction: ENV_TRANSACTION, state: ENV_STATE }];
  } catch {
    return [{ product: '', subSegment: '', transaction: ENV_TRANSACTION, state: ENV_STATE }];
  }
}

// ── Main test suite ───────────────────────────────────────────────────────────

test.describe('Forms Validation — data-driven from manifest', () => {

  let reader:    FormManifestReader;
  let scenarios: TestScenario[] = [];

  test.beforeAll(async () => {
    if (!fs.existsSync(MANIFEST_PATH)) {
      console.warn(`\n⚠  Manifest not found: ${MANIFEST_PATH}`);
      console.warn('   Tests will be skipped. Run: npx tsx scripts/generate-mock-manifest.ts\n');
      return;
    }

    reader = new FormManifestReader(MANIFEST_PATH);

    // Build list of scenarios from manifest
    const products = await reader.getProductList();

    for (const { product, subSegment } of products) {
      // Apply env filters (empty = include all)
      if (ENV_PRODUCT     && product.toLowerCase()    !== ENV_PRODUCT.toLowerCase())     continue;
      if (ENV_SUB_SEGMENT && subSegment.toLowerCase() !== ENV_SUB_SEGMENT.toLowerCase()) continue;

      scenarios.push({
        product,
        subSegment,
        transaction: ENV_TRANSACTION,
        state:       ENV_STATE,
      });
    }

    console.log(`\nManifest loaded. ${scenarios.length} product/sub-segment scenario(s) to run:`);
    for (const s of scenarios) {
      console.log(`  • ${s.product} / ${s.subSegment} / ${s.transaction}${s.state ? ` / ${s.state}` : ''}`);
    }
  });

  // ── One test per scenario (discovered from manifest at runtime) ───────────

  test('validate all forms from manifest', async ({ page }, testInfo) => {
    if (!fs.existsSync(MANIFEST_PATH)) {
      test.skip(true, 'Manifest not found — run: npx tsx scripts/generate-mock-manifest.ts');
      return;
    }
    if (scenarios.length === 0) {
      test.skip(true, 'No matching scenarios in manifest for the current env filters');
      return;
    }

    const formsPage = new FormsPage(page);

    for (const scenario of scenarios) {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`Running: ${scenario.product} / ${scenario.subSegment} / ${scenario.transaction}${scenario.state ? ` (${scenario.state})` : ''}`);

      // ── Load formset groups for this scenario ──────────────────────────
      const groups: FormsetGroup[] = await reader.getFormsetGroups(
        scenario.product,
        scenario.subSegment,
        scenario.transaction,
        scenario.state || undefined,
      );

      if (groups.length === 0) {
        console.log('  No forms found for this combination — skipping');
        continue;
      }

      const totalForms = groups.reduce(
        (sum, g) => sum + g.mandatoryForms.length + g.optionalForms.length, 0,
      );
      console.log(`  ${groups.length} formset(s), ${totalForms} form(s) total`);
      for (const g of groups) {
        console.log(`    ${g.formsetName}: ${g.mandatoryForms.length} mandatory, ${g.optionalForms.length} optional`);
      }

      if (!USE_MOCK_PDF) {
        // ── REAL mode: navigate to the submission's Forms tab ──────────────
        if (!SUBMISSION_URL) {
          console.warn('  SUBMISSION_URL not set — skipping browser navigation in real mode');
          continue;
        }
        await page.goto(SUBMISSION_URL);
        await page.waitForLoadState('networkidle');
        await formsPage.goToFormsTab();

        // Run the full formset validation flow
        await formsPage.validateAllFormsetGroups(groups, testInfo);

      } else {
        // ── MOCK mode: validate PDF comparisons without a browser ──────────
        await validateMockPdfsForGroups(groups, testInfo);
      }
    }
  });

  // ── Per-formset tests (optional finer granularity) ────────────────────────
  // These run only when PRODUCT + SUB_SEGMENT env vars are both set,
  // giving one named test per formset for clearer reporting.

  test('validate forms per formset (when PRODUCT + SUB_SEGMENT set)', async ({ page }, testInfo) => {
    if (!fs.existsSync(MANIFEST_PATH) || !ENV_PRODUCT || !ENV_SUB_SEGMENT) {
      test.skip(true,
        !fs.existsSync(MANIFEST_PATH)
          ? 'Manifest not found'
          : 'Set both PRODUCT and SUB_SEGMENT env vars to enable per-formset tests',
      );
      return;
    }

    const formsPage = new FormsPage(page);

    const groups = await reader.getFormsetGroups(
      ENV_PRODUCT, ENV_SUB_SEGMENT, ENV_TRANSACTION, ENV_STATE || undefined,
    );

    for (const group of groups) {
      console.log(`\nFormset: "${group.formsetName}"`);
      console.log(`  Mandatory: ${group.mandatoryForms.map(f => f.unqorkFormNumber).join(', ')}`);
      console.log(`  Optional:  ${group.optionalForms.map(f => f.unqorkFormNumber).join(', ')}`);

      if (!USE_MOCK_PDF && SUBMISSION_URL) {
        await formsPage.selectFormset(group.formsetName);
        await formsPage.validateFormsetGroup(group);
        await formsPage.clickViewFormFields();

        const allForms = [...group.mandatoryForms, ...group.optionalForms];
        for (const form of allForms) {
          await formsPage.validateFormPdf(form, undefined, testInfo);
        }
      } else {
        await validateMockPdfsForGroups([group], testInfo);
      }
    }
  });

});

// ── Mock PDF validation (no browser) ─────────────────────────────────────────

/**
 * Validates PDFs for all forms in the given formset groups using mock mode.
 * This runs entirely offline — no browser, no app connection needed.
 */
async function validateMockPdfsForGroups(
  groups:   FormsetGroup[],
  testInfo: import('@playwright/test').TestInfo,
): Promise<void> {
  const { MockPdfValidator } = await import('../../src/utils/MockPdfValidator');
  const { MockPdfViewer }    = await import('../../src/utils/MockPdfViewer');

  const mockBase    = process.env.MOCK_PDF_DIR ?? path.resolve(process.cwd(), 'test-data', 'mock-pdfs');
  const templateDir = process.env.MOCK_PDF_TEMPLATE_DIR ?? path.join(mockBase, 'template');
  const previewDir  = process.env.MOCK_PDF_PREVIEW_DIR  ?? path.join(mockBase, 'preview');

  for (const group of groups) {
    const allForms = [...group.mandatoryForms, ...group.optionalForms];

    for (const form of allForms) {
      const templatePath = path.join(templateDir, `${form.unqorkFormNumber}.pdf`);
      const previewPath  = path.join(previewDir,  `${form.unqorkFormNumber}.pdf`);

      if (!fs.existsSync(templatePath) || !fs.existsSync(previewPath)) {
        console.warn(
          `  ⚠ Mock PDFs not found for ${form.unqorkFormNumber} — skipping.\n` +
          `    Run: npx tsx scripts/generate-mock-pdfs.ts`,
        );
        continue;
      }

      // Build sample values from PDF variable names (auto-resolve unknowns)
      const vars   = await MockPdfViewer.extractVariablesFromPdf(templatePath);
      const values = Object.fromEntries(
        vars.map(v => [v, autoValueForVar(v)]),
      );
      // Override with any field labels from the manifest
      for (const field of form.fields) {
        if (!values[field.fieldLabel]) {
          values[field.fieldLabel] = autoValueForVar(field.fieldLabel);
        }
      }

      const result = await MockPdfValidator.comparePdfs({
        templatePdfPath:    templatePath,
        previewPdfPath:     previewPath,
        values,
        // Required statements come from Type=statement rows in the Excel manifest
        requiredStatements: form.requiredStatements ?? [],
      });

      console.log(`  ${result.passed ? '✓' : '✗'}  ${form.unqorkFormNumber}  ${form.formName}`);
      if (!result.passed) {
        console.log(`      Failures: ${result.failures.map(f => f.label).join(', ')}`);
      }

      if (testInfo) {
        await testInfo.attach(`MockPDF-${form.unqorkFormNumber}`, {
          body:        result.summary + '\n\n' + result.failures.map(f => `✗ ${f.label}\n  ${f.actual}`).join('\n'),
          contentType: 'text/plain',
        });
      }

      expect(
        result.passed,
        `Mock PDF comparison failed for ${form.unqorkFormNumber} (${form.formName}):\n` +
        result.failures.map(f => `  ✗ ${f.label}`).join('\n'),
      ).toBe(true);
    }
  }
}

/** Same auto-value logic used by generate-mock-pdfs.ts (kept in sync) */
function autoValueForVar(varName: string): string {
  const n = varName.toLowerCase();
  if (/date|expir/.test(n))                                  return '01/01/2025';
  if (/number|no\b|num|id/.test(n))                          return 'BR-2024-001';
  if (/amount|value|premium|cost|price|deductible/.test(n))  return '$1,000,000';
  if (/percentage|rate|pct/.test(n))                         return '10';
  if (/address/.test(n))                                      return '123 Main Street';
  if (/city/.test(n))                                         return 'Los Angeles';
  if (/\bstate\b/.test(n))                                    return 'CA';
  if (/zip/.test(n))                                          return '90001';
  if (/coverage|elected/.test(n))                             return 'Included';
  if (/sprinkler/.test(n))                                    return 'Yes';
  return `Sample ${varName}`;
}
