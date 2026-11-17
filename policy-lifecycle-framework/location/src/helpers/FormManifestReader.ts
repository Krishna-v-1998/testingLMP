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
 *  npm install --save-dev xlsx
 */

import * as path from 'path';
import type { FormManifestRow, FormManifestEntry, FieldType } from '../types/forms.types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require('xlsx') as typeof import('xlsx');

const SHEET_NAME = 'FormManifest';

/** Canonical column header → property name mapping (all comparisons lower-cased) */
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
   */
  getFormsForProduct(product: string, subSegment: string): FormManifestEntry[] {
    this.ensureLoaded();

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
  getFormEntry(
    product:    string,
    subSegment: string,
    formNumber: string,
  ): FormManifestEntry | undefined {
    return this.getFormsForProduct(product, subSegment)
      .find(e => e.formNumber.trim().toLowerCase() === formNumber.trim().toLowerCase());
  }

  /**
   * Returns all unique (product, subSegment) pairs present in the manifest.
   */
  getProductList(): Array<{ product: string; subSegment: string }> {
    this.ensureLoaded();
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

  private ensureLoaded(): void {
    if (this.loaded) return;

    const resolvedPath = path.isAbsolute(this.excelPath)
      ? this.excelPath
      : path.resolve(process.cwd(), this.excelPath);

    const workbook = XLSX.readFile(resolvedPath);

    const sheet = workbook.Sheets[SHEET_NAME];
    if (!sheet) {
      throw new Error(
        `FormManifestReader: sheet "${SHEET_NAME}" not found in ${resolvedPath}. ` +
        `Available sheets: ${workbook.SheetNames.join(', ')}`,
      );
    }

    // Convert to array-of-arrays for header-based mapping
    const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
    });

    if (raw.length < 2) {
      this.loaded = true;
      return; // empty manifest
    }

    // Build column index map from the header row
    const headerRow = (raw[0] as string[]).map(h => String(h).replace(/\s+/g, '').toLowerCase());
    const colIndex: Partial<Record<keyof FormManifestRow, number>> = {};

    for (let i = 0; i < headerRow.length; i++) {
      const prop = COL_MAP[headerRow[i]];
      if (prop) colIndex[prop] = i;
    }

    // Parse data rows
    for (let ri = 1; ri < raw.length; ri++) {
      const cells = raw[ri] as string[];

      const get = (prop: keyof FormManifestRow): string => {
        const idx = colIndex[prop];
        return idx !== undefined ? String(cells[idx] ?? '').trim() : '';
      };

      const row: FormManifestRow = {
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
      if (!row.product && !row.formNumber) continue;

      this.rows.push(row);
    }

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
 * Pass `process.cwd() + '/test-data/form-manifest.xlsx'` as the default.
 */
export function getManifestReader(excelPath: string): FormManifestReader {
  if (!_cache.has(excelPath)) {
    _cache.set(excelPath, new FormManifestReader(excelPath));
  }
  return _cache.get(excelPath)!;
}
