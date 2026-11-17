/**
 * FormManifestReader.ts
 *
 * Reads the Excel form manifest and returns typed FormManifestEntry objects
 * filtered by Product + Sub-Segment.
 *
 * ── EXCEL SCHEMA (sheet: "FormManifest") ─────────────────────────────────────
 *
 *  Row 1 = headers (exact names below — case-insensitive):
 *
 *  Product | SubSegment | FormNumber | FormName | MandatoryOptional |
 *  FieldName | FieldType | FieldSelector | PdfLabel | PdfStatement
 *
 * ── FIELD TYPES ──────────────────────────────────────────────────────────────
 *
 *  text      – <input type="text"> or any text-editable element
 *  select    – <select> dropdown
 *  checkbox  – <input type="checkbox">
 *  date      – date picker input
 *  statement – static boilerplate line in the PDF (no UI field; use PdfStatement)
 *
 * ── USAGE ────────────────────────────────────────────────────────────────────
 *
 *  const reader  = new FormManifestReader('test-data/form-manifest.xlsx');
 *  const entries = reader.getFormsForProduct("Builder's Risk", 'Builders Risk');
 *  // entries: FormManifestEntry[]
 *
 * ── DEPENDENCY ───────────────────────────────────────────────────────────────
 *
 *  npm install --save-dev exceljs
 */

import * as path  from 'path';
import ExcelJS    from 'exceljs';
import type { FormManifestRow, FormManifestEntry, FieldType } from '../types/forms.types';

const SHEET_NAME = 'FormManifest';

/** Canonical column header → property name mapping (all comparisons lower-cased, spaces stripped) */
const COL_MAP: Record<string, keyof FormManifestRow> = {
  product:            'product',
  subsegment:         'subSegment',
  formnumber:         'formNumber',
  formname:           'formName',
  mandatoryoptional:  'mandatoryOptional',
  fieldname:          'fieldName',
  fieldtype:          'fieldType',
  fieldselector:      'fieldSelector',
  pdflabel:           'pdfLabel',
  pdfstatement:       'pdfStatement',
};

export class FormManifestReader {

  private rows: FormManifestRow[] = [];
  private loaded = false;

  constructor(private readonly excelPath: string) {}

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Returns all FormManifestEntry objects for a given Product + Sub-Segment,
   * grouped by FormNumber.
   *
   * NOTE: This method is async because ExcelJS reads files asynchronously.
   * Call it with `await` and ensure it is called inside an async context
   * (e.g. inside a Playwright beforeAll or test body).
   */
  async getFormsForProduct(product: string, subSegment: string): Promise<FormManifestEntry[]> {
    await this.ensureLoaded();

    const normalise = (s: string) => s.trim().toLowerCase();
    const p  = normalise(product);
    const ss = normalise(subSegment);

    const relevantRows = this.rows.filter(
      r => normalise(r.product) === p && normalise(r.subSegment) === ss,
    );

    return this.groupByForm(relevantRows);
  }

  /**
   * Returns the FormManifestEntry for a specific form number within a Product/Sub-Segment.
   * Returns undefined if not found.
   */
  async getFormEntry(
    product:    string,
    subSegment: string,
    formNumber: string,
  ): Promise<FormManifestEntry | undefined> {
    const entries = await this.getFormsForProduct(product, subSegment);
    return entries.find(
      e => e.formNumber.trim().toLowerCase() === formNumber.trim().toLowerCase(),
    );
  }

  /**
   * Returns all unique (product, subSegment) pairs present in the manifest.
   */
  async getProductList(): Promise<Array<{ product: string; subSegment: string }>> {
    await this.ensureLoaded();
    const seen = new Set<string>();
    const list: Array<{ product: string; subSegment: string }> = [];
    for (const r of this.rows) {
      const key = `${r.product}||${r.subSegment}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ product: r.product, subSegment: r.subSegment });
      }
    }
    return list;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;

    const resolvedPath = path.isAbsolute(this.excelPath)
      ? this.excelPath
      : path.resolve(process.cwd(), this.excelPath);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(resolvedPath);

    const sheet = workbook.getWorksheet(SHEET_NAME);
    if (!sheet) {
      const names = workbook.worksheets.map(ws => ws.name).join(', ');
      throw new Error(
        `FormManifestReader: sheet "${SHEET_NAME}" not found in ${resolvedPath}. ` +
        `Available sheets: ${names}`,
      );
    }

    // ── Build column index map from header row (row 1) ────────────────────
    const colIndex: Partial<Record<keyof FormManifestRow, number>> = {};

    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      const header = String(cell.value ?? '').replace(/\s+/g, '').toLowerCase();
      const prop   = COL_MAP[header];
      if (prop) colIndex[prop] = colNumber;
    });

    // ── Parse data rows (row 2 onward) ────────────────────────────────────
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header

      const get = (prop: keyof FormManifestRow): string => {
        const idx = colIndex[prop];
        if (idx === undefined) return '';
        const cell  = row.getCell(idx);
        const value = cell.value;

        // ExcelJS cell values can be objects (rich text, formula results, etc.)
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') {
          // Rich text
          if ('richText' in value) {
            return (value as ExcelJS.CellRichTextValue).richText
              .map(rt => rt.text)
              .join('')
              .trim();
          }
          // Formula result
          if ('result' in value) {
            return String((value as ExcelJS.CellFormulaValue).result ?? '').trim();
          }
          // Hyperlink
          if ('text' in value) {
            return String((value as ExcelJS.CellHyperlinkValue).text ?? '').trim();
          }
        }
        return String(value).trim();
      };

      const row_data: FormManifestRow = {
        product:           get('product'),
        subSegment:        get('subSegment'),
        formNumber:        get('formNumber'),
        formName:          get('formName'),
        mandatoryOptional: (get('mandatoryOptional') || 'Optional') as 'Mandatory' | 'Optional',
        fieldName:         get('fieldName'),
        fieldType:         (get('fieldType') || 'text') as FieldType,
        fieldSelector:     get('fieldSelector'),
        pdfLabel:          get('pdfLabel'),
        pdfStatement:      get('pdfStatement'),
      };

      // Skip completely empty rows
      if (!row_data.product && !row_data.formNumber) return;

      this.rows.push(row_data);
    });

    this.loaded = true;
  }

  private groupByForm(rows: FormManifestRow[]): FormManifestEntry[] {
    const entryMap = new Map<string, FormManifestEntry>();

    for (const row of rows) {
      if (!entryMap.has(row.formNumber)) {
        entryMap.set(row.formNumber, {
          formNumber:           row.formNumber,
          formName:             row.formName,
          mandatoryOptional:    row.mandatoryOptional,
          fields:               [],
          additionalStatements: [],
        });
      }

      const entry = entryMap.get(row.formNumber)!;

      if (row.fieldType === 'statement') {
        // Static boilerplate statement
        if (row.pdfStatement) entry.additionalStatements.push(row.pdfStatement);
      } else if (row.fieldName) {
        // Form field with a UI selector
        entry.fields.push({
          fieldName:     row.fieldName,
          fieldType:     row.fieldType as Exclude<FieldType, 'statement'>,
          fieldSelector: row.fieldSelector,
          pdfLabel:      row.pdfLabel,
        });
      }
    }

    return Array.from(entryMap.values());
  }
}

// ── Singleton factory keyed by path ───────────────────────────────────────────

const _cache = new Map<string, FormManifestReader>();

/**
 * Returns a cached FormManifestReader for the given Excel path.
 * All public methods are async — await them at the call site.
 */
export function getManifestReader(excelPath: string): FormManifestReader {
  if (!_cache.has(excelPath)) {
    _cache.set(excelPath, new FormManifestReader(excelPath));
  }
  return _cache.get(excelPath)!;
}
