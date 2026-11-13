/**
 * FormsPage.ts
 *
 * Page Object for the "Forms" tab inside a Quote / Binder / Policy.
 *
 * ── TAB STRUCTURE ─────────────────────────────────────────────────────────────
 *
 *   [ Quote Details ]  [ Forms ★ ]  [ Forms Preview ]  [ Form Set Order ]
 *
 * ── FORMS TAB LAYOUT ──────────────────────────────────────────────────────────
 *
 *   Form Sets (radio buttons):  ● Builder's Risk   ○ Other Formset
 *
 *   Mandatory Forms:
 *     ☑ IM-FGL-TG-14   Inland Marine Table of Contents          👁
 *     ☑ BR-CDS-01      Builder's Risk Coverage Declarations     👁
 *     …
 *
 *   Optional Forms – Builder's Risk:
 *     ☑ Select All                      [ Search... ]  [+ Add New]
 *     ☑ BR-ENT-AI-14  Additional Insured Endorsement
 *     ☐ BR-ENT-HS-14  Hail Storm Deductible Endorsement
 *     …
 *
 *   [ Form Fields ▶ ]
 *
 * ── FORM FIELDS PANEL ─────────────────────────────────────────────────────────
 *
 *   Forms list (left):               Fields panel (right):
 *   ▶ IM-FGL-TG-14  👁              Policy Number:  [____________]
 *   ▶ BR-CDS-01     👁              Insured Name:   [____________]
 *                                    …
 *                                    [ Save ]
 *
 * ── HOW LOCATORS WORK ─────────────────────────────────────────────────────────
 *
 *   Because the app is built on Unqork (a no-code/low-code platform), DOM IDs
 *   and class names are auto-generated and not stable.  All locators in this
 *   file are marked PLACEHOLDER — replace them once you inspect the real DOM.
 *
 *   Preferred strategy (most stable → least stable):
 *     1. getByRole('radio', { name: 'Builder\'s Risk' })
 *     2. getByLabel('Policy Number')
 *     3. getByText('Form Fields')           → click to open panel
 *     4. locator('[data-testid="..."]')
 *     5. locator('.unqork-field-label:has-text("...") + input')
 *
 *   The Field ID / Key column in the Excel fixture provides additional
 *   locator hints per field.
 */

import { type Locator, type Page, type BrowserContext } from '@playwright/test';
import { BasePage }                                      from './BasePage';
import { ExtendedFormDefinition, ExtendedFormFieldDefinition } from '../data/fixtures/FormsDataReader';
import { PdfValidator }  from '../utils/PdfValidator';
import { PdfValidationResult } from '../types/forms.types';

export class FormsPage extends BasePage {

  // ── Tab navigation ─────────────────────────────────────────────────────────

  /** "Forms" tab button */
  get tabForms():       Locator { return this.page.getByRole('tab', { name: 'Forms' }); }
  /** "Forms Preview" tab button */
  get tabFormsPreview():Locator { return this.page.getByRole('tab', { name: 'Forms Preview' }); }
  /** "Form Set Order" tab button */
  get tabFormSetOrder():Locator { return this.page.getByRole('tab', { name: 'Form Set Order' }); }

  // ── Formset radio buttons ──────────────────────────────────────────────────

  /**
   * Returns the radio locator for a named formset.
   * e.g. selectFormset("Builder's Risk")
   * PLACEHOLDER: adjust role/name if the UI renders radios differently.
   */
  formsetRadio(formsetName: string): Locator {
    return this.page.getByRole('radio', { name: formsetName });
  }

  // ── Mandatory / Optional form checkboxes ──────────────────────────────────

  /**
   * Returns the checkbox for a mandatory form by its form number/ID.
   * Mandatory checkboxes are pre-checked and disabled.
   * PLACEHOLDER: label text may differ — inspect the DOM.
   */
  mandatoryFormCheckbox(formIdOrNumber: string): Locator {
    return this.page
      .locator('[data-section="mandatory-forms"]')  // PLACEHOLDER
      .getByRole('checkbox')
      .filter({ hasText: formIdOrNumber });
  }

  /**
   * Returns the checkbox for an optional form by its form number/ID.
   * PLACEHOLDER: adjust container selector.
   */
  optionalFormCheckbox(formIdOrNumber: string): Locator {
    return this.page
      .locator('[data-section="optional-forms"]')  // PLACEHOLDER
      .getByRole('checkbox')
      .filter({ hasText: formIdOrNumber });
  }

  /** "Select All" checkbox at the top of the Optional Forms panel */
  get optionalSelectAll(): Locator {
    return this.page.getByRole('checkbox', { name: 'Select All' });
  }

  // ── Form Fields panel ──────────────────────────────────────────────────────

  /** "Form Fields" button that opens the form fields panel */
  get btnFormFields(): Locator {
    return this.page.getByRole('button', { name: 'Form Fields' });
  }

  /**
   * Row in the left-hand form list inside the Form Fields panel.
   * Click to load that form's fields on the right.
   * PLACEHOLDER: container + row selector.
   */
  formFieldsListRow(formIdOrNumber: string): Locator {
    return this.page
      .locator('[data-section="form-fields-list"]')  // PLACEHOLDER
      .locator('li, [role="listitem"]')
      .filter({ hasText: formIdOrNumber });
  }

  /**
   * Eye (👁) icon for a form in the Form Fields panel left list.
   * Clicking this opens the PDF preview in a new tab.
   * PLACEHOLDER: button within the list row.
   */
  eyeIconForForm(formIdOrNumber: string): Locator {
    return this.formFieldsListRow(formIdOrNumber)
      .locator('button[aria-label*="Preview"], button[aria-label*="Eye"], button[title*="Preview"]');  // PLACEHOLDER
  }

  /** "Save" button in the Form Fields panel */
  get btnSaveFormFields(): Locator {
    return this.page.getByRole('button', { name: 'Save' });
  }

  // ── High-level actions ─────────────────────────────────────────────────────

  /** Clicks the Forms tab and waits for it to be active */
  async goToFormsTab(): Promise<void> {
    this.log('Navigating to Forms tab');
    await this.tabForms.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Selects a formset by clicking its radio button.
   * Does nothing if the radio is already selected.
   */
  async selectFormset(formsetName: string): Promise<void> {
    this.log(`Selecting formset: ${formsetName}`);
    const radio = this.formsetRadio(formsetName);
    if (!(await radio.isChecked())) {
      await radio.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * Checks (selects) an optional form.
   * No-ops if already checked.
   */
  async selectOptionalForm(formIdOrNumber: string): Promise<void> {
    this.log(`Selecting optional form: ${formIdOrNumber}`);
    const cb = this.optionalFormCheckbox(formIdOrNumber);
    if (!(await cb.isChecked())) {
      await cb.click();
    }
  }

  /**
   * Unchecks (deselects) an optional form.
   * No-ops if already unchecked.
   */
  async deselectOptionalForm(formIdOrNumber: string): Promise<void> {
    this.log(`Deselecting optional form: ${formIdOrNumber}`);
    const cb = this.optionalFormCheckbox(formIdOrNumber);
    if (await cb.isChecked()) {
      await cb.click();
    }
  }

  /**
   * Opens the Form Fields panel by clicking "Form Fields ▶".
   */
  async openFormFieldsPanel(): Promise<void> {
    this.log('Opening Form Fields panel');
    await this.btnFormFields.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Selects a form from the left list in the Form Fields panel,
   * loading its fields on the right.
   */
  async selectFormInPanel(formIdOrNumber: string): Promise<void> {
    this.log(`Selecting form in panel: ${formIdOrNumber}`);
    await this.formFieldsListRow(formIdOrNumber).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Fills a single field using the Field ID / Key locator hint from the Excel.
   *
   * Strategy (tries each in order):
   *   1. aria-label matching fieldName
   *   2. CSS selectors from fieldIdKey (comma-separated list)
   *   3. label text → sibling input (last-resort)
   */
  async fillField(field: ExtendedFormFieldDefinition): Promise<void> {
    this.log(`Filling field: "${field.fieldName}" = "${field.testValue}"`);

    const locator = await this.resolveFieldLocator(field);

    switch (field.fieldType) {
      case 'text':
      case 'number':
      case 'currency':
      case 'textarea':
        await locator.clear();
        await locator.fill(field.testValue);
        break;

      case 'date':
        await locator.clear();
        await locator.fill(field.testValue);
        // Press Tab to trigger date validation / calendar close
        await locator.press('Tab');
        break;

      case 'dropdown':
        await locator.selectOption({ label: field.testValue });
        break;

      case 'checkbox':
        if (field.testValue.toLowerCase() === 'true') {
          if (!(await locator.isChecked())) await locator.click();
        } else {
          if (await locator.isChecked()) await locator.click();
        }
        break;

      case 'radio':
        await this.page.getByRole('radio', { name: field.testValue }).click();
        break;

      default:
        await locator.fill(field.testValue);
    }
  }

  /**
   * Fills ALL fields for a given form definition and saves.
   */
  async fillAllFieldsAndSave(form: ExtendedFormDefinition): Promise<void> {
    this.log(`Filling all fields for form: ${form.formId}`);
    await this.selectFormInPanel(form.formId);

    const sortedFields = [...form.fields].sort((a, b) => a.fieldOrder - b.fieldOrder);
    for (const field of sortedFields) {
      if (!field.testValue) continue; // skip fields with no test value
      await this.fillField(field);
    }

    await this.btnSaveFormFields.click();
    await this.page.waitForLoadState('networkidle');
    this.log(`Saved form fields for: ${form.formId}`);
  }

  /**
   * Clicks the Eye icon for a form and returns a PdfValidationResult.
   *
   * The Eye icon opens a PDF in a new browser tab.
   * This method captures the tab, fetches the PDF bytes, and validates:
   *   - Form number and name appear in the PDF
   *   - Expected field values are present in the correct positions
   *   - Any additional static statements are present
   */
  async clickEyeAndValidatePdf(form: ExtendedFormDefinition): Promise<PdfValidationResult> {
    this.log(`Clicking Eye icon for form: ${form.formId}`);

    // Set up the new-tab listener BEFORE clicking
    const newPagePromise = this.page.context().waitForEvent('page');
    await this.eyeIconForForm(form.formId).click();

    const input = PdfValidator.buildInput(form);
    const result = await PdfValidator.captureAndValidate(newPagePromise, input);

    if (result.passed) {
      this.log(`PDF validation passed for: ${form.formId}`);
    } else {
      this.log(`PDF validation FAILED for: ${form.formId}. Failures: ${result.failures.join('; ')}`);
    }

    return result;
  }

  // ── Assertions ─────────────────────────────────────────────────────────────

  /**
   * Asserts that a mandatory form checkbox is checked and disabled
   * (cannot be unchecked by the user).
   */
  async assertMandatoryFormIsLocked(formIdOrNumber: string): Promise<void> {
    const cb = this.mandatoryFormCheckbox(formIdOrNumber);
    await this.page.waitForFunction(
      async () => {
        const el = await cb.elementHandle();
        return el !== null;
      }
    );
    // Mandatory forms must be checked
    const checked  = await cb.isChecked();
    const disabled = await cb.isDisabled();

    if (!checked) {
      throw new Error(`Mandatory form "${formIdOrNumber}" should be checked but isn't`);
    }
    if (!disabled) {
      throw new Error(`Mandatory form "${formIdOrNumber}" should be disabled (read-only) but isn't`);
    }
    this.log(`✅ Mandatory form "${formIdOrNumber}" is checked and locked`);
  }

  /**
   * Asserts that an optional form checkbox is currently checked.
   */
  async assertOptionalFormIsSelected(formIdOrNumber: string): Promise<void> {
    const cb = this.optionalFormCheckbox(formIdOrNumber);
    const checked = await cb.isChecked();
    if (!checked) {
      throw new Error(`Optional form "${formIdOrNumber}" should be checked but isn't`);
    }
    this.log(`✅ Optional form "${formIdOrNumber}" is selected`);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Resolves the best available Playwright Locator for a field.
   *
   * Priority:
   *   1. getByLabel(fieldName) — most readable
   *   2. First valid CSS selector from Field ID / Key column
   *   3. Fallback: label text heuristic
   */
  private async resolveFieldLocator(field: ExtendedFormFieldDefinition): Promise<Locator> {
    // Try aria-label / label
    const byLabel = this.page.getByLabel(field.fieldName, { exact: false });
    if (await byLabel.count() > 0) return byLabel.first();

    // Try each CSS selector from fieldIdKey (comma-separated)
    if (field.fieldIdKey) {
      const selectors = field.fieldIdKey.split(',').map(s => s.trim()).filter(Boolean);
      for (const sel of selectors) {
        try {
          const loc = this.page.locator(sel);
          if (await loc.count() > 0) return loc.first();
        } catch {
          // Invalid CSS — try the next one
        }
      }
    }

    // Last resort: visible element whose label contains the field name
    this.log(`Warning: could not resolve locator for "${field.fieldName}" — using text heuristic`);
    return this.page
      .locator(`label:has-text("${field.fieldName}") + input, label:has-text("${field.fieldName}") + textarea`);
  }

  protected log(message: string): void {
    console.log(`[FormsPage] ${message}`);
  }
}
