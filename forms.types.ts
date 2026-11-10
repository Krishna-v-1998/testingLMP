/**
 * forms.types.ts
 *
 * Data structures for the Forms workflow used in Quote, Binder, and Policy.
 *
 * ── PAGE STRUCTURE ───────────────────────────────────────────────────────────
 *
 *   Quote / Binder / Policy all share the same Forms tab structure:
 *
 *   TABS:  [ Quote Details ]  [ Forms ]  [ Forms Preview ]  [ Form Order ]
 *
 *   FORMS TAB:
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │  Formset: ○ Formset A  ○ Formset B  ○ Formset C                    │
 *   │                                                                     │
 *   │  MANDATORY FORMS (pre-selected checkboxes — cannot uncheck):        │
 *   │    ☑ Form IL 00 17  Common Policy Declarations                      │
 *   │    ☑ Form CG 00 01  Commercial General Liability                    │
 *   │                                                                     │
 *   │  OPTIONAL FORMS (user can check/uncheck):                           │
 *   │    ☐ Form IL 09 85  Disclosure of Information                       │
 *   │    ☐ Form CG 20 10  Additional Insured                              │
 *   │                                                                     │
 *   │                            [Form Fields ▶]                          │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 *   FORM FIELDS PANEL (opens after clicking "Form Fields"):
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │  Selected Forms:                                                    │
 *   │  [ IL 00 17 ] [ CG 00 01 ]  ← click a form to edit its fields      │
 *   │                                                                     │
 *   │  Fields for: IL 00 17                                               │
 *   │    Named Insured:   [__________________]                            │
 *   │    Policy Number:   [__________________]                            │
 *   │    Effective Date:  [____/____/________]                            │
 *   │                                                                     │
 *   │  [👁 Eye Icon]  [Save]                                             │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 *   PDF PREVIEW (opens in new tab when Eye Icon is clicked):
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │  Rendered PDF showing:                                              │
 *   │  - All filled form field values                                     │
 *   │  - Additional static statements specific to the form                │
 *   └─────────────────────────────────────────────────────────────────────┘
 */

// ── Enums ─────────────────────────────────────────────────────────────────────

export type FormType   = 'Mandatory' | 'Optional';
export type FieldType  = 'text' | 'dropdown' | 'radio' | 'checkbox' | 'date' | 'currency' | 'textarea' | 'number';

// ── Core data structures (map 1:1 to Excel rows) ──────────────────────────────

/**
 * One form field — maps to one row in the "Form Fields" Excel sheet.
 */
export interface FormFieldDefinition {
  /** Row order within this form (1, 2, 3...) */
  fieldOrder:   number;

  /**
   * Label exactly as shown in the UI form field.
   * e.g. "Named Insured", "Policy Number"
   */
  fieldName:    string;

  /** Input type — drives how fillFormField() interacts with the field */
  fieldType:    FieldType;

  /**
   * Value to enter/select during the test.
   * For checkbox: 'true' | 'false'
   * For radio: the option label to click
   * For dropdown: the option text to select
   * For date: 'MM/DD/YYYY' format
   */
  testValue:    string;

  /**
   * How this field's value appears in the PDF.
   * May differ from fieldName — e.g. fieldName = "Named Insured"
   * but PDF prints it as "INSURED:".
   * Leave blank if the field is not reflected in the PDF.
   */
  pdfLabel:     string;

  /** If true, test must supply a value — no empty string allowed */
  required:     boolean;
}

/**
 * One form — maps to one row in the "Forms" Excel sheet.
 * Fields are populated from the "Form Fields" sheet by matching formId.
 */
export interface FormDefinition {
  /**
   * Unique key linking "Forms" and "Form Fields" sheets.
   * e.g. "F001", "F002"
   */
  formId:       string;

  /**
   * Official form number as it appears in the UI and PDF header.
   * e.g. "IL 00 17 11 98", "CG 00 01 04 13"
   */
  formNumber:   string;

  /**
   * Full human-readable name of the form.
   * e.g. "Common Policy Declarations"
   */
  formName:     string;

  /** Product this form belongs to — e.g. "Commercial Lines" */
  product:      string;

  /** Sub-segment within the product — e.g. "CGL", "Property", "Auto" */
  subSegment:   string;

  /** Name of the radio-button Formset this form belongs to */
  formsetName:  string;

  /**
   * States where this form applies.
   * ['ALL'] means all states.
   * Otherwise a list like ['NY', 'CA', 'TX'].
   */
  statesApplicable: string[];

  /** Whether the checkbox for this form is pre-selected and locked */
  type:         FormType;

  /**
   * Static statements that must appear verbatim in the PDF preview.
   * These are boilerplate paragraphs added by the app — not form field values.
   * e.g. ["In consideration of the premium charged...", "This policy is subject to..."]
   */
  pdfAdditionalStatements: string[];

  /** Form field definitions (populated from "Form Fields" sheet) */
  fields:       FormFieldDefinition[];
}

/**
 * A Formset groups one or more forms under a single radio-button selection.
 */
export interface FormSet {
  formsetName: string;
  forms:       FormDefinition[];
}

// ── Runtime state ─────────────────────────────────────────────────────────────

/**
 * Which forms the user has selected on the Forms tab.
 * Returned by FormsPage.getSelectionState().
 */
export interface FormSelectionState {
  selectedFormset:      string;
  mandatoryForms:       string[];   // always present — cannot be deselected
  selectedOptionalForms: string[];  // user-selected optional forms
  allSelectedForms:     string[];   // mandatory + selected optional
}

// ── PDF validation ─────────────────────────────────────────────────────────────

/**
 * Input to PdfValidator.validate() — drives what to check in the PDF.
 */
export interface PdfValidationInput {
  /** Which fields (and their expected values) must appear in the PDF */
  fieldValues: Array<{
    fieldName:     string;   // for reporting
    pdfLabel:      string;   // text to search for in the PDF
    expectedValue: string;   // value that must accompany the label
  }>;

  /** Static statements that must appear verbatim somewhere in the PDF */
  additionalStatements: string[];

  /** Form number that must appear in the PDF header/footer */
  formNumber: string;

  /** Form name that must appear somewhere in the PDF */
  formName:   string;
}

/**
 * Result of a single PDF validation run.
 * Returned by PdfValidator.captureAndValidate().
 */
export interface PdfValidationResult {
  passed:  boolean;
  pdfText: string;   // full extracted text — useful for debugging failures

  fieldValidations: Array<{
    fieldName:     string;
    pdfLabel:      string;
    expectedValue: string;
    found:         boolean;
  }>;

  statementValidations: Array<{
    statement: string;
    found:     boolean;
  }>;

  formNumberFound: boolean;
  formNameFound:   boolean;

  /** Human-readable list of everything that failed */
  failures: string[];
}
