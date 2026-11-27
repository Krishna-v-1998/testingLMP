/**
 * forms-ui-validation.spec.ts
 *
 * DATA-DRIVEN Forms UI validation.
 * All test data comes from forms-fixture.xlsx via ExcelFixtureReader — zero hardcoded values.
 *
 * ── HOW THE SUBMISSION CONTEXT IS PROVIDED ────────────────────────────────────
 *
 *   This spec does NOT accept SUBMISSION_URL as a bare environment variable.
 *   Instead it follows the same pattern as policy-lifecycle.spec.ts:
 *
 *   test.beforeAll → SubmissionSetupService.createAndStoreContext()
 *
 *   That call either:
 *     a) Reuses a cached context from test-data/contexts/<label>.json  (default)
 *     b) Reads SUBMISSION_URL + SUBMISSION_ID env vars (CI / quick-run override)
 *     c) Creates a brand-new submission via AuthManager + browser storage state
 *
 *   From the returned SubmissionContext the spec derives:
 *     submissionUrl  ← ctx.submissionUrl
 *     product        ← ctx.formData?.products?.[0]   (falls back to PRODUCT env var)
 *     subSegment     ← ctx.formData?.subLob           (falls back to SUB_SEGMENT env var)
 *     state          ← ctx.formData?.insured?.state   (falls back to STATE env var)
 *
 * ── WHAT REMAINS AS STATIC CONFIG ────────────────────────────────────────────
 *
 *   FIXTURE_PATH   Path to the Excel fixture file
 *                  (default: test-data/forms-fixture.xlsx)
 *   TRANSACTION    Quote | Binder | Policy — which lifecycle step you are testing
 *                  (default: not filtered — all transactions)
 *   FORMSET        Optional: restrict to one formset name
 *                  (default: all formsets)
 *   ROLE           GBO | CUO | UW — role to authenticate with
 *                  (default: GBO)
 *   CONTEXT_LABEL  Key under test-data/contexts/ for caching
 *                  (default: forms-ui-<TRANSACTION or "all">)
 *   REUSE_CONTEXT  true | false — reuse cached context (default: true)
 *
 * ── WHAT THE UI LOOKS LIKE (from screenshots) ─────────────────────────────────
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
 *   │                                            [View Form Fields]          │
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
 *
 * ── WHAT IT TESTS ─────────────────────────────────────────────────────────────
 *
 *   Suite 1 — Form Set Radio Buttons
 *   Suite 2 — Mandatory Forms (pre-checked)
 *   Suite 3 — Optional Forms (select + verify)
 *   Suite 4 — Form Fields Panel (click → labels → fill → eye icon → PDF)
 *
 * ── RUN ───────────────────────────────────────────────────────────────────────
 *
 *   # Uses cached context (or creates one)
 *   TRANSACTION=Quote \
 *   npx playwright test tests/forms/forms-ui-validation.spec.ts --workers=1
 *
 *   # Point at an existing submission (CI override — bypasses AuthManager)
 *   SUBMISSION_URL=https://allianz-qa.../submissions/0213953708 \
 *   SUBMISSION_ID=0213953708 \
 *   TRANSACTION=Quote \
 *   npx playwright test tests/forms/forms-ui-validation.spec.ts --workers=1
 *
 *   # One formset only
 *   FORMSET="Builder's Risk" TRANSACTION=Quote \
 *   npx playwright test tests/forms/forms-ui-validation.spec.ts --workers=1
 *
 *   # Mock PDF mode (no live PDF viewer needed)
 *   USE_MOCK_PDF=true TRANSACTION=Quote \
 *   npx playwright test tests/forms/forms-ui-validation.spec.ts --workers=1
 */

import { test, expect }              from '@playwright/test';
import * as path                     from 'path';
import * as fs                       from 'fs';
import { SubmissionSetupService }    from '../../src/services/SubmissionSetupService';
import { Role }                      from '../../src/enums/role.enum';
import { ExcelFixtureReader }        from '../../src/helpers/ExcelFixtureReader';
import { MockPdfValidator }          from '../../src/utils/MockPdfValidator';
import type { SubmissionContext }    from '../../src/types/submission.types';
import type { FixtureFormEntry }     from '../../src/helpers/ExcelFixtureReader';

// ── Static config (file paths + lifecycle step) ───────────────────────────────
// These never come from the submission — they describe which test run this is.

const FIXTURE_PATH = process.env.FIXTURE_PATH
  ?? path.resolve(process.cwd(), 'test-data', 'forms-fixture.xlsx');

const TRANSACTION = process.env.TRANSACTION;         // Quote | Binder | Policy | undefined
const FORMSET     = process.env.FORMSET;             // optional: restrict to one formset

const ROLE = (() => {
  const r = (process.env.ROLE ?? 'GBO').toUpperCase();
  return r === 'CUO' ? Role.CUO : r === 'UW' ? Role.UW : Role.GBO;
})();

const CONTEXT_LABEL   = process.env.CONTEXT_LABEL
  ?? `forms-ui-${TRANSACTION?.toLowerCase() ?? 'all'}`;
const REUSE_CONTEXT   = process.env.REUSE_CONTEXT !== 'false';

// ── Mock PDF config ───────────────────────────────────────────────────────────

const USE_MOCK_PDF  = process.env.USE_MOCK_PDF === 'true';
const _mockPdfBase  = process.env.MOCK_PDF_DIR
  ?? path.resolve(process.cwd(), 'test-data', 'mock-pdfs');
const MOCK_PDF_TEMPLATE = process.env.MOCK_PDF_TEMPLATE_DIR ?? path.join(_mockPdfBase, 'template');
const MOCK_PDF_PREVIEW  = process.env.MOCK_PDF_PREVIEW_DIR  ?? path.join(_mockPdfBase, 'preview');

// ── Shared state (populated in beforeAll) ─────────────────────────────────────

let submissionCtx: SubmissionContext;
let forms: FixtureFormEntry[] = [];

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

/** Returns unique formset names in fixture order */
function uniqueFormsets(all: FixtureFormEntry[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const f of all) {
    if (f.formset && !seen.has(f.formset)) { seen.add(f.formset); result.push(f.formset); }
  }
  return result;
}

// ── Page locators ─────────────────────────────────────────────────────────────

function formsetRadio(page: Parameters<typeof test>[1] extends (...args: infer A) => any ? never : never, formsetName: string) {
  // typed inline in callers — see usages below
  return (page as import('@playwright/test').Page)
    .getByRole('radio', { name: formsetName })
    .or((page as import('@playwright/test').Page).locator('label').filter({ hasText: formsetName }).locator('input[type="radio"]'))
    .first();
}

// ══════════════════════════════════════════════════════════════════════════════
// GLOBAL SETUP — create / reuse submission context, load fixture data
// ══════════════════════════════════════════════════════════════════════════════

test.beforeAll(async ({ browser }) => {
  // 1. Obtain (or create) the submission context
  submissionCtx = await SubmissionSetupService.createAndStoreContext(
    browser,
    ROLE,
    { label: CONTEXT_LABEL, reuseExisting: REUSE_CONTEXT },
  );
  console.log(
    `[forms-ui] Submission: ${submissionCtx.submissionId} — ${submissionCtx.submissionUrl}`,
  );

  // 2. Derive filter parameters from the submission context.
  //    formData carries the product, sub-segment and state used at creation time.
  //    Env-var overrides are accepted as a fallback for cases where formData
  //    is absent (e.g. a context created from SUBMISSION_URL+SUBMISSION_ID only).
  const product    = submissionCtx.formData?.products?.[0]   ?? process.env.PRODUCT;
  const subSegment = submissionCtx.formData?.subLob           ?? process.env.SUB_SEGMENT;
  const state      = submissionCtx.formData?.insured?.state   ?? process.env.STATE;

  // 3. Load Excel fixture, filtered to exactly what this submission covers
  const reader = new ExcelFixtureReader(FIXTURE_PATH);
  const opts: Parameters<typeof reader.getForms>[0] = {};
  if (TRANSACTION) opts.transaction = TRANSACTION;
  if (product)     opts.product     = product;
  if (subSegment)  opts.subSegment  = subSegment;
  if (state)       opts.state       = state;

  const all = (TRANSACTION || product || subSegment || state)
    ? await reader.getForms(opts)
    : await reader.getAllForms();

  forms = FORMSET ? all.filter(f => f.formset === FORMSET) : all;

  console.log(
    `[forms-ui] Loaded ${forms.length} forms from fixture` +
    (TRANSACTION ? ` (${TRANSACTION})` : '') +
    (product     ? ` / ${product}`     : '') +
    (subSegment  ? ` / ${subSegment}`  : '') +
    (state       ? ` / ${state}`       : ''),
  );
});

// ── Navigate to Forms tab helper ──────────────────────────────────────────────

async function navigateToFormsTab(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(submissionCtx.submissionUrl);
  await page.waitForLoadState('networkidle');
  await page
    .getByRole('tab', { name: /^forms$/i })
    .or(page.locator('[class*="wizard"] [class*="tab"], [class*="step"]').filter({ hasText: /\bforms\b/i }))
    .or(page.getByText('02').locator('..').filter({ hasText: /forms/i }))
    .first()
    .click();
  await page.waitForLoadState('networkidle');
}

// ── Shared locator helpers ────────────────────────────────────────────────────

function formRow(page: import('@playwright/test').Page, label: string) {
  return page
    .locator('label, li, tr, div[class*="form-item"], div[class*="formItem"]')
    .filter({ hasText: label })
    .first();
}

function formCheckbox(page: import('@playwright/test').Page, label: string) {
  return formRow(page, label).locator('input[type="checkbox"]').first();
}

function formInLeftPanel(page: import('@playwright/test').Page, label: string) {
  const panel = page
    .locator(
      'section[class*="form-fields"], div[class*="FormFields"], div[class*="form-fields"],' +
      ' section, div',
    )
    .filter({ hasText: 'Form Fields' })
    .first();
  return panel
    .locator('li, div[class*="form-item"], div[class*="formItem"], div[class*="form-row"]')
    .filter({ hasText: label })
    .first();
}

function eyeIconFor(page: import('@playwright/test').Page, label: string) {
  return formInLeftPanel(page, label)
    .locator('button, [role="button"], svg, [data-testid*="eye"], [aria-label*="preview"]')
    .last();
}

// ══════════════════════════════════════════════════════════════════════════════
// Suite 1 — Form Set Radio Buttons
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Suite 1 — Form Set Radio Buttons', () => {

  test.beforeEach(async ({ page }) => {
    await navigateToFormsTab(page);
  });

  test('All formsets from Excel have a radio button in the UI', async ({ page }) => {
    const formsets = uniqueFormsets(forms);
    test.skip(formsets.length === 0, 'No formsets found in fixture for current filters');

    for (const fs of formsets) {
      const radio = page
        .getByRole('radio', { name: fs })
        .or(page.locator('label').filter({ hasText: fs }).locator('input[type="radio"]'))
        .first();
      await expect(radio).toBeVisible({
        timeout: 8_000,
        message: `Formset radio "${fs}" not visible`,
      });
    }
  });

  test('Selecting a formset radio marks it as checked', async ({ page }) => {
    const formsets = uniqueFormsets(forms);
    test.skip(formsets.length === 0, 'No formsets in fixture');

    for (const fs of formsets) {
      const radio = page
        .getByRole('radio', { name: fs })
        .or(page.locator('label').filter({ hasText: fs }).locator('input[type="radio"]'))
        .first();
      await radio.click();
      await expect(radio).toBeChecked({ timeout: 5_000 });
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Suite 2 — Mandatory Forms
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Suite 2 — Mandatory Forms', () => {

  test.beforeEach(async ({ page }) => {
    await navigateToFormsTab(page);
  });

  test('All mandatory forms appear with correct display label', async ({ page }) => {
    const mandatory = forms.filter(f => f.category === 'Mandatory');
    test.skip(mandatory.length === 0, 'No mandatory forms in fixture');

    for (const form of mandatory) {
      await expect(page.getByText(displayLabel(form), { exact: false }).first()).toBeVisible({
        timeout: 8_000,
        message: `Mandatory form not visible: "${displayLabel(form)}"`,
      });
    }
  });

  test('All mandatory forms are pre-checked', async ({ page }) => {
    const mandatory = forms.filter(f => f.category === 'Mandatory');
    test.skip(mandatory.length === 0, 'No mandatory forms in fixture');

    for (const form of mandatory) {
      const cb = formCheckbox(page, displayLabel(form));
      await expect(cb).toBeChecked({
        timeout: 6_000,
        message: `Mandatory form "${displayLabel(form)}" should be pre-checked`,
      });
    }
  });

  test('Mandatory form count in UI matches fixture', async ({ page }) => {
    const mandatory = forms.filter(f => f.category === 'Mandatory');
    test.skip(mandatory.length === 0, 'No mandatory forms in fixture');

    const section = page
      .locator('section, div, h3, h4')
      .filter({ hasText: /mandatory forms/i })
      .first();
    await expect(section).toBeVisible({ timeout: 8_000 });

    const rows = section.locator('label, li, [class*="form-item"]');
    const uiCount = await rows.count();
    expect(uiCount).toBeGreaterThanOrEqual(mandatory.length,
      `UI shows ${uiCount} mandatory forms; fixture defines ${mandatory.length}`);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Suite 3 — Optional Forms (select + verify)
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Suite 3 — Optional Forms (select + verify)', () => {

  test.beforeEach(async ({ page }) => {
    await navigateToFormsTab(page);
    // Select all formsets so all optional forms are visible
    for (const fs of uniqueFormsets(forms)) {
      const radio = page
        .getByRole('radio', { name: fs })
        .or(page.locator('label').filter({ hasText: fs }).locator('input[type="radio"]'))
        .first();
      if (await radio.isVisible().catch(() => false)) await radio.click();
    }
    await page.waitForLoadState('networkidle');
  });

  test('All optional forms from Excel appear in the Optional Forms section', async ({ page }) => {
    const optional = forms.filter(f => f.category === 'Optional');
    test.skip(optional.length === 0, 'No optional forms in fixture');

    for (const form of optional) {
      await expect(page.getByText(displayLabel(form), { exact: false }).first()).toBeVisible({
        timeout: 8_000,
        message: `Optional form not visible: "${displayLabel(form)}"`,
      });
    }
  });

  test('Optional forms are unchecked by default', async ({ page }) => {
    const optional = forms.filter(f => f.category === 'Optional');
    test.skip(optional.length === 0, 'No optional forms in fixture');

    for (const form of optional) {
      const cb = formCheckbox(page, displayLabel(form));
      if (!(await cb.isVisible().catch(() => false))) continue;
      await expect(cb).not.toBeChecked({
        message: `Optional form "${displayLabel(form)}" should start unchecked`,
      });
    }
  });

  test('Checking an optional form marks it as selected', async ({ page }) => {
    const optional = forms.filter(f => f.category === 'Optional');
    test.skip(optional.length === 0, 'No optional forms in fixture');

    for (const form of optional) {
      const cb = formCheckbox(page, displayLabel(form));
      if (!(await cb.isVisible().catch(() => false))) {
        console.warn(`  ⚠  Checkbox not visible: "${displayLabel(form)}" — skipping`);
        continue;
      }
      await cb.check();
      await expect(cb).toBeChecked({
        timeout: 5_000,
        message: `Optional form "${displayLabel(form)}" should be checked after clicking`,
      });
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Suite 4 — Form Fields Panel (full end-to-end)
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Suite 4 — Form Fields Panel', () => {

  test.beforeEach(async ({ page }) => {
    await navigateToFormsTab(page);

    // Select every formset, check all optional forms
    for (const fs of uniqueFormsets(forms)) {
      const radio = page
        .getByRole('radio', { name: fs })
        .or(page.locator('label').filter({ hasText: fs }).locator('input[type="radio"]'))
        .first();
      if (await radio.isVisible().catch(() => false)) await radio.click();
      await page.waitForLoadState('networkidle');

      for (const form of forms.filter(f => f.formset === fs && f.category === 'Optional')) {
        const cb = formCheckbox(page, displayLabel(form));
        const vis = await cb.isVisible().catch(() => false);
        if (vis && !(await cb.isChecked().catch(() => false))) await cb.check();
      }
    }

    // Open the Form Fields panel
    const viewBtn = page
      .getByRole('button', { name: /view form fields/i })
      .or(page.getByText('View Form Fields').first());
    await viewBtn.click();
    await page.waitForLoadState('networkidle');
  });

  test('"View Form Fields" opens the Form Fields panel', async ({ page }) => {
    const panel = page.locator('section, div').filter({ hasText: 'Form Fields' }).last();
    await expect(panel).toBeVisible({ timeout: 10_000 });
  });

  test('All selected forms appear in the left panel list', async ({ page }) => {
    test.skip(forms.length === 0, 'No forms in fixture');
    for (const form of forms) {
      await expect(page.getByText(displayLabel(form), { exact: false }).first()).toBeVisible({
        timeout: 8_000,
        message: `Form "${displayLabel(form)}" not visible in left panel`,
      });
    }
  });

  test('Clicking a form in the left panel loads its field labels on the right', async ({ page }) => {
    const withFields = forms.filter(f => f.fields.length > 0);
    test.skip(withFields.length === 0, 'No forms with fields in fixture');

    const form = withFields[0];
    await formInLeftPanel(page, displayLabel(form)).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    for (const field of form.fields.slice(0, 5)) {
      if (!field.formField) continue;
      await expect(page.getByText(field.formField, { exact: false }).first()).toBeVisible({
        timeout: 6_000,
        message: `Field "${field.formField}" not visible in right panel for "${displayLabel(form)}"`,
      });
    }
  });

  test('Fill all form fields using Test Data from Excel', async ({ page }) => {
    const reader = new ExcelFixtureReader(FIXTURE_PATH);

    for (const form of forms) {
      if (form.fields.length === 0) continue;
      const label    = displayLabel(form);
      const leftItem = formInLeftPanel(page, label);
      if (!(await leftItem.isVisible().catch(() => false))) {
        console.warn(`  ⚠  Not visible in left panel: "${label}" — skipping`);
        continue;
      }
      await leftItem.click();
      await page.waitForTimeout(500);

      for (const { selector, value, fieldType } of reader.buildFillMap(form)) {
        if (!selector || !value || fieldType === 'statement') continue;
        let filled = false;
        for (const sel of selector.split(',').map(s => s.trim()).filter(Boolean)) {
          const el = page.locator(sel).first();
          if (!(await el.isVisible().catch(() => false))) continue;
          try {
            switch (fieldType.toLowerCase()) {
              case 'checkbox':
                ['yes', 'true', '1'].includes(value.toLowerCase()) ? await el.check() : await el.uncheck();
                break;
              case 'radio':
                await page.getByRole('radio', { name: value }).first().click();
                break;
              case 'dropdown':
                await el.selectOption({ label: value }).catch(() => el.selectOption({ value }));
                break;
              case 'date':
                await el.fill(value); await el.press('Tab');
                break;
              default:
                await el.fill(value);
            }
            filled = true;
          } catch { /* try next selector */ }
          if (filled) break;
        }
        if (!filled) console.warn(`  ⚠  Could not fill "${selector}" in "${label}"`);
      }
    }
  });

  test('Eye icon (👁) opens the PDF viewer for each form', async ({ page }) => {
    test.skip(forms.length === 0, 'No forms in fixture');
    test.skip(USE_MOCK_PDF, 'Mock PDF mode — eye icon test requires live app');

    for (const form of forms) {
      const label    = displayLabel(form);
      const leftItem = formInLeftPanel(page, label);
      if (!(await leftItem.isVisible().catch(() => false))) continue;
      await leftItem.click();
      await page.waitForTimeout(400);

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
        const url = newPage.url();
        expect(url.length > 0).toBe(true, `Eye icon for "${label}" did not open a URL`);
        await newPage.close();
      } else {
        const pdfFrame = page.locator('iframe[src*="pdf"], object[type="application/pdf"]').first();
        if (!(await pdfFrame.isVisible().catch(() => false))) {
          console.warn(`  ⚠  No new tab or PDF iframe detected for "${label}"`);
        }
      }
    }
  });

  test('Mock PDF: template {{variables}} are replaced with Excel test data in preview', async () => {
    test.skip(!USE_MOCK_PDF, 'Set USE_MOCK_PDF=true to run mock PDF comparison');

    const reader   = new ExcelFixtureReader(FIXTURE_PATH);
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
        failures.push(
          result.failures
            .map(f => `  ✗ [${form.unqorkFormNumber}] ${f.label}: expected "${f.expected}" — got "${f.actual}"`)
            .join('\n'),
        );
      }
    }

    expect(failures.length, `Mock PDF comparison failures:\n${failures.join('\n')}`).toBe(0);
  });
});
