/**
 * MockPdfValidator.ts
 *
 * Compares a CLIENT TEMPLATE PDF (with {{variables}}) against a PREVIEW PDF
 * (with values filled in).
 *
 * ── WHY NOT LINE-BY-LINE COMPARISON ──────────────────────────────────────────
 *
 *   PDF text extraction does not preserve line breaks reliably.
 *   A template statement like:
 *     "The Broker of {{Named Insured}} has a policy from {{Effective Date}}"
 *
 *   May render in the preview as:
 *     Line 1: "The Broker of Acme Technologies Limited has a policy from"
 *     Line 2: "11/20/2026"
 *   OR as a single line if the value is short:
 *     "The Broker of Anthropic has a policy from 11/18/2026"
 *
 *   Line-by-line diff would flag this as a mismatch every time.
 *
 * ── THE SOLUTION: NORMALIZED SUBSTRING MATCHING ──────────────────────────────
 *
 *   Both the rendered template text and the preview PDF text are:
 *     1. Whitespace-normalized (all \s+ collapsed to a single space)
 *     2. Broken into logical phrases (by blank lines / sentence endings)
 *     3. Each phrase is searched as a substring in the normalized preview text
 *
 *   This correctly matches statements regardless of where the PDF renderer
 *   decided to wrap the line.
 *
 * ── USAGE ────────────────────────────────────────────────────────────────────
 *
 *   const result = await MockPdfValidator.comparePdfs({
 *     templatePdfPath: 'test-data/mock-pdfs/template/BR-001.pdf',
 *     previewPdfPath:  'test-data/mock-pdfs/preview/BR-001.pdf',
 *     values: { 'Named Insured': 'Acme Corp', 'Policy Number': 'BR-001' },
 *     requiredStatements: ['direct physical loss or damage'],
 *   });
 *   expect(result.passed, result.summary).toBe(true);
 */

import { MockPdfViewer }                     from './MockPdfViewer';
import type { TemplateValues }               from '../types/pdf-comparison.types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MockComparePdfsInput {
  templatePdfPath:     string;
  previewPdfPath:      string;
  values:              TemplateValues;
  requiredStatements?: string[];
  caseInsensitive?:    boolean;
}

export type MockCheckType =
  | 'value_in_preview'
  | 'statement_in_preview'
  | 'no_unresolved_variables'
  | 'phrase_in_preview';

export interface MockCheckResult {
  checkType: MockCheckType;
  label:     string;
  expected:  string;
  actual:    string;
  found:     boolean;
}

export interface MockCompareResult {
  passed:         boolean;
  summary:        string;
  templateText:   string;
  previewText:    string;
  renderedText:   string;
  unresolvedVars: string[];
  checks:         MockCheckResult[];
  failures:       MockCheckResult[];
}

// ── MockPdfValidator ──────────────────────────────────────────────────────────

export class MockPdfValidator {

  // ── Main comparison ───────────────────────────────────────────────────────

  static async comparePdfs(input: MockComparePdfsInput): Promise<MockCompareResult> {
    const { templatePdfPath, previewPdfPath, values, requiredStatements = [], caseInsensitive = false } = input;

    // 1. Extract text from both PDFs in parallel
    const [rendered, previewText, templateText] = await Promise.all([
      MockPdfViewer.renderFromPdf(templatePdfPath, values),
      MockPdfViewer.extractText(previewPdfPath),
      MockPdfViewer.extractText(templatePdfPath),
    ]);

    const { renderedText, unresolved } = rendered;
    const checks: MockCheckResult[] = [];

    // 2. Check: each UI value appears in the preview PDF
    for (const [field, rawValue] of Object.entries(values)) {
      const value = String(rawValue ?? '').trim();
      if (!value) continue;

      const found = this.containsNormalized(previewText, value, caseInsensitive);
      checks.push({
        checkType: 'value_in_preview',
        label:     `Value — ${field}`,
        expected:  value,
        actual:    found ? value : '(not found in preview PDF)',
        found,
      });
    }

    // 3. Check: required static statements appear in the preview PDF
    for (const statement of requiredStatements) {
      const found = this.containsNormalized(previewText, statement, caseInsensitive);
      checks.push({
        checkType: 'statement_in_preview',
        label:     `Statement — "${statement.substring(0, 60)}${statement.length > 60 ? '…' : ''}"`,
        expected:  statement,
        actual:    found ? statement : '(not found in preview PDF)',
        found,
      });
    }

    // 4. Smart phrase comparison — no unresolved variables + all phrases present
    if (unresolved.length === 0) {
      // Check rendered phrases appear in preview (handles variable-length wrapping)
      const phrases = this.splitIntoPhrases(renderedText);
      for (const phrase of phrases) {
        const found = this.containsNormalized(previewText, phrase, caseInsensitive);
        checks.push({
          checkType: 'phrase_in_preview',
          label:     `Phrase — "${phrase.substring(0, 60)}${phrase.length > 60 ? '…' : ''}"`,
          expected:  phrase,
          actual:    found ? phrase : '(phrase not found in preview PDF)',
          found,
        });
      }
    }

    // 5. Unresolved variables check
    const noUnresolved = unresolved.length === 0;
    checks.push({
      checkType: 'no_unresolved_variables',
      label:     'No unresolved template variables',
      expected:  'All {{variables}} should have supplied values',
      actual:    noUnresolved
        ? 'All variables resolved'
        : unresolved.map(v => `{{${v}}}`).join(', '),
      found:     noUnresolved,
    });

    const failures = checks.filter(c => !c.found);
    const passed   = failures.length === 0;

    return {
      passed,
      summary: passed
        ? `PDF comparison PASSED (${checks.length} checks)`
        : `PDF comparison FAILED — ${failures.length} of ${checks.length} checks failed`,
      templateText,
      previewText,
      renderedText,
      unresolvedVars: unresolved,
      checks,
      failures,
    };
  }

  static async comparePdfsOrThrow(input: MockComparePdfsInput): Promise<MockCompareResult> {
    const result = await this.comparePdfs(input);
    if (!result.passed) {
      const details = result.failures
        .map(f => `  ✗ ${f.label}\n      expected: "${f.expected.substring(0, 80)}"\n      actual:   "${f.actual.substring(0, 80)}"`)
        .join('\n');
      throw new Error(`Mock PDF comparison FAILED.\n${result.summary}\n\n${details}`);
    }
    return result;
  }

  static printReport(result: MockCompareResult): void {
    console.log('\n' + '═'.repeat(70));
    console.log(result.summary);
    console.log('═'.repeat(70));

    if (result.unresolvedVars.length > 0) {
      console.log('\nUnresolved template variables:');
      result.unresolvedVars.forEach(v => console.log(`  ⚠  {{${v}}}`));
    }

    const passed  = result.checks.filter(c =>  c.found);
    const failed  = result.checks.filter(c => !c.found);

    if (failed.length > 0) {
      console.log('\nFailed checks:');
      failed.forEach(c => {
        console.log(`  ✗  [${c.checkType}] ${c.label}`);
        console.log(`       actual: ${c.actual.substring(0, 100)}`);
      });
    }

    console.log(`\nPassed checks (${passed.length}/${result.checks.length}):`);
    passed.forEach(c => console.log(`  ✓  [${c.checkType}] ${c.label}`));
    console.log('═'.repeat(70) + '\n');
  }

  static async requiredVariables(templatePdfPath: string): Promise<string[]> {
    return MockPdfViewer.extractVariablesFromPdf(templatePdfPath);
  }

  // ── Smart text comparison helpers ─────────────────────────────────────────

  /**
   * Normalizes whitespace and checks whether `needle` appears in `haystack`.
   * Handles variable-length PDF values that cause line-wrap differences.
   *
   * Example:
   *   haystack (preview PDF, extracted): "Policy for\nAcme Technologies\nLimited"
   *   normalize → "Policy for Acme Technologies Limited"
   *   needle (rendered template value): "Acme Technologies Limited"
   *   normalize → "Acme Technologies Limited"
   *   → found ✓
   */
  static containsNormalized(haystack: string, needle: string, caseInsensitive = false): boolean {
    const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
    const h = caseInsensitive ? norm(haystack).toLowerCase() : norm(haystack);
    const n = caseInsensitive ? norm(needle).toLowerCase()   : norm(needle);
    return h.includes(n);
  }

  /**
   * Splits rendered text into logical phrases for phrase-level matching.
   *
   * Strategy:
   *   - Split on blank lines (paragraph breaks)
   *   - Then split long paragraphs on sentence endings
   *   - Ignore very short fragments (< 15 chars) — likely headings or single words
   *
   * This ensures we check each meaningful statement from the template PDF
   * independently, so a failed phrase pinpoints exactly which part mismatched.
   */
  static splitIntoPhrases(text: string): string[] {
    const paragraphs = text.split(/\n{2,}/);
    const phrases: string[] = [];

    for (const para of paragraphs) {
      const trimmed = para.replace(/\s+/g, ' ').trim();
      if (trimmed.length < 15) continue;

      // Split long paragraphs into sentences
      if (trimmed.length > 200) {
        const sentences = trimmed.split(/(?<=[.!?])\s+/);
        for (const s of sentences) {
          const st = s.trim();
          if (st.length >= 15) phrases.push(st);
        }
      } else {
        phrases.push(trimmed);
      }
    }

    return phrases;
  }
}
