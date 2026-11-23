/**
 * FormManifestReader.ts
 *
 * Reads the Excel form manifest (15 columns, one row per field) and returns
 * typed FormEntry objects grouped by form, filtered by Product / Sub-Segment /
 * Formset / Transaction / State.
 *
 * ── EXCEL SCHEMA (sheet: "Forms") ────────────────────────────────────────────
 *
 *  Row 1 = headers (exact names below — matching is case-insensitive, spaces stripped):
 *
 *  Product | Sub Segment | Formset | Transaction | Lotus Notes Form Number |
 *  Unqork Form Number | Form Name | Lotus Notes Form ID | Form Order |
 *  Category | States Applicable | Fields | Field ID | Type | Mapping
 *
 *  • Transaction         — pipe-separated: "Quote|Binder|Policy" or single value
 *  • States Applicable   — pipe-separated: "CA|NY|TX" or "ALL"
 *  • Mapping             — set when the field is auto-populated from another module;
 *                          test reads & verifies rather than filling it
 *
 * ── USAGE ────────────────────────────────────────────────────────────────────
 *
 *  const reader = new FormManifestReader('test-data/form-manifest.xlsx');
 *
 *  // All formsets for a product / sub-segment / transaction / state
 *  const groups = await reader.getFormsetGroups('Builders Risk', 'Standard', 'Quote', 'CA');
 *  // groups: FormsetGroup[]  — { formsetName, mandatoryForms, optionalForms }
 *
 *  // Forms inside one formset
 *  const forms = await reader.getFormsForProduct('Builders Risk', 'Standard');
 *
 * ── DEPENDENCY ───────────────────────────────────────────────────────────────
 *
 *  npm install --save-dev exceljs
 */

import * as path from 'path';
import ExcelJS   from 'exceljs';
import type {
  FormManifestRow,
  FormEntry,
  FormFieldEntry,
  FormsetGroup,
  Transaction,
  Category,
  FieldType,
} from '../types/forms.types';

// ── Constants ─────────────────────────────────────────────────────────────────

const SHEET_NAME = 'Forms';

/** Canonical column-header → property mapping (compare lower-cased + spaces stripped) */
const COL_MAP: Record<string, keyof FormManifestRow> = {
  product:               'product',
  subsegment:            'subSegment',
  formset:               'formset',
  transaction:           'transactionRaw',
  lotusnoteformnumber:   'lotusNotesFormNumber',
  lotusnoteformnumbers:  'lotusNotesFormNumber',
  lotusnotesformnumber:  'lotusNotesFormNumber',
  unqorkformnumber:      'unqorkFormNumber',
  formname:              'formName',
  lotusnoteformid:       'lotusNotesFormId',
  lotusnoteformids:      'lotusNotesFormId',
  lotusnotesformid:      'lotusNotesFormId',
  formorder:             'formOrder',
  category:              'category',
  statesapplicable:      'statesApplicableRaw',
  fields:                'fieldLabel',
  fieldid:               'fieldId',
  type:                  'fieldType',
  mapping:               'mapping',
};

// ── FormManifestReader ────────────────────────────────────────────────────────

export class FormManifestReader {

  private rows: FormManifestRow[] = [];
  private loaded = false;

  constructor(private readonly excelPath: string) {}

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Returns all FormEntry objects for a given Product + Sub-Segment,
   * grouped by their unique form identity (Product + SubSegment + Formset + UnqorkFormNumber).
   *
   * All rows with the same identity are merged — their fields are collected into FormEntry.fields[].
   */
  async getFormsForProduct(product: string, subSegment: string): Promise<FormEntry[]> {
    await this.ensureLoaded();
    return this.buildEntries(this.filterRows({ product, subSegment }));
  }

  /**
   * Returns FormsetGroup[] — one group per unique formset name — for a given
   * Product / Sub-Segment / Transaction / State combination.
   *
   * - Forms that don't apply to the requested transaction are excluded.
   * - Forms that don't apply to the requested state are excluded
   *   (unless statesApplicable = ['ALL']).
   * - Within each formset, forms are split into mandatoryForms and optionalForms.
   * - Forms are sorted by formOrder within each group.
   *
   * @param product     e.g. "Builders Risk"
   * @param subSegment  e.g. "Standard"
   * @param transaction e.g. "Quote" | "Binder" | "Policy"
   * @param state       e.g. "CA" — optional; when omitted state filtering is skipped
   */
  async getFormsetGroups(
    product:     string,
    subSegment:  string,
    transaction: Transaction,
    state?:      string,
  ): Promise<FormsetGroup[]> {
    await this.ensureLoaded();

    const rows = this.filterRows({ product, subSegment, transaction, state });
    const entries = this.buildEntries(rows);

    // Group by formset name
    const formsetMap = new Map<string, FormsetGroup>();
    for (const entry of entries) {
      if (!formsetMap.has(entry.formset)) {
        formsetMap.set(entry.formset, {
          formsetName:    entry.formset,
          mandatoryForms: [],
          optionalForms:  [],
        });
      }
      const group = formsetMap.get(entry.formset)!;
      if (entry.category === 'Mandatory') {
        group.mandatoryForms.push(entry);
      } else {
        group.optionalForms.push(entry);
      }
    }

    // Sort each group by formOrder
    for (const group of formsetMap.values()) {
      group.mandatoryForms.sort((a, b) => a.formOrder - b.formOrder);
      group.optionalForms.sort((a, b) => a.formOrder - b.formOrder);
    }

    return Array.from(formsetMap.values());
  }

  /**
   * Returns all unique formset names for a Product + Sub-Segment.
   */
  async getFormsetNames(product: string, subSegment: string): Promise<string[]> {
    await this.ensureLoaded();
    const rows = this.filterRows({ product, subSegment });
    const seen = new Set<string>();
    const names: string[] = [];
    for (const row of rows) {
      if (row.formset && !seen.has(row.formset)) {
        seen.add(row.formset);
        names.push(row.formset);
      }
    }
    return names;
  }

  /**
   * Returns a single FormEntry by Unqork Form Number within a Product + Sub-Segment.
   */
  async getFormByUnqorkNumber(
    product:          string,
    subSegment:       string,
    unqorkFormNumber: string,
  ): Promise<FormEntry | undefined> {
    await this.ensureLoaded();
    const rows    = this.filterRows({ product, subSegment });
    const entries = this.buildEntries(rows);
    return entries.find(e =>
      e.unqorkFormNumber.trim().toLowerCase() === unqorkFormNumber.trim().toLowerCase(),
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

  // ── Filtering ──────────────────────────────────────────────────────────────

  private filterRows(opts: {
    product?:     string;
    subSegment?:  string;
    transaction?: string;
    state?:       string;
  }): FormManifestRow[] {
    const norm = (s: string) => s.trim().toLowerCase();

    return this.rows.filter(row => {
      if (opts.product    && norm(row.product)    !== norm(opts.product))    return false;
      if (opts.subSegment && norm(row.subSegment) !== norm(opts.subSegment)) return false;

      if (opts.transaction) {
        const txList = row.transactionRaw.split('|').map(t => norm(t.trim())).filter(Boolean);
        if (!txList.includes(norm(opts.transaction))) return false;
      }

      if (opts.state) {
        const states = row.statesApplicableRaw.split('|').map(s => s.trim().toUpperCase()).filter(Boolean);
        if (!states.includes('ALL') && !states.includes(opts.state.toUpperCase())) return false;
      }

      return true;
    });
  }

  // ── Grouping — one row per field → one FormEntry per form ─────────────────

  private buildEntries(rows: FormManifestRow[]): FormEntry[] {
    /** Composite key that uniquely identifies a form across the 15-column schema */
    const formKey = (r: FormManifestRow) =>
      `${r.product}||${r.subSegment}||${r.formset}||${r.unqorkFormNumber}`;

    const entryMap = new Map<string, FormEntry>();

    for (const row of rows) {
      const key = formKey(row);

      if (!entryMap.has(key)) {
        const transactions = row.transactionRaw
          .split('|')
          .map(t => t.trim())
          .filter(Boolean) as Transaction[];

        const statesApplicable = row.statesApplicableRaw
          .split('|')
          .map(s => s.trim())
          .filter(Boolean);

        entryMap.set(key, {
          product:              row.product,
          subSegment:           row.subSegment,
          formset:              row.formset,
          transactions,
          lotusNotesFormNumber: row.lotusNotesFormNumber,
          unqorkFormNumber:     row.unqorkFormNumber,
          formName:             row.formName,
          lotusNotesFormId:     row.lotusNotesFormId,
          displayLabel:         `${row.lotusNotesFormId} - ${row.formName}`,
          formOrder:            row.formOrder || 0,
          category:             row.category,
          statesApplicable,
          fields:               [],
          requiredStatements:   [],
        });
      }

      // Route the row: Type='statement' → requiredStatements[], anything else → fields[]
      const fieldLabel = row.fieldLabel?.trim();
      if (!fieldLabel) continue;

      const fieldType = (row.fieldType?.trim() as FieldType) ?? 'Textfield';

      if (fieldType === 'statement') {
        // fieldLabel holds the full static text that must appear verbatim in the PDF
        entryMap.get(key)!.requiredStatements.push(fieldLabel);
      } else {
        const field: FormFieldEntry = {
          fieldLabel,
          fieldId:   row.fieldId?.trim()   ?? '',
          fieldType,
          mapping:   row.mapping?.trim()   ?? '',
        };
        entryMap.get(key)!.fields.push(field);
      }
    }

    return Array.from(entryMap.values());
  }

  // ── Excel loading ──────────────────────────────────────────────────────────

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;

    const resolvedPath = path.isAbsolute(this.excelPath)
      ? this.excelPath
      : path.resolve(process.cwd(), this.excelPath);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(resolvedPath);

    // Try the expected sheet name first; fall back to the first sheet
    const sheet = workbook.getWorksheet(SHEET_NAME) ?? workbook.worksheets[0];
    if (!sheet) {
      throw new Error(`FormManifestReader: workbook is empty — ${resolvedPath}`);
    }
    if (sheet.name !== SHEET_NAME) {
      console.warn(
        `FormManifestReader: sheet "${SHEET_NAME}" not found; ` +
        `using "${sheet.name}" instead. Available: ${workbook.worksheets.map(w => w.name).join(', ')}`,
      );
    }

    // ── Build column index from header row (row 1) ────────────────────────
    const colIndex: Partial<Record<keyof FormManifestRow, number>> = {};

    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      const header = String(cell.value ?? '').replace(/\s+/g, '').toLowerCase();
      const prop   = COL_MAP[header];
      if (prop) colIndex[prop] = colNumber;
    });

    // ── Parse data rows ───────────────────────────────────────────────────
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header

      const get = (prop: keyof FormManifestRow): string => {
        const idx = colIndex[prop];
        if (idx === undefined) return '';
        const cell  = row.getCell(idx);
        const value = cell.value;

        if (value === null || value === undefined) return '';
        if (typeof value === 'object') {
          if ('richText' in value) {
            return (value as ExcelJS.CellRichTextValue).richText.map(rt => rt.text).join('').trim();
          }
          if ('result' in value) {
            return String((value as ExcelJS.CellFormulaValue).result ?? '').trim();
          }
          if ('text' in value) {
            return String((value as ExcelJS.CellHyperlinkValue).text ?? '').trim();
          }
          if (value instanceof Date) {
            return value.toLocaleDateString('en-US');
          }
        }
        return String(value).trim();
      };

      const rowData: FormManifestRow = {
        product:              get('product'),
        subSegment:           get('subSegment'),
        formset:              get('formset'),
        transactionRaw:       get('transactionRaw'),
        lotusNotesFormNumber: get('lotusNotesFormNumber'),
        unqorkFormNumber:     get('unqorkFormNumber'),
        formName:             get('formName'),
        lotusNotesFormId:     get('lotusNotesFormId'),
        formOrder:            Number(get('formOrder')) || 0,
        category:             (get('category') || 'Optional') as Category,
        statesApplicableRaw:  get('statesApplicableRaw') || 'ALL',
        fieldLabel:           get('fieldLabel'),
        fieldId:              get('fieldId'),
        fieldType:            (get('fieldType') || 'Textfield') as FieldType,
        mapping:              get('mapping'),
      };

      // Skip completely empty rows
      if (!rowData.product && !rowData.unqorkFormNumber) return;

      this.rows.push(rowData);
    });

    this.loaded = true;
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
