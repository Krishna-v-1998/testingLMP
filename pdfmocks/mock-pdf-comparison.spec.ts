/**
 * mock-pdf-comparison.spec.ts
 *
 * Validates the two-PDF comparison pipeline WITHOUT a real browser or PDF viewer.
 *
 * ── THE TWO PDFs ──────────────────────────────────────────────────────────────
 *
 *   Client Template PDF                       Preview PDF
 *   test-data/mock-pdfs/template/<N>.pdf       test-data/mock-pdfs/preview/<N>.pdf
 *   ─────────────────────────────────          ─────────────────────────────────
 *   "Issued to {{Named Insured}}"        →     "Issued to Acme Construction LLC"
 *   "Policy Number: {{Policy Number}}"         "Policy Number: BR-2025-001234"
 *
 *   MockPdfViewer.renderFromPdf()  extracts + renders the template PDF.
 *   MockPdfValidator.comparePdfs() checks the preview PDF contains the values.
 *
 * ── GENERATING THE PDFs ───────────────────────────────────────────────────────
 *
 *   npx tsx scripts/generate-mock-pdfs.ts
 *   # Creates test-data/mock-pdfs/template/*.pdf and preview/*.pdf
 *
 * ── RUNNING ───────────────────────────────────────────────────────────────────
 *
 *   npx playwright test tests/mock/mock-pdf-comparison.spec.ts
 *   npx playwright test tests/mock/mock-pdf-comparison.spec.ts -g "BR-001"
 *
 * ── PREREQUISITES ─────────────────────────────────────────────────────────────
 *
 *   Run the generator script above first.  PDFs must exist at:
 *     test-data/mock-pdfs/template/BR-001.pdf
 *     test-data/mock-pdfs/template/BR-END-TER-001.pdf
 *     test-data/mock-pdfs/template/BR-END-SPR-002.pdf
 *     test-data/mock-pdfs/preview/BR-001.pdf
 *     test-data/mock-pdfs/preview/BR-END-TER-001.pdf
 *     test-data/mock-pdfs/preview/BR-END-SPR-002.pdf
 */

import path from 'path';
import { test, expect } from '@playwright/test';
import { MockPdfViewer }    from '../../src/utils/MockPdfViewer';
import { MockPdfValidator } from '../../src/utils/MockPdfValidator';
import { BR_SAMPLE_VALUES, BR_MINIMAL_VALUES } from '../../test-data/mock-pdf-values';

// ── Helpers ───────────────────────────────────────────────────────────────────

function tpl(filename: string): string {
  return path.resolve(process.cwd(), 'test-data', 'mock-pdfs', 'template', filename);
}

function prev(filename: string): string {
  return path.resolve(process.cwd(), 'test-data', 'mock-pdfs', 'preview', filename);
}

// ═════════════════════════════════════════════════════════════════════════════
// SUITE 1: MockPdfViewer — PDF text extraction & template rendering
// ═════════════════════════════════════════════════════════════════════════════

test.describe('MockPdfViewer — PDF extraction & rendering', () => {

  test('extracts all variable names from BR-001 template PDF', async () => {
    const vars = await MockPdfViewer.extractVariablesFromPdf(tpl('BR-001.pdf'));

    // Core variables that must be present in the main BR form
    expect(vars).toContain('Named Insured');
    expect(vars).toContain('Policy Number');
    expect(vars).toContain('Effective Date');
    expect(vars).toContain('Expiration Date');
    expect(vars).toContain('Total Insured Value');
    expect(vars).toContain('Deductible');
    expect(vars).toContain('Terrorism Coverage');

    console.log('[MockPdfViewer] BR-001 variables:', vars);
  });

  test('renders BR-001 template PDF with all sample values — no unresolved variables', async () => {
    const result = await MockPdfViewer.renderFromPdf(tpl('BR-001.pdf'), BR_SAMPLE_VALUES);

    expect(result.unresolved, 'All variables should resolve').toHaveLength(0);

    // Spot-check: values appear in rendered text
    expect(result.renderedText).toContain('Acme Construction LLC');
    expect(result.renderedText).toContain('BR-2025-001234');
    expect(result.renderedText).toContain('01/01/2025');
    expect(result.renderedText).toContain('1,500,000');
    expect(result.renderedText).toContain('5,000');

    // Spot-check: NO raw {{...}} placeholders remain
    expect(result.renderedText).not.toMatch(/\{\{.+?\}\}/);
  });

  test('renders BR-END-TER-001 template PDF — terrorism endorsement values present', async () => {
    const result = await MockPdfViewer.renderFromPdf(tpl('BR-END-TER-001.pdf'), BR_SAMPLE_VALUES);

    expect(result.unresolved).toHaveLength(0);
    expect(result.renderedText).toContain('Acme Construction LLC');
    expect(result.renderedText).toContain('BR-2025-001234');
    expect(result.renderedText).toContain('include');   // Terrorism Coverage
    expect(result.renderedText).toContain('1%');         // TRIA Percentage rendered
    expect(result.renderedText).not.toMatch(/\{\{.+?\}\}/);
  });

  test('renders BR-END-SPR-002 template PDF — sprinkler endorsement values present', async () => {
    const result = await MockPdfViewer.renderFromPdf(tpl('BR-END-SPR-002.pdf'), BR_SAMPLE_VALUES);

    expect(result.unresolved).toHaveLength(0);
    expect(result.renderedText).toContain('Yes');              // Sprinklered
    expect(result.renderedText).toContain('123 Test Street');
    expect(result.renderedText).not.toMatch(/\{\{.+?\}\}/);
  });

  test('reports unresolved variables when values are incomplete', async () => {
    // Use only minimal values — many variables should remain unresolved
    const result = await MockPdfViewer.renderFromPdf(tpl('BR-001.pdf'), BR_MINIMAL_VALUES);

    expect(result.unresolved.length).toBeGreaterThan(0);
    // Raw placeholders should still be visible in the output
    expect(result.renderedText).toMatch(/\{\{.+?\}\}/);
    console.log('[MockPdfViewer] Unresolved vars with minimal values:', result.unresolved);
  });

  test('renderText: variable matching is case-insensitive', () => {
    // renderText is a sync helper that works on strings — no PDF needed
    const template = 'Policy for {{named insured}} number {{POLICY NUMBER}}';
    const values   = { 'Named Insured': 'Acme Corp', 'Policy Number': 'BR-001' };
    const result   = MockPdfViewer.renderText(template, values);

    expect(result.renderedText).toBe('Policy for Acme Corp number BR-001');
    expect(result.unresolved).toHaveLength(0);
  });

  test('renderText: same variable used multiple times is replaced everywhere', () => {
    const template = '{{Named Insured}} agrees. Signed by {{Named Insured}}.';
    const values   = { 'Named Insured': 'Acme Corp' };
    const result   = MockPdfViewer.renderText(template, values);

    expect(result.renderedText).toBe('Acme Corp agrees. Signed by Acme Corp.');
  });

  test('extractText reads preview PDF — contains substituted values', async () => {
    // The preview PDF was generated with BR_SAMPLE_VALUES substituted in
    const text = await MockPdfViewer.extractText(prev('BR-001.pdf'));
    expect(text).toContain('Acme Construction LLC');
    expect(text).toContain('BR-2025-001234');
    expect(text).not.toMatch(/\{\{.+?\}\}/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SUITE 2: MockPdfValidator — template PDF vs preview PDF comparison
// ═════════════════════════════════════════════════════════════════════════════

test.describe('MockPdfValidator — template PDF vs preview PDF comparison', () => {

  test('BR-001: full comparison passes with all sample values', async () => {
    const result = await MockPdfValidator.comparePdfs({
      templatePdfPath: tpl('BR-001.pdf'),
      previewPdfPath:  prev('BR-001.pdf'),
      values:          BR_SAMPLE_VALUES,
      requiredStatements: [
        'direct physical loss or damage to covered property',
        'Terrorism Risk Insurance Act',
        'ALL OTHER TERMS AND CONDITIONS OF THIS POLICY REMAIN UNCHANGED',
      ],
    });

    MockPdfValidator.printReport(result);

    expect(result.passed, result.summary).toBe(true);
    expect(result.unresolvedVars).toHaveLength(0);
    expect(result.failures).toHaveLength(0);
  });

  test('BR-END-TER-001: terrorism endorsement comparison passes', async () => {
    const result = await MockPdfValidator.comparePdfs({
      templatePdfPath: tpl('BR-END-TER-001.pdf'),
      previewPdfPath:  prev('BR-END-TER-001.pdf'),
      values:          BR_SAMPLE_VALUES,
      requiredStatements: [
        'Terrorism Risk Insurance Act',
        'Secretary of the Treasury',
        'ALL OTHER TERMS AND CONDITIONS OF THIS POLICY REMAIN UNCHANGED',
      ],
    });

    expect(result.passed, result.summary).toBe(true);
  });

  test('BR-END-SPR-002: sprinkler endorsement comparison passes', async () => {
    const result = await MockPdfValidator.comparePdfs({
      templatePdfPath: tpl('BR-END-SPR-002.pdf'),
      previewPdfPath:  prev('BR-END-SPR-002.pdf'),
      values:          BR_SAMPLE_VALUES,
      requiredStatements: [
        'direct physical loss or damage to covered property',
        'ALL OTHER TERMS AND CONDITIONS OF THIS POLICY REMAIN UNCHANGED',
      ],
    });

    expect(result.passed, result.summary).toBe(true);
  });

  // ── Failure scenarios ─────────────────────────────────────────────────────

  test('FAIL: comparePdfs detects value not matching preview PDF content', async () => {
    // The preview PDF was generated with BR_SAMPLE_VALUES (Named Insured = "Acme Construction LLC").
    // If we supply a DIFFERENT Named Insured, that value should NOT be found in the preview PDF.
    const wrongValues = {
      ...BR_SAMPLE_VALUES,
      'Named Insured': 'Wrong Company Name Inc',  // different from what's in the preview PDF
    };

    const result = await MockPdfValidator.comparePdfs({
      templatePdfPath: tpl('BR-001.pdf'),
      previewPdfPath:  prev('BR-001.pdf'),
      values:          wrongValues,
    });

    // Should fail: "Wrong Company Name Inc" won't appear in the preview PDF
    expect(result.passed).toBe(false);
    expect(result.failures.some(f => f.label.includes('Named Insured'))).toBe(true);
    console.log('[MockPdfValidator] Expected failure:', result.failures[0]?.label);
  });

  test('FAIL: comparePdfs reports unresolved variable when value is missing', async () => {
    const incompleteValues = { ...BR_SAMPLE_VALUES };
    delete (incompleteValues as Record<string, string>)['Deductible'];

    const result = await MockPdfValidator.comparePdfs({
      templatePdfPath: tpl('BR-001.pdf'),
      previewPdfPath:  prev('BR-001.pdf'),
      values:          incompleteValues,
    });

    // Template PDF has {{Deductible}} but no value was supplied
    expect(result.passed).toBe(false);
    expect(result.unresolvedVars).toContain('Deductible');
    console.log('[MockPdfValidator] Unresolved:', result.unresolvedVars);
  });

  test('FAIL: comparePdfs detects missing required statement', async () => {
    const result = await MockPdfValidator.comparePdfs({
      templatePdfPath:    tpl('BR-001.pdf'),
      previewPdfPath:     prev('BR-001.pdf'),
      values:             BR_SAMPLE_VALUES,
      requiredStatements: ['THIS STATEMENT DOES NOT EXIST IN ANY TEMPLATE'],
    });

    expect(result.passed).toBe(false);
    expect(result.failures[0]?.checkType).toBe('statement_in_preview');
  });

  test('FAIL: comparePdfsOrThrow throws on failure with readable message', async () => {
    await expect(
      MockPdfValidator.comparePdfsOrThrow({
        templatePdfPath:    tpl('BR-001.pdf'),
        previewPdfPath:     prev('BR-001.pdf'),
        values:             BR_MINIMAL_VALUES,       // many vars missing
        requiredStatements: ['NONEXISTENT STATEMENT'],
      }),
    ).rejects.toThrow(/Mock PDF comparison FAILED/);
  });

  test('case-insensitive comparison option is honoured', async () => {
    // requiredStatements check with caseInsensitive:true should pass for
    // a statement that only differs by case in the preview PDF
    const result = await MockPdfValidator.comparePdfs({
      templatePdfPath:    tpl('BR-001.pdf'),
      previewPdfPath:     prev('BR-001.pdf'),
      values:             BR_SAMPLE_VALUES,
      requiredStatements: ['ALL OTHER TERMS AND CONDITIONS OF THIS POLICY REMAIN UNCHANGED'],
      caseInsensitive:    true,
    });

    // Statement IS present — comparison should pass (along with all value checks)
    const statementChecks = result.checks.filter(c => c.checkType === 'statement_in_preview');
    expect(statementChecks.every(c => c.found)).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SUITE 3: Pre-flight — PDF inventory
// ═════════════════════════════════════════════════════════════════════════════

test.describe('Pre-flight — PDF inventory', () => {

  test('all expected template PDFs exist', () => {
    const templateDir = path.resolve(process.cwd(), 'test-data', 'mock-pdfs', 'template');
    const files = MockPdfViewer.listPdfs(templateDir);
    const names  = files.map(f => path.basename(f));

    expect(names).toContain('BR-001.pdf');
    expect(names).toContain('BR-END-TER-001.pdf');
    expect(names).toContain('BR-END-SPR-002.pdf');
    console.log('[pre-flight] Template PDFs found:', names);
  });

  test('all expected preview PDFs exist', () => {
    const previewDir = path.resolve(process.cwd(), 'test-data', 'mock-pdfs', 'preview');
    const files = MockPdfViewer.listPdfs(previewDir);
    const names  = files.map(f => path.basename(f));

    expect(names).toContain('BR-001.pdf');
    expect(names).toContain('BR-END-TER-001.pdf');
    expect(names).toContain('BR-END-SPR-002.pdf');
    console.log('[pre-flight] Preview PDFs found:', names);
  });

  test('BR-001 template declares all variables that sample UI values cover', async () => {
    const templateVars = await MockPdfValidator.requiredVariables(tpl('BR-001.pdf'));
    const sampleKeys   = Object.keys(BR_SAMPLE_VALUES).map(k => k.toLowerCase());

    const missing = templateVars.filter(v => !sampleKeys.includes(v.toLowerCase()));
    if (missing.length > 0) {
      console.warn('[pre-flight] BR-001 has variables not in sample data:', missing);
    }
    // Soft check — warns but doesn't fail, so teams can iterate on templates
    expect(missing.length).toBeLessThanOrEqual(0);
  });

  test('every template PDF renders without errors using sample values', async () => {
    const templateDir = path.resolve(process.cwd(), 'test-data', 'mock-pdfs', 'template');
    const files = MockPdfViewer.listPdfs(templateDir);

    for (const filePath of files) {
      const result = await MockPdfViewer.renderFromPdf(filePath, BR_SAMPLE_VALUES);
      const name   = path.basename(filePath);
      expect(result.renderedText.length, `${name} should produce non-empty output`).toBeGreaterThan(0);
      console.log(
        `[pre-flight] ${name}: rendered ${result.renderedText.length} chars,` +
        ` unresolved: ${result.unresolved.length}`,
      );
    }
  });

  test('every preview PDF is non-empty and contains no raw {{variables}}', async () => {
    const previewDir = path.resolve(process.cwd(), 'test-data', 'mock-pdfs', 'preview');
    const files = MockPdfViewer.listPdfs(previewDir);

    for (const filePath of files) {
      const text = await MockPdfViewer.extractText(filePath);
      const name = path.basename(filePath);
      expect(text.length, `${name} should produce non-empty text`).toBeGreaterThan(0);
      expect(text, `${name} should not contain unresolved placeholders`).not.toMatch(/\{\{.+?\}\}/);
      console.log(`[pre-flight] ${name}: extracted ${text.length} chars`);
    }
  });
});
