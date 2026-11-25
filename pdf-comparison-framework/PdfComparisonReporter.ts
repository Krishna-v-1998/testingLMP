/**
 * PdfComparisonReporter.ts
 *
 * Generates a standalone HTML comparison report for one or many PDF form pairs.
 *
 * ── TWO MODES ────────────────────────────────────────────────────────────────
 *
 *   Single form:
 *     const html = await PdfComparisonReporter.generate({ ... });
 *
 *   Multi-form run (10, 20, 30 forms — all in one report):
 *     const html = await PdfComparisonReporter.generateMultiForm({
 *       runName: 'Quote Forms — 2026-11-24',
 *       forms:   [{ formEntry, templatePath, previewPath, result }, ...],
 *       outputPath: 'test-results/pdf-comparison',
 *     });
 *
 * ── REPORT STRUCTURE ─────────────────────────────────────────────────────────
 *
 *   • Run summary bar — overall pass/fail, total forms, timestamp
 *   • Form index table — one clickable row per form with status badge
 *   • Per-form sections (collapsible):
 *       1. Side-by-side PDF iframes (template {{vars}} vs preview with values)
 *       2. Field-by-field table (expected Test Data → actual in preview)
 *       3. Required statements check
 *       4. Validation checks detail (value_in_preview, phrase_in_preview, etc.)
 *       5. Unresolved template variables
 *
 * ── ALL DATA FROM EXCEL ───────────────────────────────────────────────────────
 *
 *   expectedFields comes from ExcelFixtureReader.buildValuesMap(form):
 *     { [pdfVariable]: testData }
 *   No values are hardcoded in this reporter.
 */

import * as fs   from 'fs';
import * as path from 'path';
import type { MockCompareResult } from './MockPdfValidator';
import type { FixtureFormEntry } from '../helpers/ExcelFixtureReader';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SingleFormReportOptions {
  templatePath:     string;
  previewPath:      string;
  /** fieldLabel / pdfVariable → expected test-data value */
  expectedFields:   Record<string, string>;
  validationResult: MockCompareResult;
  testName:         string;
  outputPath:       string;
}

export interface FormComparisonEntry {
  /** Fixture form entry — provides form name, fields, statements */
  formEntry:    FixtureFormEntry;
  /** Absolute path to the template PDF (with {{variables}}) */
  templatePath: string;
  /** Absolute path to the preview PDF (values substituted) */
  previewPath:  string;
  /** Result from MockPdfValidator.comparePdfs() */
  result:       MockCompareResult;
  /** PDF variable → expected test-data value (from ExcelFixtureReader.buildValuesMap) */
  expectedFields: Record<string, string>;
}

export interface MultiFormReportOptions {
  /** Human-readable run name shown at the top of the report */
  runName:    string;
  /** One entry per form compared during this run */
  forms:      FormComparisonEntry[];
  /** Directory where comparison-report.html and assets are written */
  outputPath: string;
}

// Legacy single-form types (kept for backward compatibility)
export interface FieldComparisonResult {
  field:    string;
  expected: string;
  actual:   string;
  status:   'MATCH' | 'MISMATCH' | 'NOT_FOUND';
}

export interface LineComparisonResult {
  lineNumber: number;
  expected:   string;
  actual:     string;
  status:     'MATCH' | 'ADDED' | 'REMOVED' | 'CHANGED';
}

export interface ComparisonSummary {
  totalForms:        number;
  passedForms:       number;
  failedForms:       number;
  totalChecks:       number;
  passedChecks:      number;
  failedChecks:      number;
  totalFields:       number;
  matchedFields:     number;
  mismatchedFields:  number;
  missingFields:     number;
  overallPassed:     boolean;
}

// ── PdfComparisonReporter ─────────────────────────────────────────────────────

export class PdfComparisonReporter {

  // ── Multi-form report (primary API) ───────────────────────────────────────

  /**
   * Generates a single comparison-report.html covering all forms in the run.
   * Returns the absolute path of the generated HTML file.
   *
   * Layout: summary bar → form index → collapsible per-form detail sections.
   * All form PDFs are copied to assets/<unqorkFormNumber>/{template,preview}.pdf
   * so the report is self-contained.
   */
  static async generateMultiForm(options: MultiFormReportOptions): Promise<string> {
    const { runName, forms, outputPath } = options;
    const resolvedOutput = path.resolve(outputPath);
    const assetsDir      = path.join(resolvedOutput, 'assets');
    await fs.promises.mkdir(assetsDir, { recursive: true });

    // Copy PDFs for each form into the assets directory
    const pdfRefs: Array<{ templateRef: string; previewRef: string }> = [];
    for (const entry of forms) {
      const formDir = path.join(assetsDir, entry.formEntry.unqorkFormNumber);
      await fs.promises.mkdir(formDir, { recursive: true });

      const tDest = path.join(formDir, 'template.pdf');
      const pDest = path.join(formDir, 'preview.pdf');

      if (fs.existsSync(entry.templatePath)) await fs.promises.copyFile(entry.templatePath, tDest);
      if (fs.existsSync(entry.previewPath))  await fs.promises.copyFile(entry.previewPath,  pDest);

      pdfRefs.push({
        templateRef: `assets/${entry.formEntry.unqorkFormNumber}/template.pdf`,
        previewRef:  `assets/${entry.formEntry.unqorkFormNumber}/preview.pdf`,
      });
    }

    const html     = this.buildMultiFormHtml(runName, forms, pdfRefs);
    const htmlPath = path.join(resolvedOutput, 'comparison-report.html');

    await fs.promises.writeFile(htmlPath, html, 'utf-8');
    console.log(`\n📄 PDF Comparison Report: ${htmlPath}`);
    return htmlPath;
  }

  // ── Single-form report (legacy / test-level use) ──────────────────────────

  /**
   * Generates comparison-report.html for a single form pair.
   * Returns the absolute path of the generated HTML file.
   */
  static async generate(options: SingleFormReportOptions): Promise<string> {
    const { templatePath, previewPath, expectedFields, validationResult, testName, outputPath } = options;

    const resolvedOutput = path.resolve(outputPath);
    const assetsDir      = path.join(resolvedOutput, 'assets');
    await fs.promises.mkdir(assetsDir, { recursive: true });

    if (fs.existsSync(path.resolve(templatePath)))
      await fs.promises.copyFile(path.resolve(templatePath), path.join(assetsDir, 'template.pdf'));
    if (fs.existsSync(path.resolve(previewPath)))
      await fs.promises.copyFile(path.resolve(previewPath), path.join(assetsDir, 'preview.pdf'));

    const fields  = this.compareFields(expectedFields, validationResult.previewText);
    const lines   = this.compareLines(validationResult.renderedText, validationResult.previewText);
    const summary = this.buildSingleSummary(validationResult, fields);

    const html     = this.buildSingleFormHtml(testName, summary, fields, lines, validationResult,
                                               'assets/template.pdf', 'assets/preview.pdf');
    const htmlPath = path.join(resolvedOutput, 'comparison-report.html');
    await fs.promises.writeFile(htmlPath, html, 'utf-8');
    console.log(`📄 PDF Comparison Report: ${htmlPath}`);
    return htmlPath;
  }

  // ── Multi-form HTML builder ────────────────────────────────────────────────

  private static buildMultiFormHtml(
    runName: string,
    forms:   FormComparisonEntry[],
    pdfRefs: Array<{ templateRef: string; previewRef: string }>,
  ): string {
    const totalForms   = forms.length;
    const passedForms  = forms.filter(f => f.result.passed).length;
    const failedForms  = totalForms - passedForms;
    const totalChecks  = forms.reduce((s, f) => s + f.result.checks.length, 0);
    const passedChecks = forms.reduce((s, f) => s + f.result.checks.filter(c => c.found).length, 0);
    const overallPassed = failedForms === 0;
    const generatedAt  = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

    // Form index rows
    const indexRows = forms.map((f, i) => {
      const passed = f.result.passed;
      const checks = f.result.checks;
      const pct    = checks.length ? Math.round(checks.filter(c => c.found).length / checks.length * 100) : 0;
      const fields = f.formEntry.fields.length;
      const stmts  = f.formEntry.statements.length;
      return `
        <tr class="idx-row" onclick="toggleSection('sec-${i}')">
          <td><span class="badge ${passed ? 'pass' : 'fail'}">${passed ? '✓ PASS' : '✗ FAIL'}</span></td>
          <td><strong>${this.esc(f.formEntry.unqorkFormNumber)}</strong></td>
          <td>${this.esc(f.formEntry.formName)}</td>
          <td>${this.esc(f.formEntry.transactions.join(', '))}</td>
          <td><span class="badge ${f.formEntry.category === 'Mandatory' ? 'mand' : 'opt'}">${f.formEntry.category}</span></td>
          <td>${fields} field${fields !== 1 ? 's' : ''}, ${stmts} stmt${stmts !== 1 ? 's' : ''}</td>
          <td>
            <div class="pct-bar"><div class="pct-fill ${passed ? '' : 'fail-fill'}" style="width:${pct}%"></div></div>
            ${checks.filter(c => c.found).length}/${checks.length}
          </td>
          <td class="caret" id="caret-${i}">▶</td>
        </tr>`;
    }).join('');

    // Per-form detail sections
    const formSections = forms.map((f, i) => {
      const fields       = this.compareFields(f.expectedFields, f.result.previewText);
      const lines        = this.compareLines(f.result.renderedText, f.result.previewText);
      const { templateRef, previewRef } = pdfRefs[i];

      const fieldRows = fields.map(r => `
        <tr>
          <td>${this.esc(r.field)}</td>
          <td class="mono">${this.esc(r.expected)}</td>
          <td class="mono">${this.esc(r.actual || '—')}</td>
          <td><span class="badge ${r.status === 'MATCH' ? 'pass' : 'fail'}">${r.status}</span></td>
        </tr>`).join('') || '<tr><td colspan="4" class="muted">No field data</td></tr>';

      const stmtRows = f.formEntry.statements.length
        ? f.formEntry.statements.map((stmt, si) => {
            const found = MockPdfValidatorStatic.containsNormalized(f.result.previewText, stmt);
            return `<tr>
              <td>${si + 1}</td>
              <td class="mono" style="max-width:500px;word-wrap:break-word">${this.esc(stmt.substring(0, 200))}${stmt.length > 200 ? '…' : ''}</td>
              <td><span class="badge ${found ? 'pass' : 'fail'}">${found ? '✓ FOUND' : '✗ MISSING'}</span></td>
            </tr>`;
          }).join('')
        : '<tr><td colspan="3" class="muted">No required statements</td></tr>';

      const checkRows = f.result.checks.map(c => `
        <tr>
          <td><code>${this.esc(c.checkType)}</code></td>
          <td>${this.esc(c.label)}</td>
          <td class="mono">${this.esc(c.expected.substring(0, 100))}</td>
          <td><span class="badge ${c.found ? 'pass' : 'fail'}">${c.found ? 'PASS' : 'FAIL'}</span></td>
          <td class="mono">${this.esc(c.actual.substring(0, 100))}</td>
        </tr>`).join('');

      const unresRows = f.result.unresolvedVars.length
        ? f.result.unresolvedVars.map(v => `<li><code>{{${this.esc(v)}}}</code></li>`).join('')
        : '<li class="muted">None — all variables resolved</li>';

      const lineRows = lines.slice(0, 100).map(l => `
        <tr>
          <td>${l.lineNumber}</td>
          <td class="exp">${this.esc(l.expected)}</td>
          <td class="act">${this.esc(l.actual)}</td>
          <td><span class="badge ${l.status === 'MATCH' ? 'pass' : l.status === 'ADDED' ? 'added' : 'fail'}">${l.status}</span></td>
        </tr>`).join('');

      return `
      <div class="form-section hidden" id="sec-${i}">
        <div class="sec-header">
          <span class="badge ${f.result.passed ? 'pass' : 'fail'}">${f.result.passed ? '✓ PASS' : '✗ FAIL'}</span>
          <strong>${this.esc(f.formEntry.unqorkFormNumber)}</strong> — ${this.esc(f.formEntry.formName)}
          <span class="muted" style="font-size:12px;margin-left:8px">${f.formEntry.transactions.join(', ')} · ${f.formEntry.category}</span>
        </div>

        <div class="sub-section">
          <h3>PDF Preview</h3>
          <div class="pdf-grid">
            <div class="pdf-box">
              <div class="pdf-label">Template PDF <span class="muted">(with {{variables}})</span></div>
              <iframe src="${this.esc(templateRef)}" title="Template — ${this.esc(f.formEntry.unqorkFormNumber)}"></iframe>
              <div class="muted pdf-note">If PDF doesn't render, open from assets folder</div>
            </div>
            <div class="pdf-box">
              <div class="pdf-label">Preview PDF <span class="muted">(values from Excel)</span></div>
              <iframe src="${this.esc(previewRef)}" title="Preview — ${this.esc(f.formEntry.unqorkFormNumber)}"></iframe>
            </div>
          </div>
        </div>

        <div class="sub-section">
          <h3>Field Values <span class="muted">(Excel Test Data → Preview PDF)</span></h3>
          <div class="scroll"><table>
            <thead><tr><th>Form Field</th><th>Expected (Test Data)</th><th>Actual in Preview PDF</th><th>Status</th></tr></thead>
            <tbody>${fieldRows}</tbody>
          </table></div>
        </div>

        <div class="sub-section">
          <h3>Required Statements</h3>
          <div class="scroll"><table>
            <thead><tr><th>#</th><th>Statement Text (from Excel)</th><th>In Preview PDF</th></tr></thead>
            <tbody>${stmtRows}</tbody>
          </table></div>
        </div>

        <div class="sub-section">
          <h3>Validation Checks</h3>
          <div class="scroll"><table>
            <thead><tr><th>Type</th><th>Label</th><th>Expected</th><th>Status</th><th>Actual</th></tr></thead>
            <tbody>${checkRows || '<tr><td colspan="5" class="muted">No checks run</td></tr>'}</tbody>
          </table></div>
        </div>

        <div class="sub-section">
          <h3>Line Diff <span class="muted">(rendered template vs preview, first 100 lines)</span></h3>
          <div class="scroll"><table>
            <thead><tr><th>#</th><th class="exp">Expected</th><th class="act">Actual</th><th>Status</th></tr></thead>
            <tbody>${lineRows || '<tr><td colspan="4" class="muted">No diff data</td></tr>'}</tbody>
          </table></div>
        </div>

        <div class="sub-section">
          <h3>Unresolved Template Variables</h3>
          <ul>${unresRows}</ul>
        </div>
      </div>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PDF Comparison Report — ${this.esc(runName)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:#f0f2f5;color:#1a202c;font-size:14px;line-height:1.5}
a{color:#3182ce}

/* ── Layout ── */
.wrap{max-width:1600px;margin:0 auto;padding:24px 16px 48px}

/* ── Run header ── */
.run-header{background:#1a202c;color:#fff;border-radius:10px;padding:20px 24px;margin-bottom:20px;display:flex;align-items:center;gap:20px;flex-wrap:wrap}
.run-header h1{font-size:1.3rem;font-weight:700;flex:1}
.run-meta{font-size:12px;color:#a0aec0;margin-top:3px}
.overall{font-size:1.1rem;font-weight:800;padding:8px 18px;border-radius:6px}
.overall.pass{background:#22543d;color:#9ae6b4}
.overall.fail{background:#742a2a;color:#feb2b2}

/* ── Metric tiles ── */
.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:20px}
.metric{background:#fff;padding:14px 16px;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.07)}
.metric strong{display:block;font-size:28px;font-weight:700;margin-bottom:2px}
.metric span{font-size:11px;color:#718096;text-transform:uppercase;letter-spacing:.04em}
.metric.m-fail strong{color:#c53030}
.metric.m-pass strong{color:#22543d}

/* ── Index table ── */
.card{background:#fff;border-radius:10px;box-shadow:0 1px 6px rgba(0,0,0,.07);margin-bottom:16px;overflow:hidden}
.card-title{padding:14px 18px;border-bottom:1px solid #edf2f7;font-weight:700;font-size:15px}
.scroll{overflow-x:auto}
table{width:100%;border-collapse:collapse}
th,td{padding:9px 12px;text-align:left;border-bottom:1px solid #edf2f7;vertical-align:middle}
th{background:#f7fafc;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#4a5568}
.idx-row{cursor:pointer;transition:background .12s}
.idx-row:hover{background:#ebf8ff}
.caret{font-size:11px;color:#a0aec0;user-select:none;text-align:center}

/* ── Progress bar ── */
.pct-bar{display:inline-block;width:60px;height:6px;background:#edf2f7;border-radius:3px;vertical-align:middle;margin-right:4px;overflow:hidden}
.pct-fill{height:100%;background:#48bb78;border-radius:3px;transition:width .3s}
.pct-fill.fail-fill{background:#fc8181}

/* ── Badges ── */
.badge{display:inline-block;padding:2px 7px;border-radius:4px;font-size:11px;font-weight:700;white-space:nowrap}
.pass{color:#155724;background:#d4edda}
.fail{color:#721c24;background:#f8d7da}
.added{color:#1a365d;background:#bee3f8}
.mand{color:#744210;background:#fefcbf}
.opt{color:#2c7a7b;background:#e6fffa}

/* ── Form sections ── */
.form-section{border-left:4px solid #e2e8f0;margin:4px 0;border-radius:0 8px 8px 0;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.05)}
.form-section.hidden{display:none}
.sec-header{padding:12px 16px;background:#f7fafc;border-radius:0 8px 0 0;border-bottom:1px solid #edf2f7;display:flex;align-items:center;gap:8px;font-size:14px}
.sub-section{padding:16px 18px;border-bottom:1px solid #edf2f7}
.sub-section:last-child{border-bottom:none}
.sub-section h3{font-size:13px;font-weight:700;margin-bottom:10px;color:#4a5568;text-transform:uppercase;letter-spacing:.04em}

/* ── PDF iframes ── */
.pdf-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.pdf-box{border:1px solid #e2e8f0;border-radius:7px;overflow:hidden}
.pdf-label{padding:8px 12px;background:#f7fafc;font-size:12px;font-weight:600;border-bottom:1px solid #e2e8f0}
iframe{display:block;width:100%;height:580px;border:0}
.pdf-note{padding:5px 12px;font-size:11px;color:#a0aec0}

/* ── Table content styles ── */
td.exp{color:#c53030;font-size:12px}
td.act{color:#276749;font-size:12px}
td.mono{font-family:'JetBrains Mono',monospace;font-size:11px;max-width:300px;word-break:break-all}
.muted{color:#a0aec0;font-size:12px}
code{background:#edf2f7;padding:1px 5px;border-radius:3px;font-size:11px}
ul{padding-left:20px}li{margin:3px 0}

/* ── Footer ── */
.footer{text-align:center;color:#a0aec0;font-size:11px;margin-top:28px;padding-top:12px;border-top:1px solid #edf2f7}

@media(max-width:760px){
  .pdf-grid{grid-template-columns:1fr}
  iframe{height:380px}
  .metrics{grid-template-columns:repeat(2,1fr)}
}
</style>
</head>
<body>
<div class="wrap">

<!-- Run header -->
<div class="run-header">
  <div style="flex:1">
    <h1>PDF Comparison Report</h1>
    <div class="run-meta">${this.esc(runName)} &nbsp;·&nbsp; ${this.esc(generatedAt)}</div>
  </div>
  <div class="overall ${overallPassed ? 'pass' : 'fail'}">${overallPassed ? '✓ ALL PASSED' : '✗ FAILURES FOUND'}</div>
</div>

<!-- Metric tiles -->
<div class="metrics">
  <div class="metric ${failedForms ? 'm-fail' : 'm-pass'}">
    <strong>${passedForms}</strong><span>Forms Passed</span>
  </div>
  <div class="metric ${failedForms ? 'm-fail' : ''}">
    <strong>${failedForms}</strong><span>Forms Failed</span>
  </div>
  <div class="metric">
    <strong>${totalForms}</strong><span>Total Forms</span>
  </div>
  <div class="metric m-pass">
    <strong>${passedChecks}</strong><span>Checks Passed</span>
  </div>
  <div class="metric ${totalChecks - passedChecks ? 'm-fail' : ''}">
    <strong>${totalChecks - passedChecks}</strong><span>Checks Failed</span>
  </div>
  <div class="metric">
    <strong>${totalChecks}</strong><span>Total Checks</span>
  </div>
</div>

<!-- Form index -->
<div class="card">
  <div class="card-title">Forms — Click a row to expand details</div>
  <div class="scroll">
    <table>
      <thead><tr>
        <th>Status</th><th>Form Number</th><th>Form Name</th>
        <th>Transaction</th><th>Category</th><th>Coverage</th>
        <th>Checks</th><th></th>
      </tr></thead>
      <tbody>${indexRows}</tbody>
    </table>
  </div>
</div>

<!-- Per-form detail sections -->
${formSections}

<div class="footer">
  Generated by Policy Lifecycle Automation Framework · PdfComparisonReporter
  &nbsp;·&nbsp; All data sourced from Excel fixture — no hardcoded values
</div>

</div><!-- /.wrap -->

<script>
function toggleSection(id) {
  const sec   = document.getElementById(id);
  const idx   = id.replace('sec-', '');
  const caret = document.getElementById('caret-' + idx);
  if (!sec) return;
  const hidden = sec.classList.toggle('hidden');
  if (caret) caret.textContent = hidden ? '▶' : '▼';
}
// Expand first failed form automatically
(function() {
  const rows = document.querySelectorAll('.idx-row');
  for (let i = 0; i < rows.length; i++) {
    const badge = rows[i].querySelector('.badge');
    if (badge && badge.textContent.includes('FAIL')) {
      toggleSection('sec-' + i);
      break;
    }
  }
})();
</script>
</body>
</html>`;
  }

  // ── Single-form HTML ─────────────────────────────────────────────────────

  private static buildSingleFormHtml(
    testName:   string,
    summary:    ReturnType<typeof PdfComparisonReporter['buildSingleSummary']>,
    fields:     FieldComparisonResult[],
    lines:      LineComparisonResult[],
    vr:         MockCompareResult,
    templateRef: string,
    previewRef:  string,
  ): string {
    const sc = (s: string) => ({ MATCH:'pass', MISMATCH:'fail', NOT_FOUND:'fail', CHANGED:'fail', REMOVED:'fail', ADDED:'added' }[s] ?? '');
    const fieldRows = fields.map(f => `
      <tr><td>${this.esc(f.field)}</td><td class="mono">${this.esc(f.expected)}</td>
      <td class="mono">${this.esc(f.actual || '—')}</td>
      <td><span class="badge ${sc(f.status)}">${f.status}</span></td></tr>`).join('');
    const lineRows = lines.slice(0,100).map(l => `
      <tr><td>${l.lineNumber}</td>
      <td class="exp">${this.esc(l.expected)}</td>
      <td class="act">${this.esc(l.actual)}</td>
      <td><span class="badge ${sc(l.status)}">${l.status}</span></td></tr>`).join('');
    const checkRows = vr.checks.map(c => `
      <tr><td><code>${this.esc(c.checkType)}</code></td>
      <td>${this.esc(c.label)}</td>
      <td class="mono">${this.esc(c.expected.substring(0,100))}</td>
      <td><span class="badge ${c.found?'pass':'fail'}">${c.found?'PASS':'FAIL'}</span></td>
      <td class="mono">${this.esc(c.actual.substring(0,100))}</td></tr>`).join('');
    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>PDF Comparison — ${this.esc(testName)}</title>
<style>*{box-sizing:border-box}body{margin:0;padding:24px;font-family:system-ui,sans-serif;background:#f4f6f9;color:#1a202c}
.card{background:#fff;border-radius:10px;padding:20px;margin-bottom:18px;box-shadow:0 2px 8px rgba(0,0,0,.06)}
h1{margin:0 0 4px}h2{margin:20px 0 10px;font-size:17px}.muted{color:#718096;font-size:13px}
.badge{display:inline-block;padding:3px 8px;border-radius:5px;font-size:11px;font-weight:700}
.pass{color:#155724;background:#d4edda}.fail{color:#721c24;background:#f8d7da}.added{color:#1a365d;background:#bee3f8}
.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin:12px 0}
.metric{background:#fff;padding:14px;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.05)}
.metric strong{display:block;font-size:26px;margin-bottom:3px}.metric span{color:#718096;font-size:11px}
.pdf-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.pdf-box{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
.pdf-box h3{margin:0;padding:9px 13px;background:#f7fafc;font-size:12px}
iframe{display:block;width:100%;height:600px;border:0}
.scroll{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:12px}
th,td{padding:8px 11px;border-bottom:1px solid #edf2f7;text-align:left;vertical-align:top}
th{background:#f7fafc;font-size:11px;font-weight:700;text-transform:uppercase}
td.exp{color:#c53030}td.act{color:#276749}
td.mono{font-family:monospace;font-size:11px}code{background:#edf2f7;padding:1px 4px;border-radius:3px;font-size:11px}
ul{margin:0;padding-left:20px}li{margin:3px 0}
.result{display:inline-block;padding:8px 16px;border-radius:6px;font-weight:700;margin-top:8px}
.footer{text-align:center;color:#a0aec0;font-size:11px;margin-top:24px}
@media(max-width:768px){.pdf-grid{grid-template-columns:1fr}iframe{height:400px}}</style></head>
<body><div style="max-width:1600px;margin:auto">
<div class="card">
  <h1>PDF Comparison Report</h1>
  <div class="muted">Test: ${this.esc(testName)} &nbsp;·&nbsp; ${new Date().toISOString()}</div>
  <div class="result ${vr.passed ? 'pass' : 'fail'}">${vr.passed ? '✓ PASSED' : '✗ FAILED'}</div>
</div>
<div class="metrics">
  <div class="metric"><strong>${summary.passedChecks}</strong><span>Checks Passed</span></div>
  <div class="metric"><strong>${summary.failedChecks}</strong><span>Checks Failed</span></div>
  <div class="metric"><strong>${summary.matchedFields}</strong><span>Fields Matched</span></div>
  <div class="metric"><strong>${summary.mismatchedFields}</strong><span>Field Issues</span></div>
</div>
<div class="card"><h2>PDF Preview</h2>
  <div class="pdf-grid">
    <div class="pdf-box"><h3>Template ({{variables}})</h3><iframe src="${templateRef}"></iframe></div>
    <div class="pdf-box"><h3>Preview (values from Excel)</h3><iframe src="${previewRef}"></iframe></div>
  </div>
</div>
<div class="card"><h2>Field Comparison</h2><div class="scroll">
  <table><thead><tr><th>Field</th><th>Expected</th><th>Actual in Preview</th><th>Status</th></tr></thead>
  <tbody>${fieldRows || '<tr><td colspan="4" class="muted">No fields</td></tr>'}</tbody></table>
</div></div>
<div class="card"><h2>Line Diff</h2><div class="scroll">
  <table><thead><tr><th>#</th><th>Expected</th><th>Actual</th><th>Status</th></tr></thead>
  <tbody>${lineRows || '<tr><td colspan="4" class="muted">No diff</td></tr>'}</tbody></table>
</div></div>
<div class="card"><h2>Validation Checks</h2><div class="scroll">
  <table><thead><tr><th>Type</th><th>Label</th><th>Expected</th><th>Status</th><th>Actual</th></tr></thead>
  <tbody>${checkRows}</tbody></table>
</div></div>
<div class="card"><h2>Unresolved Variables</h2>
  <ul>${vr.unresolvedVars.length ? vr.unresolvedVars.map(v => `<li><code>{{${this.esc(v)}}}</code></li>`).join('') : '<li class="muted">None</li>'}</ul>
</div>
<div class="footer">Generated by Policy Lifecycle Automation Framework</div>
</div></body></html>`;
  }

  // ── Field comparison ──────────────────────────────────────────────────────

  static compareFields(
    expectedFields: Record<string, string>,
    actualText:     string,
  ): FieldComparisonResult[] {
    return Object.entries(expectedFields).map(([field, expectedValue]) => {
      const found = MockPdfValidatorStatic.containsNormalized(actualText, String(expectedValue ?? '').trim());
      if (!expectedValue?.trim()) return { field, expected: expectedValue, actual: '', status: 'NOT_FOUND' as const };
      return {
        field,
        expected: expectedValue,
        actual:   found ? expectedValue : '(not found in preview PDF)',
        status:   found ? 'MATCH' as const : 'NOT_FOUND' as const,
      };
    });
  }

  // ── Line comparison (LCS diff) ────────────────────────────────────────────

  static compareLines(expectedText: string, actualText: string): LineComparisonResult[] {
    const expected = expectedText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const actual   = actualText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const n = expected.length, m = actual.length;

    if (n * m > 400_000) return this.compareLinesFallback(expected, actual);

    const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--)
      for (let j = m - 1; j >= 0; j--)
        dp[i][j] = this.norm(expected[i]) === this.norm(actual[j])
          ? 1 + dp[i + 1][j + 1]
          : Math.max(dp[i + 1][j], dp[i][j + 1]);

    type Op = { type: 'MATCH'|'ADDED'|'REMOVED'; expected?: string; actual?: string };
    const ops: Op[] = [];
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (this.norm(expected[i]) === this.norm(actual[j])) { ops.push({ type: 'MATCH', expected: expected[i], actual: actual[j] }); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1])              { ops.push({ type: 'REMOVED', expected: expected[i] }); i++; }
      else                                                  { ops.push({ type: 'ADDED', actual: actual[j] }); j++; }
    }
    while (i < n) ops.push({ type: 'REMOVED', expected: expected[i++] });
    while (j < m) ops.push({ type: 'ADDED',   actual:   actual[j++] });

    const results: LineComparisonResult[] = [];
    for (let k = 0; k < ops.length; k++) {
      const cur = ops[k], nxt = ops[k + 1];
      if (cur.type === 'REMOVED' && nxt?.type === 'ADDED') {
        results.push({ lineNumber: results.length + 1, expected: cur.expected ?? '', actual: nxt.actual ?? '', status: 'CHANGED' });
        k++;
      } else {
        results.push({ lineNumber: results.length + 1, expected: cur.expected ?? '', actual: cur.actual ?? '', status: cur.type });
      }
    }
    return results;
  }

  private static compareLinesFallback(expected: string[], actual: string[]): LineComparisonResult[] {
    return Array.from({ length: Math.max(expected.length, actual.length) }, (_, i) => {
      const e = expected[i], a = actual[i];
      const status: LineComparisonResult['status'] =
        e === undefined ? 'ADDED' :
        a === undefined ? 'REMOVED' :
        this.norm(e) === this.norm(a) ? 'MATCH' : 'CHANGED';
      return { lineNumber: i + 1, expected: e ?? '', actual: a ?? '', status };
    });
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  private static buildSingleSummary(vr: MockCompareResult, fields: FieldComparisonResult[]) {
    return {
      totalFields:      fields.length,
      matchedFields:    fields.filter(f => f.status === 'MATCH').length,
      mismatchedFields: fields.filter(f => f.status === 'MISMATCH').length,
      missingFields:    fields.filter(f => f.status === 'NOT_FOUND').length,
      passedChecks:     vr.checks.filter(c =>  c.found).length,
      failedChecks:     vr.checks.filter(c => !c.found).length,
      overallPassed:    vr.passed,
    };
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  private static norm(v: string): string { return v.replace(/\s+/g, ' ').trim().toLowerCase(); }

  private static esc(v: string): string {
    return String(v ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
}

// ── Thin static wrapper so the HTML builder can call containsNormalized ───────
// (avoids circular import with MockPdfValidator)

const MockPdfValidatorStatic = {
  containsNormalized(haystack: string, needle: string): boolean {
    const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
    return norm(haystack).includes(norm(needle));
  },
};
