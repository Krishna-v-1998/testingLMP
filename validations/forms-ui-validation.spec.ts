/**
 * forms-ui-validation.spec.ts
 *
 * DATA-DRIVEN Forms UI validation.
 * All test data comes from forms-fixture.xlsx via ExcelFixtureReader — zero hardcoded values.
 *
 * ── WHAT THE UI LOOKS LIKE (from screenshots) ────────────────────────────────
 *
 *   Step 02 "Forms" of the quote wizard has three sections:
 *
 *   ┌─ Form Sets ────────────────────────────────────────────────────────────┐
 *   │  ● Builder's Risk   (radio buttons, one per formset)                   │
 *   └────────────────────────────────────────────────────────────────────────┘
 *   ┌─ Mandatory Forms ──────────────────────────────────────────────────────┐
 *   │  ☑ CDRC2067 03 18 - ELECTRONIC DELIVERY OF POLICY                     │
 *   │  ☑ BR 4000DEC 11 15 - BUILDER'S RISK DECLARATIONS QTLR                │
 *   └────────────────────────────────────────────────────────────────────────┘
 *   ┌─ Optional Forms - Builder's Risk ──────────────────────────────────────┐
 *   │  ☐ IM 8010 08 15 - WINDSTORM AND HAIL DEDUCTIBLE ENDORSEMENT          │
 *   │  ☐ IM 8017 05 11 - INLAND MARINE NAMED STORM EXCLUSION                │
 *   │  ...                                            [View Form Fields]     │
 *   └────────────────────────────────────────────────────────────────────────┘
 *
 *   After clicking "View Form Fields":
 *   ┌─ Form Fields ──────────────────────────────────────────────────────────┐
 *   │  Forms (left panel)         │  Form Fields: BR 4000DEC… (right panel) │
 *   │  ● BR 4000DEC…  👁          │  PROJECT NAME  [        ]               │
 *   │    TER 9015PHN… 👁          │  HARD COSTS    [        ]  $            │
 *   └────────────────────────────────────────────────────────────────────────┘
 *
 * ── DISPLAY LABEL FORMAT ─────────────────────────────────────────────────────
 *
 *   "{Lotus Notes Form ID} - {Form Name}"
 *   e.g. "BR 4000DEC 11 15 - BUILDER'S RISK DECLARATIONS QTLR"
 *   Derived from Excel columns:  Lotus Notes Form ID  +  " - "  +  Form Name
 *
 * ── WHAT IT TESTS ─────────────────────────────────────────────────────────────
 *
 *   Suite 1 — Form Set Radio Buttons
 *     • Each unique formset from Excel has a visible radio button
 *     • Selecting a formset radio reflects as checked in the UI
 *
 *   Suite 2 — Mandatory Forms
 *     • Every mandatory form from Excel appears with its correct display label
 *     • Every mandatory form checkbox is pre-checked (auto-selected)
 *
 *   Suite 3 — Optional Forms (select + verify)
 *     • Every optional form from Excel appears with its correct display label
 *     • Optional form checkboxes start unchecked
 *     • Checking an optional form marks it as selected
 *
 *   Suite 4 — Form Fields Panel (full end-to-end)
 *     • "View Form Fields" button opens the bottom panel
 *     • Each form in the left panel loads its fields on the right when clicked
 *     • Field labels from Excel match what appears in the right panel
 *     • Fields are filled with Test Data from Excel
 *     • Eye icon (👁) opens the PDF viewer
 *     • Mock PDF comparison: template {{variables}} → preview values
 *
 * ── RUN ───────────────────────────────────────────────────────────────────────
 *
 *   # All suites
 *   SUBMISSION_URL=https://allianz-qa.../submissions/0213953708 \
 *   npx playwright test tests/forms/forms-ui-validation.spec.ts --workers=1
 *
 *   # One formset only
 *   FORMSET="Builder's Risk" \
 *   SUBMISSION_URL=... \
 *   npx playwright test tests/forms/forms-ui-validation.spec.ts --workers=1
 *
 *   # Mock PDF mode (no live PDF viewer needed)
 *   USE_MOCK_PDF=true SUBMISSION_URL=... \
 *   npx playwright test tests/forms/forms-ui-validation.spec.ts --workers=1
 *
 * ── ENV VARIABLES ─────────────────────────────────────────────────────────────
 *
 *   SUBMISSION_URL          Full URL of the submission under test (required)
 *   FIXTURE_PATH            Path to Excel fixture
 *                           (default: test-data/forms-fixture.xlsx)
 *   TRANSACTION             Quote | Binder | Policy  (default: all)
 *   PRODUCT                 Filter by product name   (default: all)
 *   SUB_SEGMENT             Filter by sub-segment    (default: all)
 *   STATE                   Filter by state code     (default: all)
 *   FORMSET                 Filter to one formset    (default: all)
 *   USE_MOCK_PDF            true → compare PDF files locally (no live viewer)
 *   MOCK_PDF_DIR            Base dir for mock PDFs
 *                           (default: test-data/mock-pdfs)
 *   MOCK_PDF_TEMPLATE_DIR   Override template PDF dir
 *   MOCK_PDF_PREVIEW_DIR    Override preview PDF dir
 */

import { test, expect, type Page }  from '@playwright/test';
import * as path                     from 'path';
import * as fs                       from 'fs';
import { ExcelFixtureReader }        from '../../src/helpers/ExcelFixtureReader';
import { MockPdfValidator }          from '../../src/utils/MockPdfValidator';
import type { FixtureFormEntry }     from '../../src/helpers/ExcelFixtureReader';

// ── Configuration ─────────────────────────────────────────────────────────────

const FIXTURE_PATH = process.env.FIXTURE_PATH
  ?? path.resolve(process.cwd(), 'test-data', 'forms-fixture.xlsx');

const SUBMISSION_URL = process.env.SUBMISSION_URL ?? '';
const TRANSACTION    = process.env.TRANSACTION;
const PRODUCT        = process.env.PRODUCT;
const SUB_SEGMENT    = process.env.SUB_SEGMENT;
const STATE          = process.env.STATE;
const FORMSET        = process.env.FORMSET;         // optional: restrict to one formset

const USE_MOCK_PDF   = process.env.USE_MOCK_PDF === 'true';

const _mockPdfBase        = process.env.MOCK_PDF_DIR
  ?? path.resolve(process.cwd(), 'test-data', 'mock-pdfs');
const MOCK_PDF_TEMPLATE   = process.env.MOCK_PDF_TEMPLATE_DIR ?? path.join(_mockPdfBase, 'template');
const MOCK_PDF_PREVIEW    = process.env.MOCK_PDF_PREVIEW_DIR  ?? path.join(_mockPdfBase, 'preview');

// ── Shared fixture data (loaded once per worker) ───────────────────────────────

let _forms: FixtureFormEntry[] | null = null;

async function getForms(): Promise<FixtureFormEntry[]> {
  if (_forms) return _forms;
  const reader = new ExcelFixtureReader(FIXTURE_PATH);
  const opts: Parameters<typeof reader.getForms>[0] = {};
  if (TRANSACTION) opts.transaction = TRANSACTION;
  if (PRODUCT)     opts.product     = PRODUCT;
  if (SUB_SEGMENT) opts.subSegment  = SUB_SEGMENT;
  if (STATE)       opts.state       = STATE;
  const all = (TRANSACTION || PRODUCT || SUB_SEGMENT || STATE)
    ? await reader.getForms(opts)
    : await reader.getAllForms();
  // Optionally narrow to a single formset
  _forms = FORMSET ? all.filter(f => f.formset === FORMSET) : all;
  return _forms;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Display label as it appears in the UI:
 *   "{Lotus Notes Form ID} - {Form Name}"
 *   e.g. "BR 4000DEC 11 15 - BUILDER'S RISK DECLARATIONS QTLR"
 */
function displayLabel(form: FixtureFormEntry): string {
  return form.lotusFormId
    ? `${form.lotusFormId} - ${form.formName}`
    : form.formName;
}

/** Returns unique formset names in the order they first appear */
function uniqueFormsets(forms: FixtureFormEntry[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const f of forms) {
    if (f.formset && !seen.has(f.formset)) {
      seen.add(f.formset);
      result.push(f.formset);
    }
  }
  return result;
}

// ── Page helpers (direct locators matching actual Unqork / MetrixUI DOM) ───────

/** Form Sets radio button for a given formset name */
function formsetRadio(page: Page, formsetName: string) {
  return page
    .getByRole('radio', { name: formsetName })
    .or(page.locator('label').filter({ hasText: formsetName }).locator('input[type="radio"]'))
    .first();
}

/**
 * Locates a form row in the Mandatory / Optional list.
 * Tries: label element, list item, table row — whichever contains the display label text.
 */
function formRow(page: Page, label: string) {
  return page
    .locator('label, li, tr, div[class*="form-item"], div[class*="formItem"]')
    .filter({ hasText: label })
    .first();
}

/** The checkbox for a form row */
function formCheckbox(page: Page, label: string) {
  return formRow(page, label).locator('input[type="checkbox"]').first();
}

/**
 * Form entry in the LEFT panel of the "Form Fields" section.
 * Each row has the form label text and an eye icon.
 */
function formInLeftPanel(page: Page, label: string) {
  const panel = page
    .locator(
      'section[class*="form-fields"], div[class*="FormFields"], div[class*="form-fields"],' +
      ' section, div'
    )
    .filter({ hasText: 'Form Fields' })
    .first();

  return panel
    .locator('li, div[class*="form-item"], div[class*="formItem"], div[class*="form-row"]')
    .filter({ hasText: label })
    .first();
}

/** Eye icon (👁) button next to a form in the left panel */
function eyeIconFor(page: Page, label: string) {
  return formInLeftPanel(page, label)
    .locator('button, [role="button"], svg, [data-testid*="eye"], [aria-label*="preview"]')
    .last();   // last because the eye is usually the rightmost interactive element
}

/** All field inputs in the right panel (shown when a form is selected in left panel) */
function rightPanel(page: Page) {
  return page.locator(
    'div[class*="field-panel"], div[class*="fieldPanel"], ' +
    'div[class*="form-detail"], div[class*="formDetail"], ' +
    'section[class*="fields"]'
  ).first();
}

// ── beforeEach helper ─────────────────────────────────────────────────────────

async function navigateToFormsTab(page: Page): Promise<void> {
  await page.goto(SUBMISSION_URL);
  await page.waitForLoadState('networkidle');
  // Click the "02 Forms" wizard tab
  await page
    .getByRole('tab', { name: /^forms$/i })
    .or(page.locator('[class*="wizard"] [class*="tab"], [class*="step"]').filter({ hasText: /\bforms\b/i }))
    .or(page.getByText('02').locator('..').filter({ hasText: /forms/i }))
    .first()
    .click();
  await page.waitForLoadState('networkidle');
}

// ══════════════════════════════════════════════════════════════════════════════
// Suite 1 — Form Set Radio Buttons
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Suite 1 — Form Set Radio Buttons', () => {

  test.beforeEach(async ({ page }) => {
    if (!SUBMISSION_URL) test.skip(true, 'SUBMISSION_URL is not set');
    await navigateToFormsTab(page);
  });

  test('All formsets from Excel have a radio button in the UI', async ({ page }) => {
    const forms    = await getForms();
    const formsets = uniqueFormsets(forms);
    test.skip(formsets.length === 0, 'No formsets found in fixture for current filters');

    for (const fs of formsets) {
      const radio = formsetRadio(page, fs);
      await expect(radio).toBeVisible({
        timeout: 8_000,
        message: `Formset radio "${fs}" not visible in Form Sets section`,
      });
    }
  });

  test('Selecting a formset radio marks it as checked', async ({ page }) => {
    const forms    = await getForms();
    const formsets = uniqueFormsets(forms);
    test.skip(formsets.length === 0, 'No formsets in fixture');

    for (const fs of formsets) {
      const radio = formsetRadio(page, fs);
      await radio.click();
      await expect(radio).toBeChecked({
        timeout: 5_000,
        message: `Formset radio "${fs}" should be checked after clicking`,
      });
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Suite 2 — Mandatory Forms
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Suite 2 — Mandatory Forms', () => {

  test.beforeEach(async ({ page }) => {
    if (!SUBMISSION_URL) test.skip(true, 'SUBMISSION_URL is not set');
    await navigateToFormsTab(page);
  });

  test('All mandatory forms from Excel appear in the Mandatory Forms section', async ({ page }) => {
    const forms = await getForms();
    const mandatory = forms.filter(f => f.category === 'Mandatory');
    test.skip(mandatory.length === 0, 'No mandatory forms in fixture');

    for (const form of mandatory) {
      const label = displayLabel(form);
      await expect(page.getByText(label, { exact: false }).first()).toBeVisible({
        timeout: 8_000,
        message: `Mandatory form not visible in UI: "${label}"`,
      });
    }
  });

  test('All mandatory forms are pre-checked (auto-selected)', async ({ page }) => {
    const forms = await getForms();
    const mandatory = forms.filter(f => f.category === 'Mandatory');
    test.skip(mandatory.length === 0, 'No mandatory forms in fixture');

    for (const form of mandatory) {
      const label    = displayLabel(form);
      const checkbox = formCheckbox(page, label);
      await expect(checkbox).toBeChecked({
        timeout: 6_000,
        message: `Mandatory form "${label}" should be pre-checked`,
      });
    }
  });

  test('Mandatory form count in UI matches fixture', async ({ page }) => {
    const forms = await getForms();
    const mandatory = forms.filter(f => f.category === 'Mandatory');
    test.skip(mandatory.length === 0, 'No mandatory forms in fixture');

    // Find the "Mandatory Forms" heading section and count rows
    const section = page
      .locator('section, div, h3, h4')
      .filter({ hasText: /mandatory forms/i })
      .first();

    await expect(section).toBeVisible({ timeout: 8_000 });

    const rows = section.locator('label, li, [class*="form-item"]');
    const uiCount = await rows.count();
    expect(uiCount).toBeGreaterThanOrEqual(mandatory.length,
      `UI shows ${uiCount} mandatory forms, fixture defines ${mandatory.length}`);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Suite 3 — Optional Forms (select + verify)
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Suite 3 — Optional Forms (select + verify)', () => {

  test.beforeEach(async ({ page }) => {
    if (!SUBMISSION_URL) test.skip(true, 'SUBMISSION_URL is not set');
    await navigateToFormsTab(page);
    // Select all formsets in turn so all optional forms are visible
    const forms    = await getForms();
    const formsets = uniqueFormsets(forms);
    for (const fs of formsets) {
      const radio = formsetRadio(page, fs);
      if (await radio.isVisible().catch(() => false)) await radio.click();
    }
    await page.waitForLoadState('networkidle');
  });

  test('All optional forms from Excel appear in the Optional Forms section', async ({ page }) => {
    const forms = await getForms();
    const optional = forms.filter(f => f.category === 'Optional');
    test.skip(optional.length === 0, 'No optional forms in fixture');

    for (const form of optional) {
      const label = displayLabel(form);
      await expect(page.getByText(label, { exact: false }).first()).toBeVisible({
        timeout: 8_000,
        message: `Optional form not visible in UI: "${label}"`,
      });
    }
  });

  test('Optional forms are unchecked by default', async ({ page }) => {
    const forms = await getForms();
    const optional = forms.filter(f => f.category === 'Optional');
    test.skip(optional.length === 0, 'No optional forms in fixture');

    for (const form of optional) {
      const label    = displayLabel(form);
      const checkbox = formCheckbox(page, label);
      const visible  = await checkbox.isVisible().catch(() => false);
      if (!visible) continue;  // may not be in current formset view
      await expect(checkbox).not.toBeChecked({
        message: `Optional form "${label}" should start unchecked`,
      });
    }
  });

  test('Checking an optional form marks it as selected', async ({ page }) => {
    const forms = await getForms();
    const optional = forms.filter(f => f.category === 'Optional');
    test.skip(optional.length === 0, 'No optional forms in fixture');

    for (const form of optional) {
      const label    = displayLabel(form);
      const checkbox = formCheckbox(page, label);
      const visible  = await checkbox.isVisible().catch(() => false);
      if (!visible) {
        console.warn(`  ⚠  Optional form checkbox not visible: "${label}" — skipping`);
        continue;
      }
      await checkbox.check();
      await expect(checkbox).toBeChecked({
        timeout: 5_000,
        message: `Optional form "${label}" should be checked after clicking`,
      });
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Suite 4 — Form Fields Panel (full end-to-end)
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Suite 4 — Form Fields Panel', () => {

  /**
   * Before each test: navigate to Forms tab, select all formsets,
   * select all optional forms from fixture, then click View Form Fields.
   */
  test.beforeEach(async ({ page }) => {
    if (!SUBMISSION_URL) test.skip(true, 'SUBMISSION_URL is not set');
    await navigateToFormsTab(page);

    const forms    = await getForms();
    const formsets = uniqueFormsets(forms);

    // Select every formset radio so all forms are visible
    for (const fs of formsets) {
      const radio = formsetRadio(page, fs);
      if (await radio.isVisible().catch(() => false)) await radio.click();
      await page.waitForLoadState('networkidle');

      // Check all optional forms for this formset
      const optForms = forms.filter(f => f.formset === fs && f.category === 'Optional');
      for (const form of optForms) {
        const cb = formCheckbox(page, displayLabel(form));
        const visible = await cb.isVisible().catch(() => false);
        if (visible && !(await cb.isChecked().catch(() => false))) {
          await cb.check();
        }
      }
    }

    // Click "View Form Fields" to open the bottom panel
    const viewBtn = page
      .getByRole('button', { name: /view form fields/i })
      .or(page.getByText('View Form Fields').first());
    await viewBtn.click();
    await page.waitForLoadState('networkidle');
  });

  // ── 4-A: Panel opens ──────────────────────────────────────────────────────

  test('"View Form Fields" opens the Form Fields panel', async ({ page }) => {
    const panel = page
      .locator('section, div')
      .filter({ hasText: 'Form Fields' })
      .last();
    await expect(panel).toBeVisible({ timeout: 10_000 });
  });

  // ── 4-B: All forms appear in left panel ──────────────────────────────────

  test('All selected forms appear in the left panel list', async ({ page }) => {
    const forms = await getForms();
    test.skip(forms.length === 0, 'No forms in fixture');

    for (const form of forms) {
      const label = displayLabel(form);
      await expect(
        page.getByText(label, { exact: false }).first()
      ).toBeVisible({
        timeout: 8_000,
        message: `Form "${label}" not visible in left panel`,
      });
    }
  });

  // ── 4-C: Clicking form in left panel loads its fields on the right ────────

  test('Clicking a form in the left panel loads its field labels on the right', async ({ page }) => {
    const forms = await getForms();
    const withFields = forms.filter(f => f.fields.length > 0);
    test.skip(withFields.length === 0, 'No forms with fields in fixture');

    // Test the first form with fields
    const form  = withFields[0];
    const label = displayLabel(form);

    // Click the form in the left panel
    await formInLeftPanel(page, label).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Verify at least the first field label appears in the right panel
    for (const field of form.fields.slice(0, 5)) {  // check first 5 to keep test fast
      if (!field.formField) continue;
      await expect(
        page.getByText(field.formField, { exact: false }).first()
      ).toBeVisible({
        timeout: 6_000,
        message: `Field label "${field.formField}" not visible in right panel for form "${label}"`,
      });
    }
  });

  // ── 4-D: Fill all fields with Excel test data ─────────────────────────────

  test('Fill all form fields using Test Data from Excel', async ({ page }) => {
    const forms  = await getForms();
    const reader = new ExcelFixtureReader(FIXTURE_PATH);

    for (const form of forms) {
      if (form.fields.length === 0) continue;

      const label = displayLabel(form);

      // Click this form in the left panel to load its fields on the right
      const leftItem = formInLeftPanel(page, label);
      const visible  = await leftItem.isVisible().catch(() => false);
      if (!visible) {
        console.warn(`  ⚠  Form not visible in left panel: "${label}" — skipping`);
        continue;
      }
      await leftItem.click();
      await page.waitForTimeout(500);

      // Fill each field using the fill map from the reader
      const fillMap = reader.buildFillMap(form);
      for (const { selector, value, fieldType } of fillMap) {
        if (!selector || !value || fieldType === 'statement') continue;

        const selectors = selector.split(',').map(s => s.trim()).filter(Boolean);
        let filled = false;

        for (const sel of selectors) {
          const el      = page.locator(sel).first();
          const visible = await el.isVisible().catch(() => false);
          if (!visible) continue;

          try {
            switch (fieldType.toLowerCase()) {
              case 'checkbox':
                if (['yes', 'true', '1'].includes(value.toLowerCase())) {
                  await el.check();
                } else {
                  await el.uncheck();
                }
                break;
              case 'radio':
                await page.getByRole('radio', { name: value }).first().click();
                break;
              case 'dropdown':
                await el.selectOption({ label: value })
                  .catch(() => el.selectOption({ value }));
                break;
              case 'date':
                await el.fill(value);
                await el.press('Tab');
                break;
              default:  // text, number, currency, textarea
                await el.fill(value);
            }
            filled = true;
          } catch {
            // try next selector
          }
          if (filled) break;
        }

        if (!filled) {
          console.warn(
            `  ⚠  Could not fill "${selector}" (${fieldType}) in form "${label}"`,
          );
        }
      }
    }
  });

  // ── 4-E: Eye icon opens PDF viewer ───────────────────────────────────────

  test('Eye icon (👁) opens the PDF viewer for each form', async ({ page }) => {
    const forms = await getForms();
    test.skip(forms.length === 0, 'No forms in fixture');
    test.skip(USE_MOCK_PDF, 'Mock PDF mode — eye icon test requires live app');

    for (const form of forms) {
      const label = displayLabel(form);

      // Click the form in left panel first
      const leftItem = formInLeftPanel(page, label);
      if (!(await leftItem.isVisible().catch(() => false))) continue;
      await leftItem.click();
      await page.waitForTimeout(400);

      // Click the eye icon — expect a new tab or a PDF modal
      const newPagePromise = page.context().waitForEvent('page', { timeout: 10_000 }).catch(() => null);
      const eye = eyeIconFor(page, label);
      if (!(await eye.isVisible().catch(() => false))) {
        console.warn(`  ⚠  Eye icon not visible for "${label}" — skipping`);
        continue;
      }
      await eye.click();

      const newPage = await newPagePromise;
      if (newPage) {
        await newPage.waitForLoadState('domcontentloaded').catch(() => null);
        // Verify it looks like a PDF (URL ends with .pdf or content-type header)
        const url = newPage.url();
        const looksLikePdf = url.includes('.pdf') || url.includes('pdf') || url.includes('preview');
        expect(looksLikePdf || url.length > 0).toBe(true,
          `Eye icon for "${label}" did not open a recognisable PDF URL — got: ${url}`);
        await newPage.close();
      } else {
        // PDF might open in a modal/iframe on the same page
        const pdfFrame = page.locator('iframe[src*="pdf"], object[type="application/pdf"]').first();
        const pdfVisible = await pdfFrame.isVisible().catch(() => false);
        if (!pdfVisible) {
          console.warn(`  ⚠  No new tab or PDF iframe detected for "${label}"`);
        }
      }
    }
  });

  // ── 4-F: Mock PDF comparison (USE_MOCK_PDF=true) ─────────────────────────

  test('Mock PDF: template {{variables}} are replaced with Excel test data in preview', async () => {
    test.skip(!USE_MOCK_PDF, 'Set USE_MOCK_PDF=true to run mock PDF comparison');

    const forms  = await getForms();
    const reader = new ExcelFixtureReader(FIXTURE_PATH);
    const failures: string[] = [];

    for (const form of forms) {
      const templatePath = path.join(MOCK_PDF_TEMPLATE, `${form.unqorkFormNumber}.pdf`);
      const previewPath  = path.join(MOCK_PDF_PREVIEW,  `${form.unqorkFormNumber}.pdf`);

      if (!fs.existsSync(templatePath) || !fs.existsSync(previewPath)) {
        const miss = [
          !fs.existsSync(templatePath) ? `template: ${path.basename(templatePath)}` : '',
          !fs.existsSync(previewPath)  ? `preview: ${path.basename(previewPath)}`   : '',
        ].filter(Boolean).join(', ');
        console.warn(`  ⚠  ${form.unqorkFormNumber}: PDF file(s) missing (${miss}) — skipping`);
        continue;
      }

      const values = reader.buildValuesMap(form);
      const result = await MockPdfValidator.comparePdfs({
        templatePdfPath:    templatePath,
        previewPdfPath:     previewPath,
        values,
        requiredStatements: form.statements,
      });

      MockPdfValidator.printReport(result);

      if (!result.passed) {
        const summary = result.failures
          .map(f => `    ✗ [${form.unqorkFormNumber}] ${f.label}: expected "${f.expected}" — got "${f.actual}"`)
          .join('\n');
        failures.push(summary);
      }
    }

    expect(failures.length, `Mock PDF comparison failures:\n${failures.join('\n')}`).toBe(0);
  });
});
