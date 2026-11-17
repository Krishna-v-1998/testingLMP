/**
 * FormsPage.ts
 *
 * Page Object for the "Forms" tab within a Quote / Binder / Policy.
 *
 * Responsibilities:
 *   1. Navigate to the Forms tab.
 *   2. Validate the displayed form list against a FormManifest from Excel.
 *   3. Click the eye / preview icon for each form.
 *   4. Run PdfValidator against the opened PDF using live UI field values.
 */

import { type Locator, expect, type TestInfo } from '@playwright/test';
import { BasePage }                             from './base/BasePage';
import { PdfValidator }                         from '../utils/PdfValidator';
import { MockPdfValidator }                     from '../utils/MockPdfValidator';
import { MockPdfViewer }                        from '../utils/MockPdfViewer';
import type { FormManifestEntry }               from '../types/forms.types';
import * as path                                from 'path';

/**
 * When USE_MOCK_PDF=true (or PDF_VIEWER_AVAILABLE=false), FormsPage.validateFormPdf()
 * reads from a local mock template file instead of opening a real PDF viewer tab.
 *
 * Template file naming convention:
 *   test-data/mock-templates/<formNumber>.txt
 *   e.g. test-data/mock-templates/BR-001.txt
 *
 * Override the directory with env var:  MOCK_TEMPLATE_DIR=path/to/templates
 */
const USE_MOCK_PDF = process.env.USE_MOCK_PDF === 'true'
  || process.env.PDF_VIEWER_AVAILABLE === 'false';

const MOCK_TEMPLATE_DIR = process.env.MOCK_TEMPLATE_DIR
  ?? path.resolve(process.cwd(), 'test-data', 'mock-templates');

export class FormsPage extends BasePage {

  // ── Tab ───────────────────────────────────────────────────────────────────

  get tabForms(): Locator {
    return this.page.getByRole('tab', { name: /^forms$/i });
  }

  // ── Forms table helpers ───────────────────────────────────────────────────

  /** Row for a form identified by its number or display name */
  formRow(formNumberOrName: string): Locator {
    return this.page.getByRole('row').filter({ hasText: formNumberOrName }).first();
  }

  /** Checkbox inside a form row (for select/deselect) */
  formCheckbox(formNumberOrName: string): Locator {
    return this.formRow(formNumberOrName).getByRole('checkbox').first();
  }

  /** Eye-icon / Preview button inside a form row */
  eyeIconForForm(formNumberOrName: string): Locator {
    return this.formRow(formNumberOrName)
      .getByRole('button', { name: /preview|view|eye/i })
      .or(
        this.formRow(formNumberOrName)
          .locator('[data-testid*="eye"], [aria-label*="preview"], [title*="preview"]')
      )
      .first();
  }

  // ── High-level actions ────────────────────────────────────────────────────

  async goToFormsTab(): Promise<void> {
    this.log('Going to Forms tab');
    await this.tabForms.click();
    await this.page.waitForLoadState('networkidle');
  }

  async selectForm(formNumberOrName: string): Promise<void> {
    this.log(`Selecting form: ${formNumberOrName}`);
    const cb = this.formCheckbox(formNumberOrName);
    if (!(await cb.isChecked())) await cb.click();
  }

  async deselectForm(formNumberOrName: string): Promise<void> {
    this.log(`Deselecting form: ${formNumberOrName}`);
    const cb = this.formCheckbox(formNumberOrName);
    if (await cb.isChecked()) await cb.click();
  }

  // ── Manifest-driven validation ────────────────────────────────────────────

  /**
   * Validates the entire forms list against the manifest:
   *   - Every form in the manifest must be visible in the UI.
   *   - Mandatory forms must be pre-checked; Optional forms may be checked or not.
   *
   * @param entries   Forms for this product/sub-segment from the Excel manifest.
   */
  async validateFormsListAgainstManifest(entries: FormManifestEntry[]): Promise<void> {
    this.log(`Validating ${entries.length} forms against manifest`);

    for (const entry of entries) {
      // 1. Form label visible
      await expect(
        this.formRow(entry.formName),
        `Form "${entry.formName}" (${entry.formNumber}) should appear in the Forms tab`,
      ).toBeVisible({ timeout: 10_000 });

      // 2. Mandatory forms pre-checked
      if (entry.mandatoryOptional === 'Mandatory') {
        await expect(
          this.formCheckbox(entry.formName),
          `Mandatory form "${entry.formName}" should be pre-checked`,
        ).toBeChecked();
      }
    }

    this.log('Forms list manifest validation passed');
  }

  /**
   * For a single form:
   *   1. Reads live values from the UI using selectors in the manifest entry.
   *   2. Sets up new-tab listener.
   *   3. Clicks the eye icon.
   *   4. Runs PdfValidator.captureAndValidate().
   *   5. Asserts the result passes, attaching failures to testInfo if supplied.
   *
   * @param entry     The manifest entry for this specific form.
   * @param testInfo  Optional Playwright TestInfo for attaching failure details.
   */
  async validateFormPdf(
    entry:    FormManifestEntry,
    testInfo?: TestInfo,
  ): Promise<void> {
    this.log(`Validating PDF for form: ${entry.formNumber} — ${entry.formName}`);

    // ── Collect live UI values via manifest selectors ─────────────────────
    const liveValues: Record<string, string> = {};

    for (const field of entry.fields) {
      if (!field.fieldSelector) continue;

      try {
        const locator = this.page.locator(field.fieldSelector).first();

        switch (field.fieldType) {
          case 'checkbox':
            liveValues[field.fieldName] = (await locator.isChecked()) ? 'Yes' : 'No';
            break;
          case 'select':
            liveValues[field.fieldName] = await locator.inputValue();
            break;
          default: // text, date
            liveValues[field.fieldName] = await locator.inputValue()
              .catch(async () => await locator.textContent() ?? '');
        }
      } catch {
        this.warn(`Could not read UI value for field "${field.fieldName}" using selector "${field.fieldSelector}"`);
        liveValues[field.fieldName] = '';
      }
    }

    if (USE_MOCK_PDF) {
      // ── MOCK MODE: compare template file vs rendered values (no real viewer) ──
      const templateFile = path.join(MOCK_TEMPLATE_DIR, `${entry.formNumber}.txt`);

      if (!require('fs').existsSync(templateFile)) {
        this.warn(
          `Mock template not found: ${templateFile} — skipping PDF validation for ${entry.formNumber}. ` +
          `Create test-data/mock-templates/${entry.formNumber}.txt to enable it.`,
        );
        return;
      }

      // Build required statements from manifest additionalStatements
      const requiredStatements = entry.additionalStatements ?? [];

      const mockResult = MockPdfValidator.compare({
        templatePath:       templateFile,
        values:             liveValues,
        requiredStatements,
      });

      MockPdfValidator.printReport(mockResult);

      // Attach rendered text for visibility in Playwright report
      if (testInfo) {
        await testInfo.attach(`MockPDF-rendered-${entry.formNumber}`, {
          body:        mockResult.renderedText,
          contentType: 'text/plain',
        });
        if (!mockResult.passed) {
          await testInfo.attach(`MockPDF-failures-${entry.formNumber}`, {
            body:        mockResult.failures.map(f => `✗ ${f.label}\n  ${f.detail ?? ''}`).join('\n'),
            contentType: 'text/plain',
          });
        }
      }

      expect(
        mockResult.passed,
        `Mock PDF comparison failed for form ${entry.formNumber}:\n` +
        mockResult.failures.map(f => `  ✗ ${f.label}`).join('\n'),
      ).toBe(true);

    } else {
      // ── REAL MODE: open PDF viewer tab and run PdfValidator ───────────────
      const newPagePromise = this.page.context().waitForEvent('page');

      await this.eyeIconForForm(entry.formName).click();

      // Build validation input from manifest + live values
      const input = PdfValidator.buildInputFromManifest(entry, liveValues);

      // Run the validator
      const result = await PdfValidator.captureAndValidate(newPagePromise, input);

      // Attach failure detail to test report
      if (!result.passed && testInfo) {
        await testInfo.attach(`PDF-failures-${entry.formNumber}`, {
          body:        result.failures.join('\n'),
          contentType: 'text/plain',
        });
        await testInfo.attach(`PDF-text-${entry.formNumber}`, {
          body:        result.pdfText.substring(0, 10_000),
          contentType: 'text/plain',
        });
      }

      expect(
        result.passed,
        `PDF validation failed for form ${entry.formNumber}:\n${result.failures.join('\n')}`,
      ).toBe(true);
    }

    this.log(`PDF validation passed for form: ${entry.formNumber}`);
  }

  /**
   * Validates ALL forms in the manifest end-to-end:
   *   1. Checks the forms list UI vs manifest.
   *   2. For each form, clicks eye icon and validates the PDF.
   *
   * Call this after navigating to the Forms tab.
   */
  async validateAllFormsFromManifest(
    entries:  FormManifestEntry[],
    testInfo?: TestInfo,
  ): Promise<void> {
    await this.validateFormsListAgainstManifest(entries);

    for (const entry of entries) {
      await this.validateFormPdf(entry, testInfo);
    }
  }

  // ── Simple assertion helpers ──────────────────────────────────────────────

  async assertFormVisible(formNumberOrName: string): Promise<void> {
    await expect(
      this.formRow(formNumberOrName),
      `Form "${formNumberOrName}" should be visible`,
    ).toBeVisible();
  }

  async assertFormSelected(formNumberOrName: string): Promise<void> {
    await expect(
      this.formCheckbox(formNumberOrName),
      `Form "${formNumberOrName}" should be checked`,
    ).toBeChecked();
  }

  /**
   * Legacy helper kept for backward compatibility:
   * Clicks the eye icon and optionally attaches a screenshot.
   */
  async clickEyeAndValidatePdf(
    formNumberOrName: string,
    testInfo?: TestInfo,
  ): Promise<void> {
    this.log(`Previewing form: ${formNumberOrName}`);
    const newPagePromise = this.page.context().waitForEvent('page', { timeout: 10_000 }).catch(() => null);

    await this.eyeIconForForm(formNumberOrName).click();
    const newPage = await newPagePromise;

    if (newPage && testInfo) {
      const screenshot = await newPage.screenshot();
      await testInfo.attach(`${formNumberOrName}-preview`, {
        body: screenshot,
        contentType: 'image/png',
      });
      await newPage.close();
    }
  }
}
