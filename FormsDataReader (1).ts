/**
 * FormsDataReader.ts
 *
 * Reads the "Form Field Mapping" sheet from the forms fixture Excel file
 * and returns structured data ready for use in Playwright tests.
 *
 * ── USAGE ─────────────────────────────────────────────────────────────────────
 *
 *   // Load all form definitions
 *   const forms = await FormsDataReader.loadForms();
 *
 *   // Get one specific form by ID
 *   const toc = await FormsDataReader.getFormById('IM-FGL-TG-14');
 *
 *   // Get all forms for a formset
 *   const brs = await FormsDataReader.getFormsForFormset("Builder's Risk");
 *
 *   // Get mandatory-only forms
 *   const mandatory = await FormsDataReader.getMandatoryForms();
 *
 * ── EXCEL COLUMN MAPPING ──────────────────────────────────────────────────────
 *
 *   Column  Header               Mapped to
 *   ──────  ───────────────────  ──────────────────────────────────────────
 *   A       Form Name            FormDefinition.formName
 *   B       Form ID              FormDefinition.formId
 *   C       Form Number          FormDefinition.formNumber
 *   D       Formset Name         FormDefinition.formsetName
 *   E       Product              FormDefinition.product
 *   F       Sub Segment          FormDefinition.subSegment
 *   G       Mandatory / Optional FormDefinition.type
 *   H       Applicable State(s)  FormDefinition.statesApplicable
 *   I       Template Version     FormDefinition.templateVersion
 *   J       Form Field           FormFieldDefinition.fieldName
 *   K       Field ID / Key       FormFieldDefinition.fieldIdKey
 *   L       Field Type           FormFieldDefinition.fieldType
 *   M       Expected Value       FormFieldDefinition.testValue
 *   N       Value Source         FormFieldDefinition.valueSource
 *   O       PDF Label            FormFieldDefinition.pdfLabel
 *   P       Required             FormFieldDefinition.required
 *   Q       Notes                FormFieldDefinition.notes
 */

import path   from 'path';
import ExcelJS from 'exceljs';
import {
  FormDefinition,
  FormFieldDefinition,
  FormSet,
  FormType,
  FieldType,
} from '../../types/forms.types';

// ── Extended types (extra columns beyond what forms.types already holds) ───────

export interface ExtendedFormFieldDefinition extends FormFieldDefinition {
  /** CSS selector / aria-label / data-testid hints, comma-separated */
  fieldIdKey:   string;
  /** Where the expected value comes from: Static | Derived | Submission | API:<field> */
  valueSource:  string;
  /** Freeform remarks */
  notes:        string;
}

export interface ExtendedFormDefinition extends FormDefinition {
  /** PDF template version for template-vs-generated comparison */
  templateVersion: string;
  fields: ExtendedFormFieldDefinition[];
}

// ── Default fixture path ───────────────────────────────────────────────────────

const DEFAULT_FIXTURE_PATH = path.resolve(
  __dirname,
  'forms-fixture.xlsx',
);

// ── Reader ─────────────────────────────────────────────────────────────────────

export class FormsDataReader {

  /**
   * Loads the entire fixture and returns one ExtendedFormDefinition per
   * unique Form ID, with its fields populated from all matching rows.
   *
   * Rows whose Form ID cell is blank are silently skipped (trailing empties, etc.).
   */
  static async loadForms(
    fixturePath: string = DEFAULT_FIXTURE_PATH,
  ): Promise<ExtendedFormDefinition[]> {

    const workbook  = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(fixturePath);

    const sheet = workbook.getWorksheet('Form Field Mapping');
    if (!sheet) {
      throw new Error(
        `[FormsDataReader] Worksheet "Form Field Mapping" not found in ${fixturePath}. ` +
        'Run generate-forms-fixture.ts to create the file.'
      );
    }

    // ── Map header names → column indices ────────────────────────────────
    const headerRow  = sheet.getRow(1);
    const colIndex: Record<string, number> = {};
    headerRow.eachCell((cell, colNum) => {
      const name = String(cell.value ?? '').trim();
      if (name) colIndex[name] = colNum;
    });

    const req = (name: string) => {
      if (!(name in colIndex)) {
        throw new Error(
          `[FormsDataReader] Required column "${name}" not found in "Form Field Mapping" sheet. ` +
          'Check the fixture file header row.'
        );
      }
      return colIndex[name];
    };

    // Column indices (throw if missing)
    const C_FORM_NAME   = req('Form Name');
    const C_FORM_ID     = req('Form ID');
    const C_FORM_NUMBER = req('Form Number');
    const C_FORMSET     = req('Formset Name');
    const C_PRODUCT     = req('Product');
    const C_SUB_SEG     = req('Sub Segment');
    const C_MAND_OPT    = req('Mandatory / Optional');
    const C_STATES      = req('Applicable State(s)');
    const C_TMPL_VER    = req('Template Version');
    const C_FIELD       = req('Form Field');
    const C_FIELD_KEY   = req('Field ID / Key');
    const C_FIELD_TYPE  = req('Field Type');
    const C_EXPECTED    = req('Expected Value');
    const C_SRC         = req('Value Source');
    const C_PDF_LABEL   = req('PDF Label');
    const C_REQUIRED    = req('Required');
    const C_NOTES       = req('Notes');

    // ── Accumulate rows into a form-keyed map ─────────────────────────────
    const formMap = new Map<string, ExtendedFormDefinition>();

    sheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return; // skip header

      const str = (col: number) =>
        String(row.getCell(col).value ?? '').trim();

      const formId = str(C_FORM_ID);
      if (!formId) return; // blank row

      // Create form entry on first encounter
      if (!formMap.has(formId)) {
        const statesRaw = str(C_STATES);
        const states    = statesRaw.toUpperCase() === 'ALL'
          ? ['ALL']
          : statesRaw.split(',').map(s => s.trim()).filter(Boolean);

        formMap.set(formId, {
          formId,
          formName:         str(C_FORM_NAME),
          formNumber:       str(C_FORM_NUMBER),
          formsetName:      str(C_FORMSET),
          product:          str(C_PRODUCT),
          subSegment:       str(C_SUB_SEG),
          type:             str(C_MAND_OPT) as FormType,
          statesApplicable: states,
          templateVersion:  str(C_TMPL_VER),
          pdfAdditionalStatements: [],
          fields: [],
        });
      }

      // Append field (skip rows with no field name)
      const fieldName = str(C_FIELD);
      if (!fieldName) return;

      const form   = formMap.get(formId)!;
      const reqStr = str(C_REQUIRED).toUpperCase();

      const field: ExtendedFormFieldDefinition = {
        fieldOrder:  form.fields.length + 1,
        fieldName,
        fieldIdKey:  str(C_FIELD_KEY),
        fieldType:   str(C_FIELD_TYPE) as FieldType,
        testValue:   str(C_EXPECTED),
        valueSource: str(C_SRC),
        pdfLabel:    str(C_PDF_LABEL),
        required:    reqStr === 'Y',
        notes:       str(C_NOTES),
      };

      form.fields.push(field);
    });

    return [...formMap.values()];
  }

  // ── Convenience helpers ─────────────────────────────────────────────────────

  /** Returns the form with the given ID, or throws if not found */
  static async getFormById(
    formId: string,
    fixturePath?: string,
  ): Promise<ExtendedFormDefinition> {
    const forms = await this.loadForms(fixturePath);
    const form  = forms.find(f => f.formId === formId);
    if (!form) {
      throw new Error(`[FormsDataReader] Form ID "${formId}" not found in fixture.`);
    }
    return form;
  }

  /** Returns all forms belonging to the named formset */
  static async getFormsForFormset(
    formsetName: string,
    fixturePath?: string,
  ): Promise<ExtendedFormDefinition[]> {
    const forms = await this.loadForms(fixturePath);
    return forms.filter(f => f.formsetName === formsetName);
  }

  /** Returns only mandatory forms */
  static async getMandatoryForms(fixturePath?: string): Promise<ExtendedFormDefinition[]> {
    const forms = await this.loadForms(fixturePath);
    return forms.filter(f => f.type === 'Mandatory');
  }

  /** Returns only optional forms */
  static async getOptionalForms(fixturePath?: string): Promise<ExtendedFormDefinition[]> {
    const forms = await this.loadForms(fixturePath);
    return forms.filter(f => f.type === 'Optional');
  }

  /** Groups forms by formset name and returns FormSet[] */
  static async getFormSets(fixturePath?: string): Promise<FormSet[]> {
    const forms     = await this.loadForms(fixturePath);
    const setMap    = new Map<string, FormDefinition[]>();

    for (const form of forms) {
      if (!setMap.has(form.formsetName)) {
        setMap.set(form.formsetName, []);
      }
      setMap.get(form.formsetName)!.push(form);
    }

    return [...setMap.entries()].map(([formsetName, fms]) => ({
      formsetName,
      forms: fms,
    }));
  }

  /**
   * Returns forms applicable to the given state.
   * Forms with statesApplicable = ['ALL'] are always included.
   */
  static async getFormsForState(
    stateCode: string,
    fixturePath?: string,
  ): Promise<ExtendedFormDefinition[]> {
    const forms = await this.loadForms(fixturePath);
    const uc    = stateCode.toUpperCase();
    return forms.filter(f =>
      f.statesApplicable.includes('ALL') ||
      f.statesApplicable.map(s => s.toUpperCase()).includes(uc)
    );
  }
}
