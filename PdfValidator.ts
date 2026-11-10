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
 *   4. Validates two independent dimensions:
 *      A. Template identity — form number and form name must appear.
 *      B. Field values — each expected label + value must appear in sequence.
 *      C. Additional statements — static boilerplate text must appear verbatim.
 *
 * ── LIMITATIONS ──────────────────────────────────────────────────────────────
 *
 *   • Text extraction cannot prove visual placement (a field on the wrong page
 *     or in the wrong column still passes).  Add a visual / coordinate-based
 *     check as a separate enhancement when placement must be validated.
 *
 *   • Scanned PDF forms produce no extractable text — this validator will
 *     return an empty pdfText and all checks will fail.  Use OCR (Tesseract)
 *     for scanned forms.
 *
 *   • Generated PDF timestamps, font subsets, and rendering differences are
 *     NOT compared — only the visible text content is compared.
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
import pdfParse       from 'pdf-parse';
import {
  PdfValidationInput,
  PdfValidationResult,
} from '../types/forms.types';

// ── Helper types ──────────────────────────────────────────────────────────────

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
 *   - Preserves case (do case-insensitive matching at the call site when needed)
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
      /** Milliseconds to wait for the new tab to open (default 30 s) */
      tabTimeout?:         number;
      /** Milliseconds to wait for the PDF URL to become non-blank (default 10 s) */
      urlTimeout?:         number;
      /** Whether label+value matching is case-insensitive (default true) */
      caseInsensitive?:    boolean;
      /** Whether to allow value to appear on a different line from label (default true) */
      allowMultiLine?:     boolean;
    } = {}
  ): Promise<PdfValidationResult> {
    const {
      tabTimeout      = 30_000,
      urlTimeout      = 10_000,
      caseInsensitive = true,
      allowMultiLine  = true,
    } = options;

    // ── Step 1: Wait for the new tab ────────────────────────────────────────
    const newPage = await Promise.race([
      newPagePromise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PDF tab did not open within timeout')), tabTimeout)
      ),
    ]);

    await newPage.waitForLoadState('domcontentloaded');

    // ── Step 2: Get the PDF URL ─────────────────────────────────────────────
    let pdfUrl = newPage.url();

    // Some apps load the PDF asynchronously via fetch and display it in an
    // <embed> or <iframe>.  Try to find the actual PDF URL if the tab URL
    // doesn't end in .pdf / contain /pdf/.
    if (!this.looksLikePdfUrl(pdfUrl)) {
      try {
        await newPage.waitForFunction(
          () => document.querySelector('embed[type="application/pdf"], iframe[src*=".pdf"], a[href*=".pdf"]') !== null,
          { timeout: urlTimeout }
        );
        const src = await newPage.evaluate(() => {
          const el = document.querySelector<HTMLElement>(
            'embed[type="application/pdf"], iframe[src*=".pdf"], a[href*=".pdf"]'
          );
          return el ? (el as any).src ?? (el as any).href ?? '' : '';
        });
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
      return this.failResult(
        `Error fetching PDF: ${(err as Error).message}`,
        input,
      );
    }

    // Close the new tab after fetching — avoids leaving orphan tabs
    await newPage.close().catch(() => { /* ignore close errors */ });

    // ── Step 4: Extract text ────────────────────────────────────────────────
    let rawText = '';
    try {
      const parsed = await pdfParse(pdfBuffer);
      rawText      = parsed.text;
    } catch (err) {
      return this.failResult(
        `pdf-parse error: ${(err as Error).message}`,
        input,
      );
    }

    const pdfText = normalizeText(rawText);

    // ── Step 5: Run validations ─────────────────────────────────────────────
    return this.validate(pdfText, input, { caseInsensitive, allowMultiLine });
  }

  /**
   * Validates already-extracted (and normalized) PDF text against the input.
   * Useful when you already have the text and want to re-run checks without
   * fetching the PDF again.
   */
  static validate(
    pdfText: string,
    input:   PdfValidationInput,
    options: { caseInsensitive?: boolean; allowMultiLine?: boolean } = {}
  ): PdfValidationResult {
    const { caseInsensitive = true } = options;

    const failures: string[]         = [];
    const fieldValidations: FieldCheck[]     = [];
    const statementValidations: StatementCheck[] = [];

    const hay = caseInsensitive ? pdfText.toLowerCase() : pdfText;

    // ── A. Template identity ───────────────────────────────────────────────
    const formNumberNeedle = caseInsensitive
      ? input.formNumber.toLowerCase()
      : input.formNumber;
    const formNameNeedle   = caseInsensitive
      ? input.formName.toLowerCase()
      : input.formName;

    const formNumberFound = hay.includes(formNumberNeedle);
    const formNameFound   = hay.includes(formNameNeedle);

    if (!formNumberFound) {
      failures.push(`Form number "${input.formNumber}" not found in PDF`);
    }
    if (!formNameFound) {
      failures.push(`Form name "${input.formName}" not found in PDF`);
    }

    // ── B. Field value checks ──────────────────────────────────────────────
    for (const fv of input.fieldValues) {
      if (!fv.pdfLabel || !fv.expectedValue) continue;

      const label   = caseInsensitive ? fv.pdfLabel.toLowerCase()      : fv.pdfLabel;
      const value   = caseInsensitive ? fv.expectedValue.toLowerCase()  : fv.expectedValue;

      // Look for label followed eventually by value (within 200 chars is generous
      // enough for multi-line layouts)
      const labelIdx = hay.indexOf(label);
      let found = false;

      if (labelIdx !== -1) {
        const window = hay.substring(labelIdx, labelIdx + label.length + 200);
        found = window.includes(value);
      }

      fieldValidations.push({ ...fv, found });

      if (!found) {
        failures.push(
          `Field "${fv.fieldName}": label "${fv.pdfLabel}" with value "${fv.expectedValue}" not found in PDF`
        );
      }
    }

    // ── C. Additional statements ───────────────────────────────────────────
    for (const stmt of input.additionalStatements) {
      const needle = caseInsensitive ? stmt.toLowerCase() : stmt;
      const found  = hay.includes(needle);

      statementValidations.push({ statement: stmt, found });

      if (!found) {
        failures.push(`Additional statement not found in PDF: "${stmt}"`);
      }
    }

    return {
      passed:               failures.length === 0,
      pdfText,
      fieldValidations,
      statementValidations,
      formNumberFound,
      formNameFound,
      failures,
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /** Crude heuristic — does the URL look like it points directly to a PDF? */
  private static looksLikePdfUrl(url: string): boolean {
    return /\.pdf(\?|#|$)/i.test(url) || /\/pdf\//i.test(url);
  }

  /** Builds a failed result without running any checks */
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

  /**
   * Convenience: builds a PdfValidationInput from an ExtendedFormDefinition.
   * Fields with an empty pdfLabel are excluded from field checks.
   */
  static buildInput(form: {
    formNumber:              string;
    formName:                string;
    pdfAdditionalStatements: string[];
    fields: Array<{
      fieldName:     string;
      pdfLabel:      string;
      testValue:     string;
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
}
