/**
 * MockPdfViewer.ts
 *
 * Simulates what the real PDF viewer will do once it ships next sprint:
 * it takes a client-supplied template (plain text with {{Variable}} placeholders)
 * and substitutes each placeholder with the corresponding live UI value,
 * producing the "rendered PDF" text that the real viewer would display.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────────
 *
 *   The real in-app PDF viewer is not yet available. This mock lets us:
 *     1. Write + run MockPdfValidator tests now.
 *     2. Keep the full validation pipeline exercised (template loading,
 *        variable substitution, text comparison) so wiring up the real viewer
 *        later is a one-line swap, not a rewrite.
 *
 * ── PLACEHOLDER FORMAT ───────────────────────────────────────────────────────
 *
 *   Templates use  {{Variable Name}}  (double curly braces, any whitespace
 *   inside the name is preserved, matching is case-insensitive).
 *
 *   Example template line:
 *     "This policy is issued to {{Named Insured}} effective {{Effective Date}}."
 *
 *   With values { "Named Insured": "Acme Corp", "Effective Date": "01/01/2025" }
 *   renders as:
 *     "This policy is issued to Acme Corp effective 01/01/2025."
 *
 * ── USAGE ─────────────────────────────────────────────────────────────────────
 *
 *   // Load a template from disk and render it with live values
 *   const rendered = MockPdfViewer.renderFile(
 *     'test-data/mock-templates/BR-001.txt',
 *     { 'Named Insured': 'Acme Corp', 'Policy Number': 'BR-2025-001234', ... }
 *   );
 *
 *   // Or render a template string directly
 *   const rendered = MockPdfViewer.render(templateText, valuesMap);
 *
 *   // Inspect which variables are present in a template
 *   const vars = MockPdfViewer.extractVariables(templateText);
 *   // → ['Named Insured', 'Policy Number', 'Effective Date', ...]
 */

import * as fs   from 'fs';
import * as path from 'path';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Map of  variableName → value  as it would appear in the rendered PDF */
export type TemplateValues = Record<string, string>;

export interface RenderResult {
  /** The rendered text (template with all variables substituted) */
  renderedText: string;
  /** Variables found in the template that had no matching value supplied */
  unresolved: string[];
  /** Variables supplied that did not appear in the template */
  unused: string[];
}

// ── MockPdfViewer ─────────────────────────────────────────────────────────────

export class MockPdfViewer {

  // ── Core render methods ───────────────────────────────────────────────────

  /**
   * Renders a template string by substituting all  {{Variable}}  placeholders
   * with the corresponding values from `values`.
   *
   * - Matching is case-insensitive (template key and values key are both lowercased).
   * - Unresolved variables are left as-is so assertions can catch them clearly.
   * - Returns a RenderResult with diagnostics about unresolved / unused variables.
   */
  static render(template: string, values: TemplateValues): RenderResult {
    const templateVars  = this.extractVariables(template);
    const valuesLower   = this.lowerKeys(values);
    const unresolved: string[] = [];
    const usedKeys     = new Set<string>();

    let rendered = template;

    for (const varName of templateVars) {
      const key   = varName.toLowerCase().trim();
      const value = valuesLower[key];

      if (value !== undefined && value !== '') {
        // Replace ALL occurrences of this variable in the template
        const regex = new RegExp(`\\{\\{\\s*${this.escapeRegex(varName)}\\s*\\}\\}`, 'gi');
        rendered    = rendered.replace(regex, value);
        usedKeys.add(key);
      } else {
        unresolved.push(varName);
      }
    }

    // Variables supplied but not found in template
    const unused = Object.keys(values).filter(k => !usedKeys.has(k.toLowerCase().trim()));

    return { renderedText: rendered, unresolved, unused };
  }

  /**
   * Reads a template file from disk and renders it.
   *
   * @param templatePath  Absolute path, or relative to process.cwd()
   * @param values        Variable → value map
   */
  static renderFile(templatePath: string, values: TemplateValues): RenderResult {
    const resolved = path.isAbsolute(templatePath)
      ? templatePath
      : path.resolve(process.cwd(), templatePath);

    if (!fs.existsSync(resolved)) {
      throw new Error(`MockPdfViewer: template file not found: ${resolved}`);
    }

    const template = fs.readFileSync(resolved, 'utf8');
    return this.render(template, values);
  }

  // ── Template inspection ───────────────────────────────────────────────────

  /**
   * Returns all unique variable names found in a template string,
   * in the order they first appear.
   *
   * Example: "Hello {{Named Insured}}, policy {{Policy Number}}"
   *          → ['Named Insured', 'Policy Number']
   */
  static extractVariables(template: string): string[] {
    const regex   = /\{\{\s*(.+?)\s*\}\}/g;
    const seen    = new Set<string>();
    const ordered: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(template)) !== null) {
      const name = match[1].trim();
      if (!seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        ordered.push(name);
      }
    }

    return ordered;
  }

  /**
   * Lists all  {{Variable}}  names from a template file on disk.
   */
  static extractVariablesFromFile(templatePath: string): string[] {
    const resolved = path.isAbsolute(templatePath)
      ? templatePath
      : path.resolve(process.cwd(), templatePath);

    const template = fs.readFileSync(resolved, 'utf8');
    return this.extractVariables(template);
  }

  /**
   * Lists all mock template files found in a directory.
   * Returns absolute paths, filtered to `.txt` files.
   */
  static listTemplates(dir: string): string[] {
    const resolved = path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);
    if (!fs.existsSync(resolved)) return [];
    return fs.readdirSync(resolved)
      .filter(f => f.endsWith('.txt'))
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
