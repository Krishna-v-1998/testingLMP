/**
 * mock-pdf-comparison.spec.ts
 *
 * Validates the template ↔ rendered-PDF comparison pipeline
 * WITHOUT a real browser or PDF viewer.
 *
 * ── WHAT IS TESTED ────────────────────────────────────────────────────────────
 *
 *   Client Template (file on disk)       Mock PDF Viewer (in-memory render)
 *   ─────────────────────────────        ─────────────────────────────────
 *   "Issued to {{Named Insured}}"   →    "Issued to Acme Construction LLC"
 *   "Policy Number: {{Policy Number}}"   "Policy Number: BR-2025-001234"
 *   "Deductible: ${{Deductible}}"        "Deductible: $5,000"
 *                 ↑                                    ↑
 *           MockPdfViewer.renderFile()         COMPARED via MockPdfValidator
 *
 * ── RUNNING ───────────────────────────────────────────────────────────────────
 *
 *   # All mock tests (no browser, no PDF viewer)
 *   npx playwright test tests/mock/mock-pdf-comparison.spec.ts
 *
 *   # Single test
 *   npx playwright test tests/mock/mock-pdf-comparison.spec.ts -g "BR-001"
 *
 * ── PREREQUISITES ─────────────────────────────────────────────────────────────
 *
 *   - test-data/mock-templates/BR-001.txt
 *   - test-data/mock-templates/BR-END-TER-001.txt
 *   - test-data/mock-templates/BR-END-SPR-002.txt
 *   - test-data/mock-pdf-values.ts  (sample UI values)
 */

import path from 'path';
import { test, expect } from '@playwright/test';
import { MockPdfViewer }    from '../../src/utils/MockPdfViewer';
import { MockPdfValidator } from '../../src/utils/MockPdfValidator';
import { BR_SAMPLE_VALUES, BR_MINIMAL_VALUES } from '../../test-data/mock-pdf-values';

// ── Helpers ───────────────────────────────────────────────────────────────────

function tpl(filename: string): string {
  return path.resolve(process.cwd(), 'test-data', 'mock-templates', filename);
}

// ═════════════════════════════════════════════════════════════════════════════
// SUITE 1: MockPdfViewer — template rendering
// ═════════════════════════════════════════════════════════════════════════════

test.describe('MockPdfViewer — template rendering', () => {

  test('extracts all variable names from BR-001 template', () => {
    const vars = MockPdfViewer.extractVariablesFromFile(tpl('BR-001.txt'));

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

  test('renders BR-001 template with all sample values — no unresolved variables', () => {
    const result = MockPdfViewer.renderFile(tpl('BR-001.txt'), BR_SAMPLE_VALUES);

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

  test('renders BR-END-TER-001 template — terrorism endorsement values present', () => {
    const result = MockPdfViewer.renderFile(tpl('BR-END-TER-001.txt'), BR_SAMPLE_VALUES);

    expect(result.unresolved).toHaveLength(0);
    expect(result.renderedText).toContain('Acme Construction LLC');
    expect(result.renderedText).toContain('BR-2025-001234');
    expect(result.renderedText).toContain('include');   // Terrorism Coverage
    expect(result.renderedText).toContain('1%');         // TRIA Percentage rendered
    expect(result.renderedText).not.toMatch(/\{\{.+?\}\}/);
  });

  test('renders BR-END-SPR-002 template — sprinkler endorsement values present', () => {
    const result = MockPdfViewer.renderFile(tpl('BR-END-SPR-002.txt'), BR_SAMPLE_VALUES);

    expect(result.unresolved).toHaveLength(0);
    expect(result.renderedText).toContain('Yes');   // Sprinklered
    expect(result.renderedText).toContain('123 Test Street');
    expect(result.renderedText).not.toMatch(/\{\{.+?\}\}/);
  });

  test('reports unresolved variables when values are incomplete', () => {
    // Use only minimal values — many variables should remain unresolved
    const result = MockPdfViewer.renderFile(tpl('BR-001.txt'), BR_MINIMAL_VALUES);

    expect(result.unresolved.length).toBeGreaterThan(0);
    // Raw placeholders should still be visible in the output
    expect(result.renderedText).toMatch(/\{\{.+?\}\}/);
    console.log('[MockPdfViewer] Unresolved vars with minimal values:', result.unresolved);
  });

  test('variable matching is case-insensitive', () => {
    const template = 'Policy for {{named insured}} number {{POLICY NUMBER}}';
    const values   = { 'Named Insured': 'Acme Corp', 'Policy Number': 'BR-001' };
    const result   = MockPdfViewer.render(template, values);

    expect(result.renderedText).toBe('Policy for Acme Corp number BR-001');
    expect(result.unresolved).toHaveLength(0);
  });

  test('same variable used multiple times is replaced everywhere', () => {
    const template = '{{Named Insured}} agrees. Signed by {{Named Insured}}.';
    const values   = { 'Named Insured': 'Acme Corp' };
    const result   = MockPdfViewer.render(template, values);

    expect(result.renderedText).toBe('Acme Corp agrees. Signed by Acme Corp.');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SUITE 2: MockPdfValidator — template vs rendered comparison
// ═════════════════════════════════════════════════════════════════════════════

test.describe('MockPdfValidator — template vs rendered PDF comparison', () => {

  test('BR-001: full comparison passes with all sample values', () => {
    const result = MockPdfValidator.compare({
      templatePath: tpl('BR-001.txt'),
      values:       BR_SAMPLE_VALUES,
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

  test('BR-END-TER-001: terrorism endorsement comparison passes', () => {
    const result = MockPdfValidator.compare({
      templatePath: tpl('BR-END-TER-001.txt'),
      values:       BR_SAMPLE_VALUES,
      requiredStatements: [
        'Terrorism Risk Insurance Act',
        'Secretary of the Treasury',
        'ALL OTHER TERMS AND CONDITIONS OF THIS POLICY REMAIN UNCHANGED',
      ],
    });

    expect(result.passed, result.summary).toBe(true);
  });

  test('BR-END-SPR-002: sprinkler endorsement comparison passes', () => {
    const result = MockPdfValidator.compare({
      templatePath: tpl('BR-END-SPR-002.txt'),
      values:       BR_SAMPLE_VALUES,
      requiredStatements: [
        'direct physical loss or damage to covered property',
        'ALL OTHER TERMS AND CONDITIONS OF THIS POLICY REMAIN UNCHANGED',
      ],
    });

    expect(result.passed, result.summary).toBe(true);
  });

  // ── Failure scenarios ─────────────────────────────────────────────────────

  test('FAIL: comparison detects wrong Named Insured value', () => {
    const wrongValues = {
      ...BR_SAMPLE_VALUES,
      'Named Insured': 'Wrong Company Name Inc',  // different from what template renders
    };

    // We re-render with wrong values — the rendered PDF will contain "Wrong Company Name Inc"
    // but we check for "Acme Construction LLC" to simulate a mismatch
    const rendered = MockPdfViewer.renderFile(tpl('BR-001.txt'), wrongValues);
    expect(rendered.renderedText).toContain('Wrong Company Name Inc');
    expect(rendered.renderedText).not.toContain('Acme Construction LLC');

    // Verify the validator would catch this if we look for the original value
    const result = MockPdfValidator.compare({
      templatePath:       tpl('BR-001.txt'),
      values:             wrongValues,
      requiredStatements: ['Acme Construction LLC'],  // ← not present → should fail
    });

    expect(result.passed).toBe(false);
    expect(result.failures.some(f => f.label.includes('Acme Construction LLC'))).toBe(true);
    console.log('[MockPdfValidator] Expected failure:', result.failures[0]?.label);
  });

  test('FAIL: comparison detects missing variable value', () => {
    const incompleteValues = { ...BR_SAMPLE_VALUES };
    delete (incompleteValues as Record<string, string>)['Deductible'];

    const result = MockPdfValidator.compare({
      templatePath: tpl('BR-001.txt'),
      values:       incompleteValues,
    });

    expect(result.passed).toBe(false);
    expect(result.unresolvedVars).toContain('Deductible');
    console.log('[MockPdfValidator] Unresolved:', result.unresolvedVars);
  });

  test('FAIL: comparison detects missing required statement', () => {
    const result = MockPdfValidator.compare({
      templatePath:       tpl('BR-001.txt'),
      values:             BR_SAMPLE_VALUES,
      requiredStatements: ['THIS STATEMENT DOES NOT EXIST IN ANY TEMPLATE'],
    });

    expect(result.passed).toBe(false);
    expect(result.failures[0]?.checkType).toBe('statement_present');
  });

  test('compareOrThrow throws on failure with readable message', () => {
    expect(() => {
      MockPdfValidator.compareOrThrow({
        templatePath:       tpl('BR-001.txt'),
        values:             BR_MINIMAL_VALUES,       // many vars missing
        requiredStatements: ['NONEXISTENT STATEMENT'],
      });
    }).toThrow(/Mock PDF comparison FAILED/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SUITE 3: Pre-flight — template variable inventory
// ═════════════════════════════════════════════════════════════════════════════

test.describe('Template pre-flight — variable inventory', () => {

  test('BR-001 declares all variables that sample UI values cover', () => {
    const templateVars = MockPdfValidator.requiredVariables(tpl('BR-001.txt'));
    const sampleKeys   = Object.keys(BR_SAMPLE_VALUES).map(k => k.toLowerCase());

    const missing = templateVars.filter(v => !sampleKeys.includes(v.toLowerCase()));
    if (missing.length > 0) {
      console.warn('[pre-flight] BR-001 has variables not in sample data:', missing);
    }
    // This is a soft check — warns but doesn't fail, so teams can iterate on templates
    expect(missing.length).toBeLessThanOrEqual(0);
  });

  test('lists all mock template files', () => {
    const files = MockPdfViewer.listTemplates('test-data/mock-templates');
    expect(files.length).toBeGreaterThanOrEqual(3);
    console.log('[pre-flight] Template files found:', files.map(f => f.split('/').pop()));
  });

  test('every template file renders without errors using sample values', () => {
    const files = MockPdfViewer.listTemplates('test-data/mock-templates');

    for (const filePath of files) {
      const result = MockPdfViewer.renderFile(filePath, BR_SAMPLE_VALUES);
      const name   = filePath.split('/').pop();
      expect(result.renderedText.length, `${name} should produce non-empty output`).toBeGreaterThan(0);
      console.log(`[pre-flight] ${name}: rendered ${result.renderedText.length} chars, unresolved: ${result.unresolved.length}`);
    }
  });
});
