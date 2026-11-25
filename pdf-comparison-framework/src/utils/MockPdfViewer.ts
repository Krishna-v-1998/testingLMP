/**
 * MockPdfViewer.ts
 *
 * Extracts text from PDF files and renders {{Variable}} placeholders.
 * Handles multi-page PDFs automatically (pdf-parse concatenates all pages).
 *
 * ── TWO PDFs IN THE MOCK FLOW ────────────────────────────────────────────────
 *
 *   Client Template PDF                       Preview PDF
 *   test-data/mock-pdfs/template/<N>.pdf       test-data/mock-pdfs/preview/<N>.pdf
 *   ─────────────────────────────────          ──────────────────────────────────
 *   "Policy for {{Named Insured}}"        →    "Policy for Acme Construction LLC"
 *   "Effective {{Effective Date}}"             "Effective 01/01/2025"
 *
 *   renderFromPdf()  → extract template text → substitute {{variables}}
 *   extractText()    → extract any PDF text (template or preview)
 *
 * ── MULTI-PAGE PDFs ──────────────────────────────────────────────────────────
 *
 *   pdf-parse concatenates text from all pages automatically.
 *   No special handling is needed here.
 *
 * ── REAL VIEWER (next sprint) ────────────────────────────────────────────────
 *
 *   When the in-app viewer ships, FormsPage switches to PdfValidator which
 *   fetches the new-tab PDF bytes directly — USE_MOCK_PDF=false to enable.
 *
 * ── DEPENDENCY ───────────────────────────────────────────────────────────────
 *
 *   npm install --save-dev pdf-parse @types/pdf-parse
 */

import fs   from 'fs';
import path from 'path';
import type { RenderResult, TemplateValues } from '../types/pdf-comparison.types';

// pdf-parse is a CJS module (module.exports = fn) — require() is the only
// reliable way to get the callable function at runtime across all tsconfig setups.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (buf: Buffer) => Promise<{ text: string; numpages: number }> = require('pdf-parse');

// ── MockPdfViewer ─────────────────────────────────────────────────────────────

export class MockPdfViewer {

  // ── Text extraction ───────────────────────────────────────────────────────

  /**
   * Reads a PDF file from disk and returns its full text across all pages.
   * Throws if the file does not exist.
   */
  static async extractText(pdfPath: string): Promise<string> {
    const resolved = path.isAbsolute(pdfPath)
      ? pdfPath
      : path.resolve(process.cwd(), pdfPath);

    if (!fs.existsSync(resolved)) {
      throw new Error(`MockPdfViewer: PDF file not found: ${resolved}`);
    }

    const buffer = await fs.promises.readFile(resolved);
    const result = await pdfParse(buffer);
    return result.text;
  }

  /**
   * Extracts text from a Buffer (useful when bytes come from a network response).
   */
  static async extractTextFromBuffer(buffer: Buffer): Promise<string> {
    const result = await pdfParse(buffer);
    return result.text;
  }

  // ── Template rendering ────────────────────────────────────────────────────

  /**
   * Extracts text from the CLIENT TEMPLATE PDF (which contains {{variables}}),
   * then substitutes each variable with the corresponding UI value.
   */
  static async renderFromPdf(templatePdfPath: string, values: TemplateValues): Promise<RenderResult> {
    const templateText = await this.extractText(templatePdfPath);
    return this.renderText(templateText, values);
  }

  /**
   * Substitutes {{variables}} in any string.
   * Variable names are matched case-insensitively.
   */
  static renderText(templateText: string, values: TemplateValues): RenderResult {
    const lowerValues = this.lowerKeys(values);
    const unresolved: string[] = [];
    const usedKeys   = new Set<string>();

    // Find all unique {{variables}} in the template
    const templateVars = this.extractVariables(templateText);

    let renderedText = templateText;

    for (const varName of templateVars) {
      const key   = varName.toLowerCase().trim();
      const value = lowerValues[key];

      if (value !== undefined && value !== '') {
        const regex = new RegExp(`\\{\\{\\s*${this.escapeRegExp(varName)}\\s*\\}\\}`, 'gi');
        renderedText = renderedText.replace(regex, value);
        usedKeys.add(key);
      } else {
        unresolved.push(varName);
      }
    }

    return { renderedText, unresolved };
  }

  // ── Variable inspection ───────────────────────────────────────────────────

  /**
   * Returns all unique {{Variable}} names found in a string, preserving order.
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
      .sort()
      .map(f => path.join(resolved, f));
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private static lowerKeys(values: TemplateValues): TemplateValues {
    return Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k.toLowerCase().trim(), v]),
    );
  }

  private static escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
