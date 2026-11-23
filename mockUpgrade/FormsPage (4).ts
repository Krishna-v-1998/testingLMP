/**
 * FormsPage.ts
 *
 * Page Object for the "Forms" tab within a Quote / Binder / Policy.
 *
 * ── NEW FLOW (15-column manifest) ────────────────────────────────────────────
 *
 *  1. Navigate to Forms tab.
 *  2. Select a Formset via radio button.
 *  3. Validate mandatory / optional forms are listed correctly.
 *  4. Click "View Form Fields" → panel/modal opens with selected form list.
 *  5. Click each form name in the list → its fields expand.
 *  6. Fill non-mapped fields; read and verify mapped fields (auto-populated).
 *  7. Click the Eye Icon next to each form name → PDF viewer opens.
 *  8. Run PDF comparison (mock or real) against live UI values.
 *
 * ── MOCK vs REAL mode ────────────────────────────────────────────────────────
 *
 *  Set USE_MOCK_PDF=true (or PDF_VIEWER_AVAILABLE=false) to run without a live
 *  PDF viewer.  The mock compares:
 *    test-data/mock-pdfs/template/<UnqorkFormNumber>.pdf  ({{variables}})
 *    test-data/mock-pdfs/preview/<UnqorkFormNumber>.pdf   (values substituted)
 *
 *  Generate both PDFs with:   npx tsx scripts/generate-mock-pdfs.ts
 *
 *  Override directories:
 *    MOCK_PDF_DIR=path/to/mock-pdfs
 *    MOCK_PDF_TEMPLATE_DIR=path/to/template
 *    MOCK_PDF_PREVIEW_DIR=path/to/preview
 */

import { type Locator, expect, type TestInfo } from '@playwright/test';
import { BasePage }                             from './base/BasePage';
import { PdfValidator }                         from '../utils/PdfValidator';
import { MockPdfValidator }                     from '../utils/MockPdfValidator';
import type { FormEntry, FormsetGroup }         from '../types/forms.types';
import * as path                                from 'path';
import * as fs                                  from 'fs';

// ── Environment ───────────────────────────────────────────────────────────────

const USE_MOCK_PDF =
  process.env.USE_MOCK_PDF === 'true' ||
  process.env.PDF_VIEWER_AVAILABLE === 'false';

const _mockPdfBase = process.env.MOCK_PDF_DIR
  ?? path.resolve(process.cwd(), 'test-data', 'mock-pdfs');

const MOCK_PDF_TEMPLATE_DIR =
  process.env.MOCK_PDF_TEMPLATE_DIR ?? path.join(_mockPdfBase, 'template');

const MOCK_PDF_PREVIEW_DIR =
  process.env.MOCK_PDF_PREVIEW_DIR ?? path.join(_mockPdfBase, 'preview');

// ── FormsPage ─────────────────────────────────────────────────────────────────

export class FormsPage extends BasePage {

  // ── Tab ───────────────────────────────────────────────────────────────────

  get tabForms(): Locator {
    return this.page.getByRole('tab', { name: /^forms$/i });
  }

  async goToFormsTab(): Promise<void> {
    this.log('Navigating to Forms tab');
    await this.tabForms.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ── Formset radio buttons ─────────────────────────────────────────────────

  /**
   * Returns the radio button for the given formset name.
   * Formsets are rendered as a group of radio buttons — one per formset.
   */
  formsetRadio(formsetName: string): Locator {
    return this.page
      .getByRole('radio', { name: formsetName })
      .or(
        this.page.locator(`label`).filter({ hasText: formsetName })
          .locator('input[type="radio"]'),
      )
      .first();
  }

  /**
   * Selects a formset radio button by name and waits for the form list to refresh.
   */
  async selectFormset(formsetName: string): Promise<void> {
    this.log(`Selecting formset: "${formsetName}"`);
    const radio = this.formsetRadio(formsetName);
    await radio.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Asserts that the given formset radio button is selected.
   */
  async assertFormsetSelected(formsetName: string): Promise<void> {
    await expect(
      this.formsetRadio(formsetName),
      `Formset radio "${formsetName}" should be selected`,
    ).toBeChecked();
  }

  // ── Form list ─────────────────────────────────────────────────────────────

  /**
   * Locates a form row in the form list by display label or form name.
   * The display label is "<lotusNotesFormId> - <formName>".
   */
  formRow(displayLabelOrName: string): Locator {
    return this.page
      .getByRole('row').filter({ hasText: displayLabelOrName })
      .or(this.page.locator('li, .form-item, [data-form]').filter({ hasText: displayLabelOrName }))
      .first();
  }

  /** Checkbox or toggle for a form in the list (selects/deselects the form) */
  formCheckbox(displayLabelOrName: string): Locator {
    return this.formRow(displayLabelOrName).getByRole('checkbox').first();
  }

  async selectForm(displayLabelOrName: string): Promise<void> {
    const cb = this.formCheckbox(displayLabelOrName);
    if (!(await cb.isChecked())) await cb.click();
  }

  async deselectForm(displayLabelOrName: string): Promise<void> {
    const cb = this.formCheckbox(displayLabelOrName);
    if (await cb.isChecked()) await cb.click();
  }

  // ── View Form Fields panel ────────────────────────────────────────────────

  /** "View Form Fields" button that opens the selected-forms panel */
  get viewFormFieldsButton(): Locator {
    return this.page
      .getByRole('button', { name: /view form fields/i })
      .or(this.page.locator('[data-testid="view-form-fields"]'))
      .first();
  }

  async clickViewFormFields(): Promise<void> {
    this.log('Clicking "View Form Fields"');
    await this.viewFormFieldsButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Within the View Form Fields panel, locates a form by its display label.
   * Clicking the name expands the field list for that form.
   */
  formNameInPanel(displayLabel: string): Locator {
    return this.page
      .locator('.form-fields-panel, [data-testid="form-fields-panel"], aside, dialog')
      .getByText(displayLabel, { exact: false })
      .first();
  }

  /** Eye icon next to a form name in the View Form Fields panel */
  eyeIconInPanel(displayLabel: string): Locator {
    const panelRow = this.page
      .locator('.form-fields-panel, [data-testid="form-fields-panel"], aside, dialog')
      .locator(':is(li, tr, div)').filter({ hasText: displayLabel })
      .first();

    return panelRow
      .getByRole('button', { name: /preview|view|eye/i })
      .or(panelRow.locator('[data-testid*="eye"], [aria-label*="preview"], [title*="preview"], svg[class*="eye"]'))
      .first();
  }

  /**
   * Expands the field list for a form in the View Form Fields panel by clicking its name.
   */
  async expandFormInPanel(displayLabel: string): Promise<void> {
    this.log(`Expanding form in panel: "${displayLabel}"`);
    await this.formNameInPanel(displayLabel).click();
    await this.page.waitForTimeout(500); // allow expand animation
  }

  // ── Field interaction (inside expanded form panel) ────────────────────────

  /**
   * Reads the current value of a field by its CSS selector / field ID.
   * Mapped fields are read-only (auto-populated from another module).
   */
  async readFieldValue(fieldId: string, fieldType: string): Promise<string> {
    if (!fieldId) return '';
    const locator = this.page.locator(fieldId).first();

    try {
      switch (fieldType.toLowerCase()) {
        case 'checkbox':
          return (await locator.isChecked()) ? 'Yes' : 'No';
        case 'radio':
          // find the checked radio in the group
          return await this.page.locator(`${fieldId}:checked`).first().inputValue().catch(() => '');
        case 'dropdown':
          return await locator.inputValue().catch(async () => {
            return await locator.locator('option:checked').textContent().then(t => t?.trim() ?? '') ?? '';
          });
        default: // Textfield, Date, Textarea
          return await locator.inputValue().catch(
            async () => await locator.textContent().then(t => t?.trim() ?? '') ?? '',
          );
      }
    } catch {
      this.warn(`Could not read field value for "${fieldId}" (${fieldType})`);
      return '';
    }
  }

  /**
   * Fills a form field. Skips mapped fields (they are auto-populated).
   *
   * @param fieldId    CSS selector for the field (e.g. "#field123")
   * @param fieldType  Dropdown | Textfield | Checkbox | Date | Radio | Textarea
   * @param value      Value to enter
   * @param mapping    When non-empty, the field is mapped — skip fill, only verify
   */
  async fillField(
    fieldId:   string,
    fieldType: string,
    value:     string,
    mapping:   string,
  ): Promise<string> {
    if (!fieldId || !value) return '';

    if (mapping) {
      // Mapped field: read and return the existing value for later verification
      this.log(`Mapped field "${fieldId}" — reading existing value (not filling)`);
      return this.readFieldValue(fieldId, fieldType);
    }

    const locator = this.page.locator(fieldId).first();

    try {
      switch (fieldType.toLowerCase()) {
        case 'checkbox': {
          const isChecked = await locator.isChecked();
          const shouldCheck = value.toLowerCase() === 'yes' || value === 'true' || value === '1';
          if (isChecked !== shouldCheck) await locator.click();
          break;
        }
        case 'radio': {
          const radioOption = this.page.locator(`input[type="radio"][name="${fieldId.replace(/^#/, '')}"][value="${value}"]`)
            .or(this.page.locator(`${fieldId} input[type="radio"]`).filter({ hasText: value }))
            .first();
          await radioOption.click();
          break;
        }
        case 'dropdown': {
          await locator.selectOption({ label: value }).catch(
            async () => await locator.selectOption({ value }),
          );
          break;
        }
        case 'date': {
          await locator.fill(value);
          await locator.press('Tab'); // trigger date picker validation
          break;
        }
        default: // Textfield, Textarea
          await locator.fill(value);
      }
    } catch {
      this.warn(`Could not fill field "${fieldId}" (${fieldType}) with value "${value}"`);
    }

    return value;
  }

  // ── Manifest-driven validation ────────────────────────────────────────────

  /**
   * Validates the forms list UI for a given formset group:
   *   - Mandatory forms must be visible and pre-checked.
   *   - Optional forms must be visible.
   */
  async validateFormsetGroup(group: FormsetGroup): Promise<void> {
    this.log(`Validating formset group: "${group.formsetName}" ` +
      `(${group.mandatoryForms.length} mandatory, ${group.optionalForms.length} optional)`);

    const allForms = [...group.mandatoryForms, ...group.optionalForms];

    for (const form of allForms) {
      const label = form.displayLabel || form.formName;

      await expect(
        this.formRow(label),
        `Form "${label}" should be visible in the form list`,
      ).toBeVisible({ timeout: 10_000 });

      if (form.category === 'Mandatory') {
        await expect(
          this.formCheckbox(label),
          `Mandatory form "${label}" should be pre-checked`,
        ).toBeChecked();
      }
    }

    this.log(`Formset group "${group.formsetName}" validated`);
  }

  /**
   * Full flow for a single form in the View Form Fields panel:
   *
   *  1. Expand the form by clicking its name in the panel.
   *  2. Collect field values (fill non-mapped fields, read mapped fields).
   *  3. Click the Eye Icon next to the form name.
   *  4. Run mock or real PDF comparison.
   *  5. Assert the comparison passed.
   *
   * @param form       FormEntry from the manifest.
   * @param fieldValues Optional pre-filled values { fieldLabel → value } to use
   *                   instead of filling. Useful when values come from another page.
   * @param testInfo   Optional Playwright TestInfo for attaching failure details.
   */
  async validateFormPdf(
    form:        FormEntry,
    fieldValues?: Record<string, string>,
    testInfo?:   TestInfo,
  ): Promise<void> {
    const label = form.displayLabel || form.formName;
    this.log(`Validating PDF for form: ${form.unqorkFormNumber} — ${label}`);

    // ── 1. Expand form in panel ───────────────────────────────────────────
    await this.expandFormInPanel(label);

    // ── 2. Collect / fill field values ────────────────────────────────────
    const liveValues: Record<string, string> = { ...(fieldValues ?? {}) };

    for (const field of form.fields) {
      if (!field.fieldId) continue;

      if (field.mapping) {
        // Mapped: read the auto-populated value and store for PDF comparison
        const existing = await this.readFieldValue(field.fieldId, field.fieldType);
        liveValues[field.fieldLabel] = existing;
        this.log(`  Mapped field "${field.fieldLabel}": "${existing}"`);
      } else if (!liveValues[field.fieldLabel]) {
        // Non-mapped and no pre-supplied value: read whatever is currently there
        liveValues[field.fieldLabel] = await this.readFieldValue(field.fieldId, field.fieldType);
      }
    }

    // ── 3. Click Eye Icon → PDF viewer ───────────────────────────────────
    if (USE_MOCK_PDF) {
      await this.runMockPdfValidation(form, liveValues, testInfo);
    } else {
      await this.runRealPdfValidation(form, liveValues, testInfo);
    }

    this.log(`PDF validation passed for form: ${form.unqorkFormNumber}`);
  }

  /**
   * Validates ALL formset groups from the manifest end-to-end:
   *   For each group → select the formset radio → validate the form list →
   *   open View Form Fields → validate each form's PDF.
   */
  async validateAllFormsetGroups(
    groups:    FormsetGroup[],
    testInfo?: TestInfo,
  ): Promise<void> {
    this.log(`Validating ${groups.length} formset group(s)`);

    for (const group of groups) {
      // Select the formset via radio button
      await this.selectFormset(group.formsetName);
      await this.assertFormsetSelected(group.formsetName);

      // Validate form list
      await this.validateFormsetGroup(group);

      // Open "View Form Fields" panel
      await this.clickViewFormFields();

      // Validate each form PDF
      const allForms = [...group.mandatoryForms, ...group.optionalForms];
      for (const form of allForms) {
        await this.validateFormPdf(form, undefined, testInfo);
      }
    }

    this.log('All formset groups validated');
  }

  // ── PDF comparison implementations ────────────────────────────────────────

  private async runMockPdfValidation(
    form:       FormEntry,
    liveValues: Record<string, string>,
    testInfo?:  TestInfo,
  ): Promise<void> {
    const templatePdfPath = path.join(MOCK_PDF_TEMPLATE_DIR, `${form.unqorkFormNumber}.pdf`);
    const previewPdfPath  = path.join(MOCK_PDF_PREVIEW_DIR,  `${form.unqorkFormNumber}.pdf`);

    if (!fs.existsSync(templatePdfPath) || !fs.existsSync(previewPdfPath)) {
      const missing: string[] = [];
      if (!fs.existsSync(templatePdfPath)) missing.push(`template: ${templatePdfPath}`);
      if (!fs.existsSync(previewPdfPath))  missing.push(`preview: ${previewPdfPath}`);
      this.warn(
        `Mock PDF(s) not found for ${form.unqorkFormNumber} — skipping PDF validation.\n` +
        `  Missing: ${missing.join(', ')}\n` +
        `  Run: npx tsx scripts/generate-mock-pdfs.ts`,
      );
      return;
    }

    // requiredStatements from the manifest (Type=statement rows) are verified as
    // additional phrase checks on top of the template→preview variable comparison.
    const mockResult = await MockPdfValidator.comparePdfs({
      templatePdfPath,
      previewPdfPath,
      values:              liveValues,
      requiredStatements:  form.requiredStatements ?? [],
    });

    MockPdfValidator.printReport(mockResult);

    if (testInfo) {
      await testInfo.attach(`MockPDF-rendered-${form.unqorkFormNumber}`, {
        body:        mockResult.renderedText,
        contentType: 'text/plain',
      });
      await testInfo.attach(`MockPDF-preview-${form.unqorkFormNumber}`, {
        body:        mockResult.previewText,
        contentType: 'text/plain',
      });
      if (!mockResult.passed) {
        await testInfo.attach(`MockPDF-failures-${form.unqorkFormNumber}`, {
          body:        mockResult.failures.map(f => `✗ ${f.label}\n  actual: ${f.actual}`).join('\n'),
          contentType: 'text/plain',
        });
      }
    }

    expect(
      mockResult.passed,
      `Mock PDF comparison failed for form ${form.unqorkFormNumber}:\n` +
      mockResult.failures.map(f => `  ✗ ${f.label}`).join('\n'),
    ).toBe(true);
  }

  private async runRealPdfValidation(
    form:       FormEntry,
    liveValues: Record<string, string>,
    testInfo?:  TestInfo,
  ): Promise<void> {
    const label = form.displayLabel || form.formName;
    const newPagePromise = this.page.context().waitForEvent('page');

    await this.eyeIconInPanel(label).click();

    // Build PdfValidationInput from the new FormEntry shape.
    // requiredStatements come from Type=statement rows in the Excel manifest.
    const input = {
      formNumber:           form.unqorkFormNumber,
      formName:             form.formName,
      additionalStatements: form.requiredStatements ?? [],
      fieldValues: form.fields.map(f => ({
        fieldName:     f.fieldLabel,
        pdfLabel:      f.fieldLabel + ':',
        expectedValue: liveValues[f.fieldLabel] ?? '',
      })),
    };
    const result = await PdfValidator.captureAndValidate(newPagePromise, input);

    if (!result.passed && testInfo) {
      await testInfo.attach(`PDF-failures-${form.unqorkFormNumber}`, {
        body:        result.failures.join('\n'),
        contentType: 'text/plain',
      });
      await testInfo.attach(`PDF-text-${form.unqorkFormNumber}`, {
        body:        result.pdfText.substring(0, 10_000),
        contentType: 'text/plain',
      });
    }

    expect(
      result.passed,
      `PDF validation failed for form ${form.unqorkFormNumber}:\n${result.failures.join('\n')}`,
    ).toBe(true);
  }

  // ── Simple assertion helpers ──────────────────────────────────────────────

  async assertFormVisible(displayLabelOrName: string): Promise<void> {
    await expect(
      this.formRow(displayLabelOrName),
      `Form "${displayLabelOrName}" should be visible`,
    ).toBeVisible();
  }

  async assertFormChecked(displayLabelOrName: string): Promise<void> {
    await expect(
      this.formCheckbox(displayLabelOrName),
      `Form "${displayLabelOrName}" should be checked`,
    ).toBeChecked();
  }

  async assertFormUnchecked(displayLabelOrName: string): Promise<void> {
    await expect(
      this.formCheckbox(displayLabelOrName),
      `Form "${displayLabelOrName}" should not be checked`,
    ).not.toBeChecked();
  }
}
