
/**
 * PdfComparisonReporter.ts
 *
 * Generates:
 * 1. Field-by-field PDF comparison
 * 2. Line-by-line PDF text comparison
 * 3. MockPdfValidator check summary
 * 4. Unresolved placeholder details
 * 5. Side-by-side PDF preview
 * 6. Standalone HTML report
 * 7. JSON comparison results
 */

import * as fs from 'fs';
import * as path from 'path';
import { MockCompareResult } from './MockPdfValidator';

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface PdfComparisonReportOptions {
  templatePath: string;
  previewPath: string;

  expectedText: string;
  actualText: string;

  expectedFields: Record<string, string>;

  validationResult: MockCompareResult;

  testName: string;
  outputPath: string;
}

export interface FieldComparisonResult {
  field: string;
  expected: string;
  actual: string;
  status: 'MATCH' | 'MISMATCH' | 'NOT_FOUND';
}

export interface LineComparisonResult {
  lineNumber: number;
  expected: string;
  actual: string;
  status: 'MATCH' | 'ADDED' | 'REMOVED' | 'CHANGED';
}

export interface ComparisonSummary {
  totalFields: number;
  matchedFields: number;
  mismatchedFields: number;
  missingFields: number;

  totalLines: number;
  matchedLines: number;
  changedLines: number;
  addedLines: number;
  removedLines: number;

  validationPassed: number;
  validationFailed: number;

  overallPassed: boolean;
}

export interface PdfComparisonReportData {
  testName: string;
  generatedAt: string;

  summary: ComparisonSummary;

  fields: FieldComparisonResult[];
  lines: LineComparisonResult[];

  validationResult: MockCompareResult;

  templatePdf: string;
  previewPdf: string;
}

// -----------------------------------------------------------------------------
// REPORTER
// -----------------------------------------------------------------------------

export class PdfComparisonReporter {

  /**
   * Main method.
   *
   * Generates comparison-report.html and comparison.json.
   * outputPath is treated as a directory.
   */
  static async generate(
    options: PdfComparisonReportOptions
  ): Promise<string> {

    const {
      templatePath,
      previewPath,
      expectedText,
      actualText,
      expectedFields,
      validationResult,
      testName,
      outputPath,
    } = options;

    // Resolve paths
    const resolvedTemplate = path.resolve(templatePath);
    const resolvedPreview = path.resolve(previewPath);
    const resolvedOutput = path.resolve(outputPath);

    // Validate source PDFs
    if (!fs.existsSync(resolvedTemplate)) {
      throw new Error(`Template PDF not found: ${resolvedTemplate}`);
    }

    if (!fs.existsSync(resolvedPreview)) {
      throw new Error(`Preview PDF not found: ${resolvedPreview}`);
    }

    // Create output directories
    const assetsDirectory = path.join(resolvedOutput, 'assets');

    await fs.promises.mkdir(assetsDirectory, {
      recursive: true,
    });

    // Copy PDFs into report assets
    const templateAsset = path.join(assetsDirectory, 'template.pdf');
    const previewAsset = path.join(assetsDirectory, 'preview.pdf');

    await Promise.all([
      fs.promises.copyFile(resolvedTemplate, templateAsset),
      fs.promises.copyFile(resolvedPreview, previewAsset),
    ]);

    // Perform comparisons
    const fields = this.compareFields(
      expectedFields,
      actualText
    );

    const lines = this.compareLines(
      expectedText,
      actualText
    );

    // Build summary
    const summary = this.generateSummary(
      validationResult,
      fields,
      lines
    );

    // Build report data
    const reportData: PdfComparisonReportData = {
      testName,
      generatedAt: new Date().toISOString(),

      summary,
      fields,
      lines,

      validationResult,

      templatePdf: 'assets/template.pdf',
      previewPdf: 'assets/preview.pdf',
    };

    // Generate HTML
    const html = this.generateHtml(reportData);

    const htmlPath = path.join(
      resolvedOutput,
      'comparison-report.html'
    );

    const jsonPath = path.join(
      resolvedOutput,
      'comparison.json'
    );

    // Save HTML and JSON
    await Promise.all([
      fs.promises.writeFile(htmlPath, html, 'utf-8'),

      fs.promises.writeFile(
        jsonPath,
        JSON.stringify(reportData, null, 2),
        'utf-8'
      ),
    ]);

    console.log(`PDF comparison report generated: ${htmlPath}`);
    console.log(`PDF comparison JSON generated: ${jsonPath}`);

    return htmlPath;
  }

  // ---------------------------------------------------------------------------
  // FIELD COMPARISON
  // ---------------------------------------------------------------------------

  /**
   * Finds the actual value associated with each expected field label.
   *
   * Supports common formats:
   * Label: Value
   * Label - Value
   * Label    Value
   *
   * If the label has no value on the same line, checks the next non-empty line.
   */
  private static compareFields(
    expectedFields: Record<string, string>,
    actualText: string
  ): FieldComparisonResult[] {

    const actualLines = actualText
      .split(/\r?\n/)
      .map(line => line.trim());

    return Object.entries(expectedFields).map(
      ([field, expectedValue]) => {

        const actualValue = this.extractFieldValue(
          field,
          actualLines
        );

        if (actualValue === null) {
          return {
            field,
            expected: expectedValue,
            actual: '',
            status: 'NOT_FOUND',
          };
        }

        const matches =
          this.normalize(actualValue) ===
          this.normalize(expectedValue);

        return {
          field,
          expected: expectedValue,
          actual: actualValue,
          status: matches ? 'MATCH' : 'MISMATCH',
        };
      }
    );
  }

  /**
   * Extracts a value associated with a field label.
   */
  private static extractFieldValue(
    field: string,
    lines: string[]
  ): string | null {

    const normalizedField = this.normalize(field);

    for (let i = 0; i < lines.length; i++) {

      const line = lines[i];

      if (!this.normalize(line).includes(normalizedField)) {
        continue;
      }

      // Remove the field label from the line.
      const escapedField = field.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );

      const labelRegex = new RegExp(
        escapedField,
        'i'
      );

      const fieldPosition = line.search(labelRegex);

      if (fieldPosition === -1) {
        continue;
      }

      const remaining = line
        .substring(fieldPosition + field.length)
        .replace(/^[\s:：=\-–—]+/, '')
        .trim();

      if (remaining) {
        return remaining;
      }

      // If value is on the next line, use the next non-empty line.
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim()) {
          return lines[j].trim();
        }
      }

      return null;
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // LINE COMPARISON
  // ---------------------------------------------------------------------------

  /**
   * Compares expected and actual lines using an LCS-based diff.
   *
   * Identifies:
   * MATCH   - Same line
   * ADDED   - Line exists only in actual PDF
   * REMOVED - Line exists only in expected content
   * CHANGED - A removed line followed by an added line
   */
  private static compareLines(
    expectedText: string,
    actualText: string
  ): LineComparisonResult[] {

    const expected = expectedText
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

    const actual = actualText
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

    const n = expected.length;
    const m = actual.length;

    // Avoid excessive memory consumption for unusually large PDFs.
    if (n * m > 1_000_000) {
      return this.compareLinesFallback(expected, actual);
    }

    const dp: number[][] = Array.from(
      { length: n + 1 },
      () => Array(m + 1).fill(0)
    );

    // Build LCS matrix
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {

        if (this.normalize(expected[i]) === this.normalize(actual[j])) {
          dp[i][j] = 1 + dp[i + 1][j + 1];
        } else {
          dp[i][j] = Math.max(
            dp[i + 1][j],
            dp[i][j + 1]
          );
        }
      }
    }

    const operations: Array<{
      type: 'MATCH' | 'ADDED' | 'REMOVED';
      expected?: string;
      actual?: string;
    }> = [];

    let i = 0;
    let j = 0;

    while (i < n && j < m) {

      if (
        this.normalize(expected[i]) ===
        this.normalize(actual[j])
      ) {
        operations.push({
          type: 'MATCH',
          expected: expected[i],
          actual: actual[j],
        });

        i++;
        j++;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) {

        operations.push({
          type: 'REMOVED',
          expected: expected[i],
        });

        i++;
      } else {

        operations.push({
          type: 'ADDED',
          actual: actual[j],
        });

        j++;
      }
    }

    while (i < n) {
      operations.push({
        type: 'REMOVED',
        expected: expected[i++],
      });
    }

    while (j < m) {
      operations.push({
        type: 'ADDED',
        actual: actual[j++],
      });
    }

    // Pair adjacent removed/added lines as changed lines.
    const results: LineComparisonResult[] = [];

    for (let k = 0; k < operations.length; k++) {

      const current = operations[k];
      const next = operations[k + 1];

      if (
        current.type === 'REMOVED' &&
        next?.type === 'ADDED'
      ) {
        results.push({
          lineNumber: results.length + 1,
          expected: current.expected ?? '',
          actual: next.actual ?? '',
          status: 'CHANGED',
        });

        k++;
        continue;
      }

      results.push({
        lineNumber: results.length + 1,
        expected: current.expected ?? '',
        actual: current.actual ?? '',
        status: current.type,
      });
    }

    return results;
  }

  /**
   * Fallback for very large documents.
   * Uses positional comparison to avoid allocating a large LCS matrix.
   */
  private static compareLinesFallback(
    expected: string[],
    actual: string[]
  ): LineComparisonResult[] {

    const max = Math.max(expected.length, actual.length);
    const results: LineComparisonResult[] = [];

    for (let i = 0; i < max; i++) {

      const expectedLine = expected[i];
      const actualLine = actual[i];

      let status: LineComparisonResult['status'];

      if (expectedLine === undefined) {
        status = 'ADDED';
      } else if (actualLine === undefined) {
        status = 'REMOVED';
      } else if (
        this.normalize(expectedLine) ===
        this.normalize(actualLine)
      ) {
        status = 'MATCH';
      } else {
        status = 'CHANGED';
      }

      results.push({
        lineNumber: i + 1,
        expected: expectedLine ?? '',
        actual: actualLine ?? '',
        status,
      });
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------

  private static generateSummary(
    validationResult: MockCompareResult,
    fields: FieldComparisonResult[],
    lines: LineComparisonResult[]
  ): ComparisonSummary {

    const matchedFields = fields.filter(
      item => item.status === 'MATCH'
    ).length;

    const mismatchedFields = fields.filter(
      item => item.status === 'MISMATCH'
    ).length;

    const missingFields = fields.filter(
      item => item.status === 'NOT_FOUND'
    ).length;

    const matchedLines = lines.filter(
      item => item.status === 'MATCH'
    ).length;

    const changedLines = lines.filter(
      item => item.status === 'CHANGED'
    ).length;

    const addedLines = lines.filter(
      item => item.status === 'ADDED'
    ).length;

    const removedLines = lines.filter(
      item => item.status === 'REMOVED'
    ).length;

    const validationPassed = validationResult.checks.filter(
      check => check.found
    ).length;

    const validationFailed = validationResult.checks.filter(
      check => !check.found
    ).length;

    const overallPassed =
      validationResult.passed &&
      mismatchedFields === 0 &&
      missingFields === 0 &&
      changedLines === 0 &&
      addedLines === 0 &&
      removedLines === 0;

    return {
      totalFields: fields.length,
      matchedFields,
      mismatchedFields,
      missingFields,

      totalLines: lines.length,
      matchedLines,
      changedLines,
      addedLines,
      removedLines,

      validationPassed,
      validationFailed,

      overallPassed,
    };
  }

  // ---------------------------------------------------------------------------
  // HTML GENERATION
  // ---------------------------------------------------------------------------

  private static generateHtml(
    data: PdfComparisonReportData
  ): string {

    const { summary } = data;

    const statusClass = (status: string): string => {
      switch (status) {
        case 'MATCH':
          return 'pass';

        case 'MISMATCH':
        case 'NOT_FOUND':
        case 'CHANGED':
        case 'REMOVED':
          return 'fail';

        case 'ADDED':
          return 'added';

        default:
          return '';
      }
    };

    const fieldRows = data.fields.map(field => `
      <tr>
        <td>${this.escapeHtml(field.field)}</td>
        <td>${this.escapeHtml(field.expected)}</td>
        <td>${this.escapeHtml(field.actual || 'Not found')}</td>
        <td>
          <span class="status ${statusClass(field.status)}">
            ${field.status}
          </span>
        </td>
      </tr>
    `).join('');

    const lineRows = data.lines.map(line => `
      <tr>
        <td>${line.lineNumber}</td>
        <td class="expected">${this.escapeHtml(line.expected)}</td>
        <td class="actual">${this.escapeHtml(line.actual)}</td>
        <td>
          <span class="status ${statusClass(line.status)}">
            ${line.status}
          </span>
        </td>
      </tr>
    `).join('');

    const validationRows = data.validationResult.checks.map(check => `
      <tr>
        <td>${this.escapeHtml(check.checkType)}</td>
        <td>${this.escapeHtml(check.label)}</td>
        <td>${this.escapeHtml(check.expected)}</td>
        <td>
          <span class="status ${check.found ? 'pass' : 'fail'}">
            ${check.found ? 'PASS' : 'FAIL'}
          </span>
        </td>
        <td>${this.escapeHtml(check.detail ?? '')}</td>
      </tr>
    `).join('');

    const unresolvedRows = data.validationResult.unresolvedVars.length
      ? data.validationResult.unresolvedVars.map(variable => `
          <li>{{${this.escapeHtml(variable)}}}</li>
        `).join('')
      : '<li>None</li>';

    const resultClass = summary.overallPassed ? 'pass' : 'fail';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>PDF Comparison Report</title>

<style>
  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    padding: 24px;
    font-family: Arial, Helvetica, sans-serif;
    background: #f4f6f9;
    color: #202938;
  }

  .container {
    max-width: 1500px;
    margin: auto;
  }

  h1, h2 {
    margin-top: 0;
  }

  h2 {
    margin-top: 32px;
    font-size: 20px;
  }

  .header, .panel {
    background: white;
    border-radius: 10px;
    padding: 22px;
    margin-bottom: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,.05);
  }

  .meta {
    color: #667085;
    font-size: 13px;
    margin-top: 8px;
  }

  .result {
    display: inline-block;
    padding: 8px 14px;
    border-radius: 6px;
    font-weight: bold;
    margin-top: 12px;
  }

  .pass {
    color: #137333;
    background: #e6f4ea;
  }

  .fail {
    color: #b42318;
    background: #fee4e2;
  }

  .added {
    color: #175cd3;
    background: #dbeafe;
  }

  .metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
    margin-bottom: 20px;
  }

  .metric {
    background: white;
    padding: 18px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,.04);
  }

  .metric strong {
    display: block;
    font-size: 25px;
    margin-bottom: 6px;
  }

  .metric span {
    color: #667085;
    font-size: 13px;
  }

  .pdf-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .pdf-viewer {
    border: 1px solid #e4e7ec;
    border-radius: 8px;
    overflow: hidden;
  }

  .pdf-viewer h3 {
    padding: 12px;
    margin: 0;
    background: #f9fafb;
    font-size: 14px;
  }

  iframe {
    display: block;
    width: 100%;
    height: 650px;
    border: 0;
  }

  .table-wrapper {
    overflow-x: auto;
    background: white;
    border-radius: 8px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  th, td {
    padding: 11px 12px;
    text-align: left;
    border-bottom: 1px solid #eaecf0;
    vertical-align: top;
  }

  th {
    background: #f9fafb;
    font-weight: 600;
  }

  td {
    overflow-wrap: anywhere;
  }

  .status {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 5px;
    font-size: 11px;
    font-weight: bold;
    white-space: nowrap;
  }

  .expected {
    color: #b42318;
  }

  .actual {
    color: #137333;
  }

  .unresolved {
    color: #b42318;
  }

  .footer {
    text-align: center;
    color: #667085;
    font-size: 12px;
    margin: 24px 0;
  }

  @media(max-width: 800px) {
    body {
      padding: 12px;
    }

    .pdf-grid {
      grid-template-columns: 1fr;
    }

    iframe {
      height: 500px;
    }
  }

  @media print {
    body {
      background: white;
      padding: 0;
    }

    .panel, .header, .metric {
      box-shadow: none;
      border: 1px solid #ddd;
    }
  }
</style>
</head>

<body>
<div class="container">

  <div class="header">
    <h1>PDF Comparison Report</h1>

    <div class="meta">
      Test: ${this.escapeHtml(data.testName)}
    </div>

    <div class="meta">
      Generated: ${this.escapeHtml(data.generatedAt)}
    </div>

    <div class="result ${resultClass}">
      ${summary.overallPassed ? 'OVERALL PASSED' : 'OVERALL FAILED'}
    </div>
  </div>

  <div class="metrics">
    <div class="metric">
      <strong>${summary.validationPassed}</strong>
      <span>Validation checks passed</span>
    </div>

    <div class="metric">
      <strong>${summary.validationFailed}</strong>
      <span>Validation checks failed</span>
    </div>

    <div class="metric">
      <strong>${summary.matchedFields}</strong>
      <span>Fields matched</span>
    </div>

    <div class="metric">
      <strong>${summary.mismatchedFields + summary.missingFields}</strong>
      <span>Field issues</span>
    </div>

    <div class="metric">
      <strong>${summary.matchedLines}</strong>
      <span>Lines matched</span>
    </div>

    <div class="metric">
      <strong>${summary.changedLines + summary.addedLines + summary.removedLines}</strong>
      <span>Line differences</span>
    </div>
  </div>

  <div class="panel">
    <h2>1. PDF Preview</h2>

    <div class="pdf-grid">
      <div class="pdf-viewer">
        <h3>Client Template PDF</h3>
        <iframe src="${data.templatePdf}" title="Template PDF"></iframe>
      </div>

      <div class="pdf-viewer">
        <h3>Preview PDF</h3>
        <iframe src="${data.previewPdf}" title="Preview PDF"></iframe>
      </div>
    </div>

    <p class="meta">
      If your browser does not display embedded PDFs,
      open the corresponding PDF files from the assets folder.
    </p>
  </div>

  <div class="panel">
    <h2>2. Field-by-Field Comparison</h2>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Expected Value</th>
            <th>Actual Value</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          ${fieldRows || '<tr><td colspan="4">No fields supplied</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>

  <div class="panel">
    <h2>3. Line-by-Line Comparison</h2>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Line</th>
            <th>Expected Text</th>
            <th>Actual Text</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          ${lineRows || '<tr><td colspan="4">No lines available</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>

  <div class="panel">
    <h2>4. Mock PDF Validation Checks</h2>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Check Type</th>
            <th>Description</th>
            <th>Expected</th>
            <th>Status</th>
            <th>Details</th>
          </tr>
        </thead>

        <tbody>
          ${validationRows || '<tr><td colspan="5">No validation checks</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>

  <div class="panel">
    <h2>5. Unresolved Template Variables</h2>

    <ul class="unresolved">
      ${unresolvedRows}
    </ul>
  </div>

  <div class="footer">
    Generated by Playwright PDF Comparison Framework
  </div>

</div>
</body>
</html>`;
  }

  // ---------------------------------------------------------------------------
  // UTILITIES
  // ---------------------------------------------------------------------------

  private static normalize(value: string): string {
    return value
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private static escapeHtml(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
