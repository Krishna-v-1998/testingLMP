/**
 * MockPdfValidator.ts
 *
 * Runs the template-vs-rendered-PDF comparison without a real PDF viewer.
 *
 * ── HOW THE COMPARISON WORKS ─────────────────────────────────────────────────
 *
 *   Client Template (file on disk)          Mock PDF Viewer (in-memory render)
 *   ─────────────────────────────           ─────────────────────────────────
 *   "Policy issued to {{Named Insured}}"    "Policy issued to Acme Corp"
 *   "Policy Number: {{Policy Number}}"      "Policy Number: BR-2025-001234"
 *   "Deductible: ${{Deductible}}"           "Deductible: $5,000"
 *            │                                        │
 *            └──────────── COMPARE ──────────────────┘
 *                  MockPdfValidator.compare()
 *
 *   The validator:
 *     1. Renders the template using the supplied UI values → "mock PDF text"
 *     2. Verifies every {{variable}} placeholder was resolved (no blanks in PDF)
 *     3. Verifies each field value appears verbatim in the rendered text
 *     4. Verifies each required static statement appears in the rendered text
 *     5. Reports a structured result with per-check pass/fail details
 *
 * ── USAGE ─────────────────────────────────────────────────────────────────────
 *
 *   const result = MockPdfValidator.compare({
 *     templatePath: 'test-data/mock-templates/BR-001.txt',
 *     values: {
 *       'Named Insured':  'Acme Construction LLC',
 *       'Policy Number':  'BR-2025-001234',
 *       'Effective Date': '01/01/2025',
 *       'Deductible':     '5,000',
 *       // ... all variables the template uses
 *     },
 *     // Optional: assert specific static strings appear in the rendered output
 *     requiredStatements: [
 *       'direct physical loss or damage to covered property',
 *       'Terrorism Risk Insurance Act',
 *     ],
 *   });
 *
 *   if (!result.passed) {
 *     console.error(result.summary);
 *     result.failures.forEach(f => console.error(' ✗', f));
 *   }
 *
 * ── ENV SWITCH ───────────────────────────────────────────────────────────────
 *
 *   Set  USE_MOCK_PDF=true  (or PDF_VALIDATION_ENABLED=false) to redirect
 *   FormsPage validation through MockPdfValidator automatically.
 *   See MockPdfValidationMixin comment in FormsPage for wiring details.
 */

import { MockPdfViewer, type TemplateValues } from './MockPdfViewer';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MockCompareInput {
  /** Path to the client-supplied template file (absolute or cwd-relative) */
  templatePath: string;
  /** Variable name → live UI value map  */
  values:       TemplateValues;
  /** Static strings that must appear verbatim in the rendered output */
  requiredStatements?: string[];
  /** Whether the comparison is case-insensitive (default: false) */
  caseInsensitive?: boolean;
}

export interface MockCheckResult {
  checkType:   'variable_resolved' | 'value_present' | 'statement_present' | 'no_unresolved_placeholders';
  label:       string;
  expected:    string;
  found:       boolean;
  detail?:     string;
}

export interface MockCompareResult {
  /** True iff every check passed */
  passed:        boolean;
  /** Human-readable one-line summary */
  summary:       string;
  /** The fully rendered "mock PDF" text */
  renderedText:  string;
  /** Variables in the template that had no value supplied */
  unresolvedVars: string[];
  /** All individual check outcomes */
  checks:        MockCheckResult[];
  /** Only the failed checks */
  failures:      MockCheckResult[];
}

// ── MockPdfValidator ──────────────────────────────────────────────────────────

export class MockPdfValidator {

  /**
   * Main entry point.
   * Renders the template and validates the rendered text.
   */
  static compare(input: MockCompareInput): MockCompareResult {
    const { templatePath, values, requiredStatements = [], caseInsensitive = false } = input;

    // ── 1. Render ─────────────────────────────────────────────────────────
    const { renderedText, unresolved } = MockPdfViewer.renderFile(templatePath, values);

    const normalize = (s: string) => caseInsensitive ? s.toLowerCase() : s;
    const haystack  = normalize(renderedText);

    const checks: MockCheckResult[] = [];

    // ── 2. Check: no unresolved placeholders remain ───────────────────────
    if (unresolved.length === 0) {
      checks.push({
        checkType: 'no_unresolved_placeholders',
        label:     'All template variables resolved',
        expected:  '(no {{...}} remaining)',
        found:     true,
      });
    } else {
      for (const v of unresolved) {
        checks.push({
          checkType: 'variable_resolved',
          label:     `Variable resolved: {{${v}}}`,
          expected:  `A value for "${v}"`,
          found:     false,
          detail:    `No value supplied for {{${v}}} — it still appears as a placeholder in the rendered text`,
        });
      }
    }

    // ── 3. Check: each supplied value appears in the rendered text ─────────
    for (const [varName, value] of Object.entries(values)) {
      if (!value.trim()) continue;           // skip blank values
      const needle = normalize(value.trim());
      const found  = haystack.includes(needle);
      checks.push({
        checkType: 'value_present',
        label:     `Value present: "${varName}" = "${value}"`,
        expected:  value,
        found,
        detail:    found
          ? undefined
          : `Expected value "${value}" for variable "${varName}" not found in rendered text`,
      });
    }

    // ── 4. Check: required static statements ──────────────────────────────
    for (const stmt of requiredStatements) {
      const needle = normalize(stmt.trim());
      const found  = haystack.includes(needle);
      checks.push({
        checkType: 'statement_present',
        label:     `Statement present: "${stmt.substring(0, 60)}${stmt.length > 60 ? '…' : ''}"`,
        expected:  stmt,
        found,
        detail:    found
          ? undefined
          : `Required statement not found in rendered text: "${stmt}"`,
      });
    }

    // ── 5. Build result ───────────────────────────────────────────────────
    const failures = checks.filter(c => !c.found);
    const passed   = failures.length === 0;

    const summary = passed
      ? `✅ Mock PDF comparison passed — ${checks.length} check(s) OK`
      : `❌ Mock PDF comparison FAILED — ${failures.length} of ${checks.length} check(s) failed`;

    return { passed, summary, renderedText, unresolvedVars: unresolved, checks, failures };
  }

  // ── Convenience helpers ───────────────────────────────────────────────────

  /**
   * Throws an Error with the failure details if the comparison fails.
   * Handy inside a Playwright test without manually checking .passed.
   */
  static compareOrThrow(input: MockCompareInput): MockCompareResult {
    const result = this.compare(input);
    if (!result.passed) {
      const lines = [
        result.summary,
        '',
        ...result.failures.map(f => `  ✗ ${f.label}${f.detail ? '\n      ' + f.detail : ''}`),
      ];
      throw new Error(lines.join('\n'));
    }
    return result;
  }

  /**
   * Prints a human-readable diff-style report to stdout.
   * Useful for debugging failing comparisons.
   */
  static printReport(result: MockCompareResult): void {
    console.log('\n' + '─'.repeat(72));
    console.log(result.summary);
    console.log('─'.repeat(72));

    if (result.unresolvedVars.length > 0) {
      console.log('\nUnresolved template variables:');
      result.unresolvedVars.forEach(v => console.log(`  ⚠  {{${v}}}`));
    }

    if (result.failures.length > 0) {
      console.log('\nFailed checks:');
      result.failures.forEach(f => {
        console.log(`  ✗  ${f.label}`);
        if (f.detail) console.log(`       ${f.detail}`);
      });
    }

    const passed = result.checks.filter(c => c.found);
    if (passed.length > 0) {
      console.log(`\nPassed checks (${passed.length}):`);
      passed.forEach(c => console.log(`  ✓  ${c.label}`));
    }

    console.log('\nRendered text preview (first 20 lines):');
    result.renderedText.split('\n').slice(0, 20).forEach(l => console.log('  │ ' + l));
    console.log('─'.repeat(72) + '\n');
  }

  /**
   * Returns all  {{Variable}}  names declared in a template file.
   * Handy for pre-flight checks (verify all needed UI values are present before running tests).
   */
  static requiredVariables(templatePath: string): string[] {
    return MockPdfViewer.extractVariablesFromFile(templatePath);
  }
}
