/**
 * MockPdfViewer.ts
 *
 * Extracts text from a PDF file and renders {{Variable}} placeholders.
 *
 * ── TWO PDFs IN THE MOCK FLOW ────────────────────────────────────────────────
 *
 *   Client Template PDF                    Preview PDF
 *   (test-data/mock-pdfs/template/*.pdf)   (test-data/mock-pdfs/preview/*.pdf)
 *   ─────────────────────────────          ─────────────────────────────────────
 *   "Policy issued to {{Named Insured}}"   "Policy issued to Acme Construction LLC"
 *   "Policy Number: {{Policy Number}}"     "Policy Number: BR-2025-001234"
 *
 *   MockPdfViewer.extractText()  reads either PDF and returns its text.
 *   MockPdfViewer.renderFromPdf() extracts the template PDF text then
 *   substitutes {{variables}} with the supplied UI values → the text the
 *   preview PDF should contain.
 *
 * ── REAL VIEWER (next sprint) ────────────────────────────────────────────────
 *
 *   When the in-app viewer ships, FormsPage switches to PdfValidator.captureAndValidate()
 *   which fetches the new-tab PDF bytes directly — no local file needed.
 *   MockPdfViewer is used only while USE_MOCK_PDF=true.
 *
 * ── DEPENDENCY ───────────────────────────────────────────────────────────────
 *
 *   npm install --save-dev pdf-parse @types/pdf-parse
 *   (pdf-parse is already installed via PdfValidator)
 */

import * as fs   from 'fs';
import * as path from 'path';

// pdf-parse ships as CJS — use require() to avoid broken ESM typings
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (
  dataBuffer: Buffer,
  options?:   Record<string, unknown>,
) => Promise<{ text: string; numpages: number }>;

// ── Types ─────────────────────────────────────────────────────────────────────

/** Map of  variableName → value  as it would appear in the preview PDF */
export type TemplateValues = Record<string, string>;

export interface RenderResult {
  /** Template text with all {{variables}} substituted */
  renderedText:   string;
  /** Raw text extracted from the template PDF (before substitution) */
  templateText:   string;
  /** Variables found in the template PDF that had no matching value */
  unresolved:     string[];
  /** Values supplied that did not match any variable in the template */
  unused:         string[];
}

// ── MockPdfViewer ─────────────────────────────────────────────────────────────

export class MockPdfViewer {

  // ── PDF text extraction ───────────────────────────────────────────────────

  /**
   * Reads a PDF file from disk and returns its extracted text.
   * Uses pdf-parse (the same library as PdfValidator).
   */
  static async extractText(pdfPath: string): Promise<string> {
    const resolved = path.isAbsolute(pdfPath)
      ? pdfPath
      : path.resolve(process.cwd(), pdfPath);

    if (!fs.existsSync(resolved)) {
      throw new Error(`MockPdfViewer: PDF file not found: ${resolved}`);
    }

    const buffer = fs.readFileSync(resolved);
    const result = await pdfParse(buffer);
    return result.text;
  }

  /**
   * Reads a PDF buffer directly (useful when bytes come from a network response
   * rather than the local filesystem — mirrors PdfValidator.captureAndValidate).
   */
  static async extractTextFromBuffer(buffer: Buffer): Promise<string> {
    const result = await pdfParse(buffer);
    return result.text;
  }

  // ── Template rendering ────────────────────────────────────────────────────

  /**
   * Extracts text from the CLIENT TEMPLATE PDF (which contains {{variables}}),
   * then substitutes each variable with the corresponding UI value.
   *
   * Returns:
   *   - renderedText  — template text with values filled in (what the preview PDF should say)
   *   - templateText  — raw extracted template PDF text (before substitution)
   *   - unresolved    — variables in the template that had no supplied value
   *   - unused        — values supplied that appeared in no template variable
   */
  static async renderFromPdf(templatePdfPath: string, values: TemplateValues): Promise<RenderResult> {
    const templateText = await this.extractText(templatePdfPath);
    return this.renderText(templateText, values);
  }

  /**
   * Substitutes {{variables}} in any string (not necessarily from a PDF).
   * Factored out so the same logic works on raw text or extracted PDF text.
   */
  static renderText(templateText: string, values: TemplateValues): RenderResult {
    const templateVars = this.extractVariables(templateText);
    const valuesLower  = this.lowerKeys(values);
    const unresolved: string[] = [];
    const usedKeys = new Set<string>();

    let renderedText = templateText;

    for (const varName of templateVars) {
      const key   = varName.toLowerCase().trim();
      const value = valuesLower[key];

      if (value !== undefined && value !== '') {
        const regex = new RegExp(`\\{\\{\\s*${this.escapeRegex(varName)}\\s*\\}\\}`, 'gi');
        renderedText = renderedText.replace(regex, value);
        usedKeys.add(key);
      } else {
        unresolved.push(varName);
      }
    }

    const unused = Object.keys(values).filter(k => !usedKeys.has(k.toLowerCase().trim()));

    return { renderedText, templateText, unresolved, unused };
  }

  // ── Variable inspection ───────────────────────────────────────────────────

  /**
   * Returns all unique {{Variable}} names found in a string, in order.
   */
  static extractVariables(text: string): string[] {
    const regex   = /\{\{\s*(.+?)\s*\}\}/g;
    const seen    = new Set<string>();
    const ordered: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const name = match[1].trim();
      if (!seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        ordered.push(name);
      }
    }

    return ordered;
  }

  /**
   * Extracts all {{Variable}} names from a template PDF file.
   */
  static async extractVariablesFromPdf(pdfPath: string): Promise<string[]> {
    const text = await this.extractText(pdfPath);
    return this.extractVariables(text);
  }

  /**
   * Lists all PDF files in a directory (template or preview folder).
   */
  static listPdfs(dir: string): string[] {
    const resolved = path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);
    if (!fs.existsSync(resolved)) return [];
    return fs.readdirSync(resolved)
      .filter(f => f.toLowerCase().endsWith('.pdf'))
      .map(f => path.join(resolved, f));
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private static lowerKeys(values: TemplateValues): TemplateValues {
    return Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k.toLowerCase().trim(), v]),
    );
  }

  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
