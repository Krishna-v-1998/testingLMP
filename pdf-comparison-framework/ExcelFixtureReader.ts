/**
 * ExcelFixtureReader.ts
 *
 * Reads the forms-fixture.xlsx (20-column schema) and returns structured data
 * for PDF comparison and UI form-filling.
 *
 * ── EXCEL SCHEMA (sheet: "Form Field Mapping") ───────────────────────────────
 *
 *  Col  Header               Description
 *  ───  ─────────────────── ─────────────────────────────────────────────────
 *   1   Product              Product line (e.g. Construction)
 *   2   Sub Segment          Sub-segment (e.g. Builder's Risk)
 *   3   Formset              Radio-button group name in Forms tab
 *   4   Transaction          Quote | Binder | Policy
 *   5   Lotus Notes Form Number  Client reference number
 *   6   Unqork Form Number   Unique form ID → PDF filename (sanitized)
 *   7   Form Name            Human-readable display name
 *   8   Lotus Notes Form ID  Short form code e.g. BR 4000DEC 11 15
 *   9   Form Order           Sort order within formset
 *  10   Category             Mandatory | Optional
 *  11   States Applicable    Pipe-separated codes or ALL
 *  12   Template Version     e.g. v1.0
 *  13   Form Field           UI field label
 *  14   Field ID             Playwright CSS selector(s), comma-separated
 *  15   Field Type           text | date | number | currency | textarea | dropdown | radio | checkbox | statement
 *  16   Test Data            Value to fill in UI / expected in preview PDF
 *  17   Required             Y | N
 *  18   Mapping              Source path if auto-populated from submission
 *  19   PDF Variable         Template {{variable}} name without braces
 *  20   Notes                Free-form remarks
 *
 * ── HOW PDF VARIABLE DRIVES COMPARISON ───────────────────────────────────────
 *
 *   Template PDF:  "Insured {{insured}}"
 *   Excel row:     Form Field="Insured", Test Data="Acme Corp", PDF Variable="insured"
 *   values map:    { insured: "Acme Corp" }
 *   comparePdfs()  renders template → "Insured Acme Corp" → checks preview PDF contains it
 *
 * ── FIELD TYPE 'statement' ───────────────────────────────────────────────────
 *
 *   Rows with Field Type = 'statement' contain static text (legal notices,
 *   regulatory disclosures) that must appear verbatim in the preview PDF.
 *   The Test Data column holds the full statement text.
 *   These go into FixtureFormEntry.statements[] not .fields[].
 *
 * ── USAGE ────────────────────────────────────────────────────────────────────
 *
 *   const reader = new ExcelFixtureReader('test-data/forms-fixture.xlsx');
 *
 *   // All forms
 *   const forms = await reader.getAllForms();
 *
 *   // Forms filtered by transaction
 *   const quoteForms = await reader.getFormsByTransaction('Quote');
 *
 *   // Build values map for PDF comparison (pdfVariable → testData)
 *   const values = reader.buildValuesMap(form);
 *
 *   // Build fill map for UI (fieldId → testData)
 *   const fillMap = reader.buildFillMap(form);
 */

import * as path from 'path';
import * as fs   from 'fs';
import ExcelJS   from 'exceljs';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FixtureField {
  /** UI label as shown in the form */
  formField:   string;
  /** Playwright CSS selector(s) — comma-separated when there are fallbacks */
  fieldId:     string;
  /** Field type: text | date | number | currency | textarea | dropdown | radio | checkbox */
  fieldType:   string;
  /** Value to fill in the UI / expected in the preview PDF */
  testData:    string;
  /** true = required field, false = optional */
  required:    boolean;
  /** Source path when the value is auto-populated from submission data */
  mapping:     string;
  /**
   * Template variable name (without {{ }}).
   * Maps this field's testData to the {{variable}} in the template PDF.
   * Example: "insured" means the template has {{insured}} and testData fills it.
   */
  pdfVariable: string;
  /** Free-form notes from the fixture */
  notes:       string;
}

export interface FixtureFormEntry {
  /** Unique form identifier — sanitized version used as PDF filename */
  unqorkFormNumber:    string;
  /** Raw Unqork Form Number as it appears in Excel (may contain spaces) */
  unqorkFormNumberRaw: string;
  /** Human-readable display name */
  formName:            string;
  /** Short code e.g. BR 4000DEC 11 15 */
  lotusFormId:         string;
  /** Product line */
  product:             string;
  /** Sub-segment */
  subSegment:          string;
  /** Radio-button group name */
  formset:             string;
  /** Transactions this form applies to */
  transactions:        string[];
  /** Mandatory | Optional */
  category:            'Mandatory' | 'Optional';
  /** State codes this form applies to — ['ALL'] means all states */
  statesApplicable:    string[];
  /** PDF template version */
  templateVersion:     string;
  /** UI fields (all rows where fieldType !== 'statement') */
  fields:              FixtureField[];
  /**
   * Required static text phrases (all rows where fieldType === 'statement').
   * These must appear verbatim in the preview PDF.
   * Text comes from the Test Data column.
   */
  statements:          string[];
}

// ── Column header → internal property mapping ─────────────────────────────────

type RawRow = {
  product:          string;
  subSegment:       string;
  formset:          string;
  transactionRaw:   string;
  lotusFormNumber:  string;
  unqorkFormNumber: string;
  formName:         string;
  lotusFormId:      string;
  formOrder:        number;
  category:         string;
  statesRaw:        string;
  templateVersion:  string;
  formField:        string;
  fieldId:          string;
  fieldType:        string;
  testData:         string;
  required:         string;
  mapping:          string;
  pdfVariable:      string;
  notes:            string;
};

const COL_MAP: Record<string, keyof RawRow> = {
  product:                'product',
  subsegment:             'subSegment',
  formset:                'formset',
  transaction:            'transactionRaw',
  lotusnoteformnumber:    'lotusFormNumber',
  lotusnotesformnumber:   'lotusFormNumber',
  unqorkformnumber:       'unqorkFormNumber',
  formname:               'formName',
  lotusnoteformid:        'lotusFormId',
  lotusnotesformid:       'lotusFormId',
  formorder:              'formOrder',
  category:               'category',
  statesapplicable:       'statesRaw',
  templateversion:        'templateVersion',
  formfield:              'formField',
  fieldid:                'fieldId',
  fieldtype:              'fieldType',
  testdata:               'testData',
  required:               'required',
  mapping:                'mapping',
  pdfvariable:            'pdfVariable',
  notes:                  'notes',
};

// ── ExcelFixtureReader ────────────────────────────────────────────────────────

export class ExcelFixtureReader {

  private rawRows:  RawRow[] = [];
  private loaded = false;

  constructor(private readonly excelPath: string) {}

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Returns all unique forms found in the fixture, regardless of transaction / state.
   */
  async getAllForms(): Promise<FixtureFormEntry[]> {
    await this.ensureLoaded();
    return this.buildEntries(this.rawRows);
  }

  /**
   * Returns forms filtered to a specific transaction (Quote | Binder | Policy).
   */
  async getFormsByTransaction(transaction: string): Promise<FixtureFormEntry[]> {
    await this.ensureLoaded();
    const norm = (s: string) => s.trim().toLowerCase();
    const filtered = this.rawRows.filter(r =>
      r.transactionRaw.split('|').map(t => norm(t)).includes(norm(transaction)),
    );
    return this.buildEntries(filtered);
  }

  /**
   * Returns forms filtered by product, sub-segment, transaction and optional state.
   */
  async getForms(opts: {
    product?:     string;
    subSegment?:  string;
    transaction?: string;
    state?:       string;
  }): Promise<FixtureFormEntry[]> {
    await this.ensureLoaded();
    const norm = (s: string) => s.trim().toLowerCase();
    const filtered = this.rawRows.filter(r => {
      if (opts.product    && norm(r.product)    !== norm(opts.product))    return false;
      if (opts.subSegment && norm(r.subSegment) !== norm(opts.subSegment)) return false;
      if (opts.transaction) {
        const txList = r.transactionRaw.split('|').map(t => norm(t.trim())).filter(Boolean);
        if (!txList.includes(norm(opts.transaction))) return false;
      }
      if (opts.state) {
        const states = r.statesRaw.split('|').map(s => s.trim().toUpperCase());
        if (!states.includes('ALL') && !states.includes(opts.state.toUpperCase())) return false;
      }
      return true;
    });
    return this.buildEntries(filtered);
  }

  // ── Value map helpers ──────────────────────────────────────────────────────

  /**
   * Builds the values map used by MockPdfValidator.comparePdfs():
   *   { [pdfVariable]: testData }
   *
   * Only fields with both a pdfVariable and a testData value are included.
   * This map drives template {{variable}} substitution.
   */
  buildValuesMap(form: FixtureFormEntry): Record<string, string> {
    const values: Record<string, string> = {};
    for (const field of form.fields) {
      if (field.pdfVariable && field.testData) {
        values[field.pdfVariable] = field.testData;
      }
    }
    return values;
  }

  /**
   * Builds the fill map used by Playwright to populate the form in the UI:
   *   { [fieldId]: testData }
   *
   * Returns one entry per selector — when a field has comma-separated selectors,
   * returns all of them (the caller tries each in order until one works).
   */
  buildFillMap(form: FixtureFormEntry): Array<{ selector: string; value: string; fieldType: string }> {
    const result: Array<{ selector: string; value: string; fieldType: string }> = [];
    for (const field of form.fields) {
      if (!field.fieldId || !field.testData) continue;
      const selectors = field.fieldId.split(',').map(s => s.trim()).filter(Boolean);
      for (const selector of selectors) {
        result.push({ selector, value: field.testData, fieldType: field.fieldType });
        break; // use only the first selector per field (others are fallbacks)
      }
    }
    return result;
  }

  /**
   * Sanitizes an Unqork Form Number for use as a PDF filename.
   * Removes trailing/leading spaces and replaces internal spaces with underscores.
   */
  static sanitizeFormNumber(raw: string): string {
    return raw.trim().replace(/\s+/g, '_');
  }

  // ── Grouping ───────────────────────────────────────────────────────────────

  private buildEntries(rows: RawRow[]): FixtureFormEntry[] {
    const formKey = (r: RawRow) =>
      `${r.product}||${r.subSegment}||${r.unqorkFormNumber}||${r.transactionRaw}`;

    const entryMap = new Map<string, FixtureFormEntry>();

    for (const row of rows) {
      const key = formKey(row);

      if (!entryMap.has(key)) {
        entryMap.set(key, {
          unqorkFormNumber:    ExcelFixtureReader.sanitizeFormNumber(row.unqorkFormNumber),
          unqorkFormNumberRaw: row.unqorkFormNumber,
          formName:            row.formName,
          lotusFormId:         row.lotusFormId,
          product:             row.product,
          subSegment:          row.subSegment,
          formset:             row.formset,
          transactions:        row.transactionRaw.split('|').map(t => t.trim()).filter(Boolean),
          category:            (row.category === 'Mandatory' ? 'Mandatory' : 'Optional') as 'Mandatory' | 'Optional',
          statesApplicable:    row.statesRaw.split('|').map(s => s.trim()).filter(Boolean),
          templateVersion:     row.templateVersion,
          fields:              [],
          statements:          [],
        });
      }

      const formField = row.formField?.trim();
      if (!formField) continue;

      // Route statement rows separately
      if (row.fieldType?.trim().toLowerCase() === 'statement') {
        // Test Data column holds the full statement text
        const statementText = row.testData?.trim();
        if (statementText) {
          entryMap.get(key)!.statements.push(statementText);
        }
        continue;
      }

      entryMap.get(key)!.fields.push({
        formField,
        fieldId:     row.fieldId?.trim()     ?? '',
        fieldType:   row.fieldType?.trim()   ?? 'text',
        testData:    row.testData?.trim()    ?? '',
        required:    row.required?.trim().toUpperCase() === 'Y',
        mapping:     row.mapping?.trim()     ?? '',
        pdfVariable: row.pdfVariable?.trim() ?? '',
        notes:       row.notes?.trim()       ?? '',
      });
    }

    return Array.from(entryMap.values());
  }

  // ── Excel loading ──────────────────────────────────────────────────────────

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;

    const resolvedPath = path.isAbsolute(this.excelPath)
      ? this.excelPath
      : path.resolve(process.cwd(), this.excelPath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`ExcelFixtureReader: file not found: ${resolvedPath}`);
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(resolvedPath);

    // Try the expected sheet name; fall back to the first sheet
    const sheet =
      workbook.getWorksheet('Form Field Mapping') ??
      workbook.getWorksheet('Forms') ??
      workbook.worksheets[0];

    if (!sheet) {
      throw new Error(`ExcelFixtureReader: workbook is empty — ${resolvedPath}`);
    }

    // Build column index from header row
    const colIndex: Partial<Record<keyof RawRow, number>> = {};
    sheet.getRow(1).eachCell((cell, colNum) => {
      const header = String(cell.value ?? '').replace(/\s+/g, '').toLowerCase();
      const prop   = COL_MAP[header];
      if (prop) colIndex[prop] = colNum;
    });

    // Parse data rows
    sheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return;

      const get = (prop: keyof RawRow): string => {
        const idx = colIndex[prop];
        if (idx === undefined) return '';
        const cell  = row.getCell(idx);
        const value = cell.value;
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') {
          if ('richText' in value) return (value as ExcelJS.CellRichTextValue).richText.map(r => r.text).join('').trim();
          if ('result'   in value) return String((value as ExcelJS.CellFormulaValue).result ?? '').trim();
          if ('text'     in value) return String((value as ExcelJS.CellHyperlinkValue).text  ?? '').trim();
          if (value instanceof Date) return value.toLocaleDateString('en-US');
        }
        return String(value).trim();
      };

      const rawRow: RawRow = {
        product:          get('product'),
        subSegment:       get('subSegment'),
        formset:          get('formset'),
        transactionRaw:   get('transactionRaw'),
        lotusFormNumber:  get('lotusFormNumber'),
        unqorkFormNumber: get('unqorkFormNumber'),
        formName:         get('formName'),
        lotusFormId:      get('lotusFormId'),
        formOrder:        Number(get('formOrder')) || 0,
        category:         get('category')  || 'Optional',
        statesRaw:        get('statesRaw') || 'ALL',
        templateVersion:  get('templateVersion'),
        formField:        get('formField'),
        fieldId:          get('fieldId'),
        fieldType:        get('fieldType')  || 'text',
        testData:         get('testData'),
        required:         get('required'),
        mapping:          get('mapping'),
        pdfVariable:      get('pdfVariable'),
        notes:            get('notes'),
      };

      // Skip completely empty rows
      if (!rawRow.product && !rawRow.unqorkFormNumber) return;

      this.rawRows.push(rawRow);
    });

    this.loaded = true;
  }
}
