/**
 * forms.types.ts
 *
 * Types for the Excel form manifest (15 columns) and the page objects
 * that consume it.
 *
 * Excel columns (one row per field — forms repeat across rows):
 *   Product | Sub Segment | Formset | Transaction | Lotus Notes Form Number |
 *   Unqork Form Number | Form Name | Lotus Notes Form ID | Form Order |
 *   Category | States Applicable | Fields | Field ID | Type | Mapping
 */

// ── Enumerations ──────────────────────────────────────────────────────────────

export type Transaction = 'Quote' | 'Binder' | 'Policy';

export type Category = 'Mandatory' | 'Optional';

/** Matches the values in the Excel "Type" column */
export type FieldType =
  | 'Dropdown'
  | 'Textfield'
  | 'Checkbox'
  | 'Date'
  | 'Radio'
  | 'Textarea'
  | 'statement';   // static PDF-only text — no UI field

// ── Raw row (one per Excel row) ───────────────────────────────────────────────

export interface FormManifestRow {
  product:               string;
  subSegment:            string;
  formset:               string;
  /** Pipe-separated: "Quote|Binder" */
  transactionRaw:        string;
  lotusNotesFormNumber:  string;
  unqorkFormNumber:      string;
  formName:              string;
  /** UI display key e.g. "LN-001-Builder's Risk Coverage" */
  lotusNotesFormId:      string;
  formOrder:             number;
  category:              Category;
  /** Pipe-separated: "CA|NY|TX" or "ALL" */
  statesApplicableRaw:   string;
  fieldLabel:            string;
  fieldId:               string;   // CSS selector for the field
  fieldType:             FieldType;
  mapping:               string;   // source path if auto-populated from another module
}

// ── Parsed field entry ────────────────────────────────────────────────────────

export interface FormFieldEntry {
  /** Display label shown next to the field in the UI */
  fieldLabel:   string;
  /** CSS selector used by Playwright to locate the field (e.g. "#fieldId") */
  fieldId:      string;
  fieldType:    FieldType;
  /**
   * When set, this field is auto-populated from another module.
   * The test reads and verifies it rather than entering a value.
   */
  mapping:      string;
}

// ── Parsed form entry (one per form, with fields collected) ───────────────────

export interface FormEntry {
  product:              string;
  subSegment:           string;
  formset:              string;
  transactions:         Transaction[];
  lotusNotesFormNumber: string;
  unqorkFormNumber:     string;
  formName:             string;
  /**
   * The identifier the UI renders next to the form name.
   * Format: "<Lotus Notes Form ID> - <Form Name>"
   * e.g. "LN-001 - Builder's Risk Coverage"
   */
  lotusNotesFormId:     string;
  /** Display label = lotusNotesFormId + ' - ' + formName  */
  displayLabel:         string;
  formOrder:            number;
  category:             Category;
  /**
   * Individual state codes, or ['ALL'] to indicate every state.
   * Derived from the pipe-separated Excel column.
   */
  statesApplicable:     string[];
  fields:               FormFieldEntry[];
  /**
   * Static text phrases that MUST appear verbatim in the rendered / preview PDF.
   * Populated from Excel rows where Type = 'statement'.
   * Passed directly to PdfValidationInput.requiredStatements.
   */
  requiredStatements:   string[];
}

// ── Grouping helpers ─────────────────────────────────────────────────────────

/** All forms within a single formset (filtered by product + subSegment + transaction + state) */
export interface FormsetGroup {
  formsetName:    string;
  mandatoryForms: FormEntry[];
  optionalForms:  FormEntry[];
}

// ── PDF validation input ──────────────────────────────────────────────────────

export interface PdfValidationInput {
  /** Values read from the UI for each field (fieldLabel → value) */
  fieldValues:        Record<string, string>;
  /** Static statements that must appear verbatim in the preview PDF */
  requiredStatements: string[];
}
