/**
 * PdfValidator.ts
 *
 * PDF validation utility for the Forms workflow.
 *
 * ── WHAT IT DOES ─────────────────────────────────────────────────────────────
 *
 *   1. Waits for the PDF tab to open (triggered by Eye icon click).
 *   2. Fetches the PDF bytes from the new tab's URL.
 *   3. Extracts text using pdf-parse.
 *   4. Validates three independent dimensions:
 *      A. Template identity — form number and form name must appear.
 *      B. Field values    — each expected label + value must appear in sequence.
 *      C. Additional statements — static boilerplate text must appear verbatim.
 *
 * ── USAGE ────────────────────────────────────────────────────────────────────
 *
 *   // Set up the new-tab listener BEFORE clicking the Eye icon
 *   const newTabPromise = page.context().waitForEvent('page');
 *   await formsPage.clickEyeIconForForm('IM-FGL-TG-14');
 *   const result = await PdfValidator.captureAndValidate(newTabPromise, {
 *     formNumber:           'IM FGL TG 14',
 *     formName:             'Inland Marine Table of Contents',
 *     additionalStatements: ['In consideration of the premium charged'],
 *     fieldValues: [
 *       { fieldName: 'Policy Number', pdfLabel: 'POLICY NUMBER:', expectedValue: 'POL-2026-001' },
 *       { fieldName: 'Insured Name',  pdfLabel: 'INSURED NAME:',  expectedValue: 'ABC Corp' },
 *     ],
 *   });
 *   expect(result.passed, result.failures.join('\n')).toBe(true);
 *
 * ── DEPENDENCY ───────────────────────────────────────────────────────────────
 *
 *   npm install --save-dev pdf-parse @types/pdf-parse
 */

import { type Page } from '@playwright/test';
import {
  type PdfValidationInput,
  type PdfValidationResult,
  type FormManifestEntry,
} from '../types/forms.types';

// ── Fix: pdf-parse ships as CJS; a default ESM import has no call signature.
// Using require() with an explicit type bypasses the broken .d.ts entirely.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (
  dataBuffer: Buffer,
  options?:   Record<string, unknown>,
) => Promise<{ text: string; numpages: number; info: Record<string, unknown> }>;

// ── Internal types ────────────────────────────────────────────────────────────

interface FieldCheck {
  fieldName:     string;
  pdfLabel:      string;
  expectedValue: string;
  found:         boolean;
}

interface StatementCheck {
  statement: string;
  found:     boolean;
}

// ── Normalizer ────────────────────────────────────────────────────────────────

/**
 * Normalizes extracted PDF text for comparison:
 *   - Collapses multiple whitespace characters (including \r\n) to single spaces
 *   - Trims leading/trailing whitespace
 *   - Preserves case (do case-insensitive matching at the call site)
 */
function normalizeText(raw: string): string {
  return raw.replace(/[\r\n\t\f]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

// ═════════════════════════════════════════════════════════════════════════════
// PdfValidator
// ═════════════════════════════════════════════════════════════════════════════

export class PdfValidator {

  /**
   * Full workflow: waits for the new tab, fetches the PDF, runs all validations.
   *
   * @param newPagePromise - Promise returned by `context.waitForEvent('page')`
   *                         set up BEFORE the Eye icon was clicked.
   * @param input          - Describes what to validate in the PDF.
   * @param options        - Optional tuning parameters.
   */
  static async captureAndValidate(
    newPagePromise: Promise<Page>,
    input:          PdfValidationInput,
    options: {
      tabTimeout?:      number;
      urlTimeout?:      number;
      caseInsensitive?: boolean;
      allowMultiLine?:  boolean;
    } = {},
  ): Promise<PdfValidationResult> {
    const {
      tabTimeout      = 30_000,
      urlTimeout      = 10_000,
      caseInsensitive = true,
    } = options;

    // ── Step 1: Wait for the new tab ────────────────────────────────────────
    const newPage = await Promise.race([
      newPagePromise,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('PDF tab did not open within timeout')),
          tabTimeout,
        ),
      ),
    ]);

    await newPage.waitForLoadState('domcontentloaded');

    // ── Step 2: Get the PDF URL ─────────────────────────────────────────────
    let pdfUrl = newPage.url();

    if (!this.looksLikePdfUrl(pdfUrl)) {
      try {
        await newPage.waitForFunction(
          'document.querySelector(\'embed[type="application/pdf"], iframe[src*=".pdf"], a[href*=".pdf"]\') !== null',
          { timeout: urlTimeout },
        );
        const src = await newPage.evaluate(
          `(() => {
            const el = document.querySelector(
              'embed[type="application/pdf"], iframe[src*=".pdf"], a[href*=".pdf"]'
            );
            return el ? (el.src || el.href || '') : '';
          })()`,
        ) as string;
        if (src) pdfUrl = src;
      } catch {
        // Fallback: treat the tab URL as the PDF URL
      }
    }

    // ── Step 3: Fetch the PDF bytes ─────────────────────────────────────────
    let pdfBuffer: Buffer;
    try {
      const response = await newPage.request.get(pdfUrl, { timeout: urlTimeout });
      if (!response.ok()) {
        return this.failResult(
          `Failed to fetch PDF from ${pdfUrl}: HTTP ${response.status()}`,
          input,
        );
      }
      pdfBuffer = Buffer.from(await response.body());
    } catch (err) {
      return this.failResult(`Error fetching PDF: ${(err as Error).message}`, input);
    }

    await newPage.close().catch(() => { /* ignore close errors */ });

    // ── Step 4: Extract text ────────────────────────────────────────────────
    let rawText = '';
    try {
      const parsed = await pdfParse(pdfBuffer);
      rawText      = parsed.text;
    } catch (err) {
      return this.failResult(`pdf-parse error: ${(err as Error).message}`, input);
    }

    const pdfText = normalizeText(rawText);

    // ── Step 5: Run validations ─────────────────────────────────────────────
    return this.validate(pdfText, input, { caseInsensitive });
  }

  /**
   * Validates already-extracted (and normalized) PDF text against the input.
   * Useful when you already have the text and want to re-run checks.
   */
  static validate(
    pdfText: string,
    input:   PdfValidationInput,
    options: { caseInsensitive?: boolean } = {},
  ): PdfValidationResult {
    const { caseInsensitive = true } = options;

    const failures:              string[]          = [];
    const fieldValidations:      FieldCheck[]      = [];
    const statementValidations:  StatementCheck[]  = [];

    const hay = caseInsensitive ? pdfText.toLowerCase() : pdfText;

    // ── A. Template identity ───────────────────────────────────────────────
    const formNumberNeedle = caseInsensitive ? input.formNumber.toLowerCase() : input.formNumber;
    const formNameNeedle   = caseInsensitive ? input.formName.toLowerCase()   : input.formName;

    const formNumberFound = hay.includes(formNumberNeedle);
    const formNameFound   = hay.includes(formNameNeedle);

    if (!formNumberFound) failures.push(`Form number "${input.formNumber}" not found in PDF`);
    if (!formNameFound)   failures.push(`Form name "${input.formName}" not found in PDF`);

    // ── B. Field value checks ──────────────────────────────────────────────
    for (const fv of input.fieldValues) {
      if (!fv.pdfLabel || !fv.expectedValue) continue;

      const label    = caseInsensitive ? fv.pdfLabel.toLowerCase()     : fv.pdfLabel;
      const value    = caseInsensitive ? fv.expectedValue.toLowerCase() : fv.expectedValue;
      const labelIdx = hay.indexOf(label);
      let found      = false;

      if (labelIdx !== -1) {
        const window = hay.substring(labelIdx, labelIdx + label.length + 200);
        found = window.includes(value);
      }

      fieldValidations.push({ ...fv, found });

      if (!found) {
        failures.push(
          `Field "${fv.fieldName}": label "${fv.pdfLabel}" ` +
          `with value "${fv.expectedValue}" not found in PDF`,
        );
      }
    }

    // ── C. Additional statements ───────────────────────────────────────────
    for (const stmt of input.additionalStatements) {
      const needle = caseInsensitive ? stmt.toLowerCase() : stmt;
      const found  = hay.includes(needle);

      statementValidations.push({ statement: stmt, found });
      if (!found) failures.push(`Additional statement not found in PDF: "${stmt}"`);
    }

    return {
      passed: failures.length === 0,
      pdfText,
      fieldValidations,
      statementValidations,
      formNumberFound,
      formNameFound,
      failures,
    };
  }

  /**
   * Convenience: builds a PdfValidationInput from a FormManifestEntry +
   * a map of live UI values keyed by fieldName.
   */
  static buildInputFromManifest(
    entry:      FormManifestEntry,
    liveValues: Record<string, string>,
  ): PdfValidationInput {
    return {
      formNumber:           entry.formNumber,
      formName:             entry.formName,
      additionalStatements: entry.additionalStatements,
      fieldValues: entry.fields
        .filter(f => f.pdfLabel)
        .map(f => ({
          fieldName:     f.fieldName,
          pdfLabel:      f.pdfLabel,
          expectedValue: liveValues[f.fieldName] ?? '',
        })),
    };
  }

  /**
   * Convenience: builds a PdfValidationInput from an inline form description.
   * Fields with an empty pdfLabel are excluded from field checks.
   */
  static buildInput(form: {
    formNumber:              string;
    formName:                string;
    pdfAdditionalStatements: string[];
    fields: Array<{
      fieldName:  string;
      pdfLabel:   string;
      testValue:  string;
    }>;
  }): PdfValidationInput {
    return {
      formNumber:           form.formNumber,
      formName:             form.formName,
      additionalStatements: form.pdfAdditionalStatements,
      fieldValues: form.fields
        .filter(f => f.pdfLabel)
        .map(f => ({
          fieldName:     f.fieldName,
          pdfLabel:      f.pdfLabel,
          expectedValue: f.testValue,
        })),
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private static looksLikePdfUrl(url: string): boolean {
    return /\.pdf(\?|#|$)/i.test(url) || /\/pdf\//i.test(url);
  }

  private static failResult(
    message: string,
    input:   PdfValidationInput,
  ): PdfValidationResult {
    return {
      passed:               false,
      pdfText:              '',
      fieldValidations:     input.fieldValues.map(fv => ({ ...fv, found: false })),
      statementValidations: input.additionalStatements.map(s => ({ statement: s, found: false })),
      formNumberFound:      false,
      formNameFound:        false,
      failures:             [message],
    };
  }
}
