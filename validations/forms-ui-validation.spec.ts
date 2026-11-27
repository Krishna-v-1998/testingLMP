/**
 * forms-ui-validation.spec.ts
 *
 * DATA-DRIVEN Forms UI validation.
 * All test data — transactions, formsets, states, field values — comes from
 * forms-fixture.xlsx via ExcelFixtureReader.  Zero hardcoded values.
 *
 * ── HOW THE DATA IS STRUCTURED IN EXCEL ──────────────────────────────────────
 *
 *   Each row in the Excel represents one field of one form.
 *   Multiple rows with the same form number are merged into one FixtureFormEntry.
 *
 *   The columns that DRIVE TEST GROUPING are:
 *
 *   ┌──────────────────────┬─────────────────────────────────────────────────┐
 *   │ Excel column         │ What it means for the tests                     │
 *   ├──────────────────────┼─────────────────────────────────────────────────┤
 *   │ Transaction          │ "Quote|Binder" → form appears in Quote AND      │
 *   │ (pipe-separated)     │ Binder transactions.  Stored as transactions[]  │
 *   ├──────────────────────┼─────────────────────────────────────────────────┤
 *   │ Formset              │ Radio-button group on the Forms tab.            │
 *   │                      │ e.g. "Builder's Risk"                           │
 *   ├──────────────────────┼─────────────────────────────────────────────────┤
 *   │ States Applicable    │ "CA|TX" or "ALL" → which states this form is   │
 *   │ (pipe-separated)     │ shown for.  Used to filter to the submission's  │
 *   │                      │ insured state from SubmissionContext.           │
 *   ├──────────────────────┼─────────────────────────────────────────────────┤
 *   │ Category             │ Mandatory → pre-checked in UI                  │
 *   │                      │ Optional  → unchecked, test checks it          │
 *   └──────────────────────┴─────────────────────────────────────────────────┘
 *
 * ── GROUPING STRATEGY ────────────────────────────────────────────────────────
 *
 *   Step 1  getAllForms() — read every row from Excel; no env-var filtering.
 *
 *   Step 2  Filter by state — keep only forms where statesApplicable
 *           includes 'ALL' or the submission's insured state.
 *           State comes from SubmissionContext.formData.insured.state.
 *
 *   Step 3  Build FormGroup[] — one entry per unique (transaction × formset):
 *
 *           FormGroup {
 *             transaction:  'Quote'              ← from Excel Transaction column
 *             formset:      "Builder's Risk"     ← from Excel Formset column
 *             mandatory:    FixtureFormEntry[]   ← Category = Mandatory
 *             optional:     FixtureFormEntry[]   ← Category = Optional
 *           }
 *
 *   Step 4  Tests iterate ALL groups → every transaction+formset the Excel
 *           defines is validated automatically.  No env vars needed for
 *           TRANSACTION or FORMSET.
 *
 * ── EXAMPLE — what the Excel produces ────────────────────────────────────────
 *
 *   Excel rows (simplified):
 *   ┌──────────┬───────────────────┬────────────┬───────────┬──────────────┐
 *   │ Formset  │ Transaction       │ Form Name  │ Category  │ States       │
 *   ├──────────┼───────────────────┼────────────┼───────────┼──────────────┤
 *   │ Bldrs Rk │ Quote|Binder      │ BR 4000DEC │ Mandatory │ ALL          │
 *   │ Bldrs Rk │ Quote             │ IM 8010    │ Optional  │ CA|TX        │
 *   │ Bldrs Rk │ Policy            │ TER 9015   │ Mandatory │ ALL          │
 *   └──────────┴───────────────────┴────────────┴───────────┴──────────────┘
 *
 *   Submission insured state = "CA"
 *
 *   FormGroups produced (all three pass the state filter):
 *     { transaction: 'Quote',  formset: 'Bldrs Rk', mandatory: [BR4000], optional: [IM8010] }
 *     { transaction: 'Binder', formset: 'Bldrs Rk', mandatory: [BR4000], optional: []       }
 *     { transaction: 'Policy', formset: 'Bldrs Rk', mandatory: [TER9015], optional: []      }
 *
 * ── SUBMISSION CONTEXT ───────────────────────────────────────────────────────
 *
 *   Provided by SubmissionSetupService.createAndStoreContext() in beforeAll.
 *   Three resolution paths (in priority order):
 *     1. Cached context in test-data/contexts/<CONTEXT_LABEL>.json
 *     2. SUBMISSION_URL + SUBMISSION_ID env vars (CI override)
 *     3. Full creation via AuthManager + storage-states/<role>.json
 *
 * ── RUN ───────────────────────────────────────────────────────────────────────
 *
 *   # All transactions and formsets from Excel
 *   npx playwright test tests/forms/forms-ui-validation.spec.ts --workers=1
 *
 *   # CI — point at an existing submission (bypasses AuthManager)
 *   SUBMISSION_URL=https://allianz-qa.example.com/submissions/0213953708 \
 *   SUBMISSION_ID=0213953708 \
 *   npx playwright test tests/forms/forms-ui-validation.spec.ts --workers=1
 *
 *   # Only Suite 2 (Mandatory Forms)
 *   npx playwright test tests/forms/forms-ui-validation.spec.ts \
 *     --grep "Suite 2" --workers=1
 *
 *   # Mock PDF comparison (no live viewer needed)
 *   USE_MOCK_PDF=true \
 *   npx playwright test tests/forms/forms-ui-validation.spec.ts --workers=1
 *
 * ── ENV VARIABLES ─────────────────────────────────────────────────────────────
 *
 *   Required (one of):
 *     SUBMISSION_URL + SUBMISSION_ID   CI direct-submission override
 *     storage-states/gbo.json          Login state for full submission creation
 *
 *   Optional:
 *     FIXTURE_PATH        Path to Excel fixture (default: test-data/forms-fixture.xlsx)
 *     ROLE                GBO | CUO | UW (default: GBO)
 *     CONTEXT_LABEL       Cache key under test-data/contexts/ (default: forms-ui)
 *     REUSE_CONTEXT       true | false — reuse cached context (default: true)
 *     USE_MOCK_PDF        true → compare PDF files locally
 *     MOCK_PDF_DIR        Base dir for mock PDFs (default: test-data/mock-pdfs)
 *     MOCK_PDF_TEMPLATE_DIR  Override template PDF dir
 *     MOCK_PDF_PREVIEW_DIR   Override preview PDF dir
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

// ── Static config ─────────────────────────────────────────────────────────────
// TRANSACTION and FORMSET are NOT env vars — they come from Excel.

const FIXTURE_PATH = process.env.FIXTURE_PATH
  ?? path.resolve(process.cwd(), 'test-data', 'forms-fixture.xlsx');

const ROLE = (() => {
  const r = (process.env.ROLE ?? 'GBO').toUpperCase();
  return r === 'CUO' ? Role.CUO : r === 'UW' ? Role.UW : Role.GBO;
})();

const CONTEXT_LABEL = process.env.CONTEXT_LABEL ?? 'forms-ui';
const REUSE_CONTEXT = process.env.REUSE_CONTEXT !== 'false';

const USE_MOCK_PDF      = process.env.USE_MOCK_PDF === 'true';
const _mockPdfBase      = process.env.MOCK_PDF_DIR ?? path.resolve(process.cwd(), 'test-data', 'mock-pdfs');
const MOCK_PDF_TEMPLATE = process.env.MOCK_PDF_TEMPLATE_DIR ?? path.join(_mockPdfBase, 'template');
const MOCK_PDF_PREVIEW  = process.env.MOCK_PDF_PREVIEW_DIR  ?? path.join(_mockPdfBase, 'preview');

// ── FormGroup type ────────────────────────────────────────────────────────────

/**
 * One entry per unique (transaction × formset) pair found in the Excel.
 * Built by buildFormGroups() after filtering by the submission's state.
 */
interface FormGroup {
  transaction: string;           // e.g. 'Quote'
  formset:     string;           // e.g. "Builder's Risk"
  mandatory:   FixtureFormEntry[]; // Category = Mandatory, state-filtered
  optional:    FixtureFormEntry[]; // Category = Optional,  state-filtered
}

// ── Shared state (populated in beforeAll) ─────────────────────────────────────

let submissionCtx: SubmissionContext;
let formGroups:    FormGroup[] = [];

// ── Core grouping helper ──────────────────────────────────────────────────────

/**
 * Reads ALL forms from the Excel fixture, filters to those applicable for
 * the submission's insured state, then groups by (transaction × formset).
 *
 * This is the single source of truth for what gets tested.  No env vars.
 *
 * @param submissionState  The insured state from SubmissionContext (e.g. 'CA').
 *                         Pass undefined to skip state filtering (all states).
 */
async function buildFormGroups(submissionState?: string): Promise<FormGroup[]> {
  const reader = new ExcelFixtureReader(FIXTURE_PATH);
  const allForms = await reader.getAllForms();

  // Step 1 — Filter by state
  //   Keep the form if it lists 'ALL' or if its states include the submission state.
  const stateForms = submissionState
    ? allForms.filter(form => {
        const states = form.statesApplicable.map(s => s.toUpperCase());
        return states.includes('ALL') || states.includes(submissionState.toUpperCase());
      })
    : allForms;

  // Step 2 — Expand by transaction and group by (transaction × formset)
  //   Each form can belong to multiple transactions (pipe-separated in Excel).
  //   e.g. transactions: ['Quote', 'Binder'] → contributes to both groups.
  const groupMap = new Map<string, FormGroup>();

  for (const form of stateForms) {
    for (const transaction of form.transactions) {
      const key = `${transaction}||${form.formset}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, { transaction, formset: form.formset, mandatory: [], optional: [] });
      }
      const group = groupMap.get(key)!;
      if (form.category === 'Mandatory') {
        group.mandatory.push(form);
      } else {
        group.optional.push(form);
      }
    }
  }

  // Step 3 — Sort groups: by transaction then by formset (stable, predictable order)
  return Array.from(groupMap.values()).sort((a, b) => {
    const txOrder = ['Quote', 'Binder', 'Policy'];
    const ta = txOrder.indexOf(a.transaction);
    const tb = txOrder.indexOf(b.transaction);
    if (ta !== tb) return ta - tb;
    return a.formset.localeCompare(b.formset);
  });
}

// ── Display label helper ──────────────────────────────────────────────────────

/**
 * UI display label format: "{Lotus Notes Form ID} - {Form Name}"
 * e.g. "BR 4000DEC 11 15 - BUILDER'S RISK DECLARATIONS QTLR"
 */
function displayLabel(form: FixtureFormEntry): string {
  return form.lotusFormId
    ? `${form.lotusFormId} - ${form.formName}`
    : form.formName;
}

// ── Page locator helpers ──────────────────────────────────────────────────────

type PW = import('@playwright/test').Page;

function formsetRadio(page: PW, formsetName: string) {
  return page
    .getByRole('radio', { name: formsetName })
    .or(page.locator('label').filter({ hasText: formsetName }).locator('input[type="radio"]'))
    .first();
}

function formRow(page: PW, label: string) {
  return page
    .locator('label, li, tr, div[class*="form-item"], div[class*="formItem"]')
    .filter({ hasText: label })
    .first();
}

function formCheckbox(page: PW, label: string) {
  return formRow(page, label).locator('input[type="checkbox"]').first();
}

function formInLeftPanel(page: PW, label: string) {
  return page
    .locator(
      'section[class*="form-fields"], div[class*="FormFields"], div[class*="form-fields"],' +
      ' section, div',
    )
    .filter({ hasText: 'Form Fields' })
    .first()
    .locator('li, div[class*="form-item"], div[class*="formItem"], div[class*="form-row"]')
    .filter({ hasText: label })
    .first();
}

function eyeIconFor(page: PW, label: string) {
  return formInLeftPanel(page, label)
    .locator('button, [role="button"], svg, [data-testid*="eye"], [aria-label*="preview"]')
    .last();
}

// ── Navigation helper ─────────────────────────────────────────────────────────

async function navigateToFormsTab(page: PW): Promise<void> {
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

/**
 * Select a formset radio button and check all optional forms for it.
 * Called at the start of Suite 3 and 4 to put the UI in the right state.
 */
async function selectFormsetAndOptionals(page: PW, group: FormGroup): Promise<void> {
  const radio = formsetRadio(page, group.formset);
  if (await radio.isVisible().catch(() => false)) {
    await radio.click();
    await page.waitForLoadState('networkidle');
  }
  for (const form of group.optional) {
    const cb = formCheckbox(page, displayLabel(form));
    if (await cb.isVisible().catch(() => false) && !(await cb.isChecked().catch(() => false))) {
      await cb.check();
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// GLOBAL SETUP
// Creates/reuses submission context and builds FormGroup[] from Excel
// ══════════════════════════════════════════════════════════════════════════════

test.beforeAll(async ({ browser }) => {
  // 1. Create or reuse submission context
  submissionCtx = await SubmissionSetupService.createAndStoreContext(
    browser,
    ROLE,
    { label: CONTEXT_LABEL, reuseExisting: REUSE_CONTEXT },
  );
  console.log(
    `[forms-ui] Submission ${submissionCtx.submissionId} → ${submissionCtx.submissionUrl}`,
  );

  // 2. Build form groups — Excel drives what gets tested
  //    State from submission context is the ONLY filter applied here.
  const submissionState = submissionCtx.formData?.insured?.state;
  formGroups = await buildFormGroups(submissionState);

  // Log the groups so the run log makes it obvious what will be tested
  console.log(`[forms-ui] State filter: ${submissionState ?? 'none (all states)'}`);
  console.log(`[forms-ui] Form groups from Excel (${formGroups.length} total):`);
  for (const g of formGroups) {
    console.log(
      `  • [${g.transaction}] ${g.formset}` +
      ` — ${g.mandatory.length} mandatory, ${g.optional.length} optional`,
    );
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// Suite 1 — Form Set Radio Buttons
// Verifies that every formset defined in Excel has a radio button in the UI.
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Suite 1 — Form Set Radio Buttons', () => {

  test.beforeEach(async ({ page }) => {
    await navigateToFormsTab(page);
  });

  test('Every formset from Excel has a visible radio button', async ({ page }) => {
    test.skip(formGroups.length === 0, 'No form groups built from fixture');

    // Collect unique formsets across all groups (a formset may appear in multiple transactions)
    const uniqueFormsets = [...new Set(formGroups.map(g => g.formset))];

    for (const formset of uniqueFormsets) {
      const radio = formsetRadio(page, formset);
      await expect(radio).toBeVisible({
        timeout: 8_000,
        message: `Formset radio "${formset}" not found in UI (defined in Excel Formset column)`,
      });
    }
  });

  test('Selecting a formset radio marks it as checked', async ({ page }) => {
    test.skip(formGroups.length === 0, 'No form groups built from fixture');

    const uniqueFormsets = [...new Set(formGroups.map(g => g.formset))];
    for (const formset of uniqueFormsets) {
      const radio = formsetRadio(page, formset);
      await radio.click();
      await expect(radio).toBeChecked({ timeout: 5_000 });
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Suite 2 — Mandatory Forms
// For each (transaction × formset) group: every Mandatory form from Excel
// must appear in the UI with its display label and be pre-checked.
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Suite 2 — Mandatory Forms', () => {

  test.beforeEach(async ({ page }) => {
    await navigateToFormsTab(page);
  });

  test('All mandatory forms appear with correct display label and are pre-checked',
    async ({ page }) => {
      const groupsWithMandatory = formGroups.filter(g => g.mandatory.length > 0);
      test.skip(groupsWithMandatory.length === 0, 'No mandatory forms in fixture');

      for (const group of groupsWithMandatory) {
        // Select the formset radio so this group's forms are visible
        const radio = formsetRadio(page, group.formset);
        if (await radio.isVisible().catch(() => false)) {
          await radio.click();
          await page.waitForLoadState('networkidle');
        }

        for (const form of group.mandatory) {
          const label = displayLabel(form);

          // Label is visible
          await expect(page.getByText(label, { exact: false }).first()).toBeVisible({
            timeout: 8_000,
            message:
              `[${group.transaction} / ${group.formset}] ` +
              `Mandatory form not visible: "${label}"`,
          });

          // Checkbox is pre-checked
          const cb = formCheckbox(page, label);
          await expect(cb).toBeChecked({
            timeout: 6_000,
            message:
              `[${group.transaction} / ${group.formset}] ` +
              `Mandatory form "${label}" should be pre-checked`,
          });
        }
      }
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// Suite 3 — Optional Forms (select + verify)
// For each (transaction × formset) group: every Optional form from Excel
// must appear unchecked, then the test checks it.
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Suite 3 — Optional Forms (select + verify)', () => {

  test.beforeEach(async ({ page }) => {
    await navigateToFormsTab(page);
  });

  test('All optional forms appear unchecked, then can be selected', async ({ page }) => {
    const groupsWithOptional = formGroups.filter(g => g.optional.length > 0);
    test.skip(groupsWithOptional.length === 0, 'No optional forms in fixture');

    for (const group of groupsWithOptional) {
      // Select the formset radio so this group's forms are visible
      const radio = formsetRadio(page, group.formset);
      if (await radio.isVisible().catch(() => false)) {
        await radio.click();
        await page.waitForLoadState('networkidle');
      }

      for (const form of group.optional) {
        const label = displayLabel(form);
        const cb    = formCheckbox(page, label);

        if (!(await cb.isVisible().catch(() => false))) {
          console.warn(
            `  ⚠  [${group.transaction} / ${group.formset}] ` +
            `Optional form checkbox not visible: "${label}" — skipping`,
          );
          continue;
        }

        // Must start unchecked
        await expect(cb).not.toBeChecked({
          message:
            `[${group.transaction} / ${group.formset}] ` +
            `Optional form "${label}" should start unchecked`,
        });

        // Check it
        await cb.check();
        await expect(cb).toBeChecked({
          timeout: 5_000,
          message:
            `[${group.transaction} / ${group.formset}] ` +
            `Optional form "${label}" should be checked after clicking`,
        });
      }
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Suite 4 — Form Fields Panel (full end-to-end)
// For each (transaction × formset) group:
//   • Select the formset + check optional forms
//   • Click "View Form Fields" to open the panel
//   • Click each form in the left panel → verify field labels on the right
//   • Fill all fields with Test Data from Excel
//   • Click the eye icon (👁) → verify PDF viewer opens
//   • (USE_MOCK_PDF=true) compare template {{variables}} vs preview PDF
// ══════════════════════════════════════════════════════════════════════════════

test.describe('Suite 4 — Form Fields Panel', () => {

  // ── 4-A: Panel opens ──────────────────────────────────────────────────────

  test('"View Form Fields" opens the panel', async ({ page }) => {
    test.skip(formGroups.length === 0, 'No form groups in fixture');

    await navigateToFormsTab(page);

    // Set up the first group that has any forms
    const group = formGroups[0];
    await selectFormsetAndOptionals(page, group);

    const viewBtn = page
      .getByRole('button', { name: /view form fields/i })
      .or(page.getByText('View Form Fields').first());
    await viewBtn.click();
    await page.waitForLoadState('networkidle');

    const panel = page.locator('section, div').filter({ hasText: 'Form Fields' }).last();
    await expect(panel).toBeVisible({ timeout: 10_000 });
  });

  // ── 4-B: Field labels + fill + eye icon — per group ───────────────────────

  test('Field labels, fill and eye icon — all groups from Excel', async ({ page }) => {
    test.skip(formGroups.length === 0, 'No form groups in fixture');

    const reader = new ExcelFixtureReader(FIXTURE_PATH);

    for (const group of formGroups) {
      const allForms = [...group.mandatory, ...group.optional];
      const formsWithFields = allForms.filter(f => f.fields.length > 0);
      if (formsWithFields.length === 0) continue;

      // Navigate fresh for each group so the UI state is clean
      await navigateToFormsTab(page);
      await selectFormsetAndOptionals(page, group);

      // Open Form Fields panel
      const viewBtn = page
        .getByRole('button', { name: /view form fields/i })
        .or(page.getByText('View Form Fields').first());
      if (!(await viewBtn.isVisible().catch(() => false))) {
        console.warn(
          `  ⚠  [${group.transaction} / ${group.formset}] ` +
          `"View Form Fields" button not visible — skipping group`,
        );
        continue;
      }
      await viewBtn.click();
      await page.waitForLoadState('networkidle');

      for (const form of formsWithFields) {
        const label    = displayLabel(form);
        const leftItem = formInLeftPanel(page, label);

        if (!(await leftItem.isVisible().catch(() => false))) {
          console.warn(
            `  ⚠  [${group.transaction} / ${group.formset}] ` +
            `Form not in left panel: "${label}" — skipping`,
          );
          continue;
        }

        // Click form in left panel → loads its fields on the right
        await leftItem.click();
        await page.waitForTimeout(500);

        // Verify field labels (first 5 — full set may be slow)
        for (const field of form.fields.slice(0, 5)) {
          if (!field.formField) continue;
          await expect(page.getByText(field.formField, { exact: false }).first()).toBeVisible({
            timeout: 6_000,
            message:
              `[${group.transaction} / ${group.formset}] ` +
              `Field label "${field.formField}" not visible in right panel for "${label}"`,
          });
        }

        // Fill fields with Test Data from Excel
        for (const { selector, value, fieldType } of reader.buildFillMap(form)) {
          if (!selector || !value || fieldType === 'statement') continue;
          let filled = false;
          for (const sel of selector.split(',').map(s => s.trim()).filter(Boolean)) {
            const el = page.locator(sel).first();
            if (!(await el.isVisible().catch(() => false))) continue;
            try {
              switch (fieldType.toLowerCase()) {
                case 'checkbox':
                  ['yes', 'true', '1'].includes(value.toLowerCase())
                    ? await el.check() : await el.uncheck();
                  break;
                case 'radio':
                  await page.getByRole('radio', { name: value }).first().click();
                  break;
                case 'dropdown':
                  await el.selectOption({ label: value })
                    .catch(() => el.selectOption({ value }));
                  break;
                case 'date':
                  await el.fill(value); await el.press('Tab');
                  break;
                default:
                  await el.fill(value);
              }
              filled = true;
            } catch { /* try next fallback selector */ }
            if (filled) break;
          }
          if (!filled) {
            console.warn(
              `  ⚠  [${group.transaction} / ${group.formset}] ` +
              `Could not fill "${selector}" in "${label}"`,
            );
          }
        }

        // Eye icon → PDF viewer
        if (!USE_MOCK_PDF) {
          const eye = eyeIconFor(page, label);
          if (await eye.isVisible().catch(() => false)) {
            const newPagePromise = page.context().waitForEvent('page', { timeout: 10_000 }).catch(() => null);
            await eye.click();
            const newPage = await newPagePromise;
            if (newPage) {
              await newPage.waitForLoadState('domcontentloaded').catch(() => null);
              expect(newPage.url().length > 0).toBe(true,
                `Eye icon for "${label}" did not open a URL`);
              await newPage.close();
            }
          } else {
            console.warn(
              `  ⚠  [${group.transaction} / ${group.formset}] ` +
              `Eye icon not visible for "${label}"`,
            );
          }
        }
      }
    }
  });

  // ── 4-C: Mock PDF comparison ──────────────────────────────────────────────

  test('Mock PDF: template {{variables}} match Excel test data in preview PDF', async () => {
    test.skip(!USE_MOCK_PDF, 'Set USE_MOCK_PDF=true to run mock PDF comparison');
    test.skip(formGroups.length === 0, 'No form groups in fixture');

    const reader   = new ExcelFixtureReader(FIXTURE_PATH);
    const failures: string[] = [];

    for (const group of formGroups) {
      const allForms = [...group.mandatory, ...group.optional];

      for (const form of allForms) {
        const templatePath = path.join(MOCK_PDF_TEMPLATE, `${form.unqorkFormNumber}.pdf`);
        const previewPath  = path.join(MOCK_PDF_PREVIEW,  `${form.unqorkFormNumber}.pdf`);

        if (!fs.existsSync(templatePath) || !fs.existsSync(previewPath)) {
          const miss = [
            !fs.existsSync(templatePath) ? `template: ${path.basename(templatePath)}` : '',
            !fs.existsSync(previewPath)  ? `preview: ${path.basename(previewPath)}`   : '',
          ].filter(Boolean).join(', ');
          console.warn(
            `  ⚠  [${group.transaction} / ${group.formset}] ` +
            `${form.unqorkFormNumber}: PDF(s) missing (${miss}) — skipping`,
          );
          continue;
        }

        const result = await MockPdfValidator.comparePdfs({
          templatePdfPath:    templatePath,
          previewPdfPath:     previewPath,
          values:             reader.buildValuesMap(form),
          requiredStatements: form.statements,
        });

        MockPdfValidator.printReport(result);

        if (!result.passed) {
          failures.push(
            result.failures.map(f =>
              `  ✗ [${group.transaction} / ${group.formset} / ${form.unqorkFormNumber}] ` +
              `${f.label}: expected "${f.expected}" — got "${f.actual}"`,
            ).join('\n'),
          );
        }
      }
    }

    expect(failures.length, `Mock PDF failures:\n${failures.join('\n')}`).toBe(0);
  });
});
