/**
 * forms.types.ts
 *
 * Shared types for the Forms workflow:
 *   - PdfValidationInput / PdfValidationResult  (used by PdfValidator)
 *   - FormManifest row / entry types            (used by FormManifestReader + FormsPage)
 *
 * ── EXCEL MANIFEST SCHEMA ─────────────────────────────────────────────────────
 *
 *  Sheet: "FormManifest"
 *  One row per field (or per additional statement) per form:
 *
 *  | Product | SubSegment | FormNumber | FormName | MandatoryOptional |
 *  | FieldName | FieldType | FieldSelector | PdfLabel | PdfStatement |
 *
 *  Column meanings:
 *    Product           – e.g. "Builder's Risk"
 *    SubSegment        – e.g. "Builders Risk"
 *    FormNumber        – e.g. "IM-FGL-TG-14"  (matches the PDF form number)
 *    FormName          – e.g. "Inland Marine Table of Contents"
 *                        MUST match the label shown in the Forms tab UI
 *    MandatoryOptional – "Mandatory" | "Optional"
 *    FieldName         – Human-readable field name; leave blank for statement rows
 *    FieldType         – "text" | "select" | "checkbox" | "date" | "statement"
 *                        Use "statement" to record a static PDF boilerplate line
 *    FieldSelector     – Playwright selector to locate the UI element
 *                        e.g. [aria-label="Named Insured"]
 *    PdfLabel          – The label that appears in the PDF next to the value
 *                        e.g. "INSURED NAME:"  (leave blank for statement rows)
 *    PdfStatement      – The verbatim static text that must appear in the PDF
 *                        (only for FieldType = "statement"; leave blank otherwise)
 */

// ── PDF Validation types (imported by PdfValidator) ───────────────────────────

export interface PdfFieldValue {
  fieldName:     string;
  pdfLabel:      string;
  expectedValue: string;
}

export interface PdfValidationInput {
  formNumber:           string;
  formName:             string;
  additionalStatements: string[];
  fieldValues:          PdfFieldValue[];
}

export interface PdfFieldValidation extends PdfFieldValue {
  found: boolean;
}

export interface PdfStatementValidation {
  statement: string;
  found:     boolean;
}

export interface PdfValidationResult {
  passed:               boolean;
  pdfText:              string;
  fieldValidations:     PdfFieldValidation[];
  statementValidations: PdfStatementValidation[];
  formNumberFound:      boolean;
  formNameFound:        boolean;
  failures:             string[];
}

// ── Form Manifest types (Excel → TypeScript) ──────────────────────────────────

/** FieldType values in the Excel manifest */
export type FieldType = 'text' | 'select' | 'checkbox' | 'date' | 'statement';

/** One row from the Excel manifest (after parsing) */
export interface FormManifestRow {
  product:            string;
  subSegment:         string;
  formNumber:         string;
  formName:           string;
  mandatoryOptional:  'Mandatory' | 'Optional';
  fieldName:          string;         // blank for statement rows
  fieldType:          FieldType;
  fieldSelector:      string;         // Playwright selector; blank for statement rows
  pdfLabel:           string;         // PDF label near the value; blank for statement rows
  pdfStatement:       string;         // verbatim static PDF text; only for statement rows
}

/** A field within a form, used to extract live UI values and validate the PDF */
export interface FormFieldEntry {
  fieldName:     string;
  fieldType:     Exclude<FieldType, 'statement'>;
  fieldSelector: string;
  pdfLabel:      string;
}

/** Aggregated per-form entry (groups all rows for one form) */
export interface FormManifestEntry {
  formNumber:           string;
  formName:             string;
  mandatoryOptional:    'Mandatory' | 'Optional';
  fields:               FormFieldEntry[];
  additionalStatements: string[];
}
