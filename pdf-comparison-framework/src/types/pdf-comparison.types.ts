/**
 * pdf-comparison.types.ts
 *
 * Shared types for the mock PDF comparison pipeline.
 * Used by MockPdfViewer, MockPdfValidator and PdfComparisonReporter.
 */

/** Variable name → live UI value (e.g. { 'Named Insured': 'Acme Corp' }) */
export type TemplateValues = Record<string, string>;

/** Result of rendering a template PDF with supplied values */
export interface RenderResult {
  /** Template text with every {{variable}} replaced by its value */
  renderedText: string;
  /** Variable names present in the template that had no supplied value */
  unresolved:   string[];
}
