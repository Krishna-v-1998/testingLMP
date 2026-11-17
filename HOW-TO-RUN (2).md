# How to Run — Policy Lifecycle Automation Framework

## Overview

This framework automates the full Allianz Insurance policy lifecycle on the Unqork platform using **Playwright + TypeScript**.

```
Quote → Binder → Premium Booking → Policy
Open  → Quoted → Bound → In-Processing → Issued
```

There are two test suites:

| Suite | File | Needs Browser? | Needs PDF Viewer? |
|---|---|---|---|
| **Policy Lifecycle** | `tests/lifecycle/policy-lifecycle.spec.ts` | ✅ Yes | ❌ No (mock mode) / ✅ Next sprint |
| **Mock PDF Comparison** | `tests/mock/mock-pdf-comparison.spec.ts` | ❌ No | ❌ No |

---

## Prerequisites

### 1. Install dependencies

```bash
npm install
npx playwright install chromium
```

### 2. Create storage state files (login sessions)

Storage states capture authenticated browser sessions so tests don't need to log in each time.

You need **three files** — one per role:

```
storage-states/
  gbo.json    ← GBO role (most tests)
  cuo.json    ← CUO role (status change tests 07 and 08)
  uw.json     ← UW role (reserved for future tests)
```

Generate them by running your existing login script, or manually:

```bash
# Example — adapt to your app's login URL and credentials
npx playwright codegen --save-storage=storage-states/gbo.json https://your-app-url.com
```

Log in as the GBO user, then close the browser. Repeat for `cuo.json` and `uw.json`.

> **Tip:** Add `storage-states/` to `.gitignore` — these files contain session tokens.

### 3. Set the base URL

```bash
# .env or export in your shell
BASE_URL=https://your-allianz-app-url.com
```

Or add it to `playwright.config.ts`:

```ts
use: {
  baseURL: process.env.BASE_URL,
}
```

### 4. Populate the form manifest Excel file

Place your Excel at:

```
test-data/form-manifest.xlsx
```

The file must have a sheet named **`FormManifest`** with these columns:

| Column | Description | Example |
|---|---|---|
| `Product` | Product name | `Builder's Risk` |
| `SubSegment` | Sub-segment | `Builders Risk` |
| `FormNumber` | Form identifier | `BR-001` |
| `FormName` | Label shown in the UI Forms tab | `Builders Risk Coverage Form` |
| `MandatoryOptional` | `Mandatory` or `Optional` | `Mandatory` |
| `FieldName` | Variable name matching template `{{Variable}}` | `Named Insured` |
| `FieldType` | `text`, `select`, `checkbox`, or `date` | `text` |
| `FieldSelector` | Playwright CSS/attribute selector for the UI field | `[data-testid="named-insured"]` |
| `PdfLabel` | Label as it appears in the PDF | `Named Insured:` |
| `PdfStatement` | Full static statement to verify (leave blank if none) | `direct physical loss or damage` |

> **Note:** One row per field. Multiple rows with the same `FormNumber` are grouped into one form entry automatically.

---

## Running the Mock PDF Comparison Tests

These tests run **entirely offline** — no browser, no app, no PDF viewer needed.
They validate that mock client templates render correctly with sample values.

```bash
npx playwright test tests/mock/mock-pdf-comparison.spec.ts
```

**What they test:**

- All `{{variables}}` in templates are resolved by sample UI values
- Each supplied value appears in the rendered output
- Required static statements appear verbatim
- Failure scenarios (wrong value, missing variable, missing statement)

**Expected output:** All 14 tests pass with a rendered-text preview logged per form.

---

## Running the Full Policy Lifecycle

### Quick start (mock PDF mode — works today)

No real PDF viewer is required. `USE_MOCK_PDF=true` redirects PDF validation to compare local template files against rendered values.

```bash
USE_MOCK_PDF=true BASE_URL=https://your-app-url.com \
  npx playwright test tests/lifecycle/policy-lifecycle.spec.ts --workers=1
```

### Full mode (real PDF viewer — next sprint)

Once the in-app PDF viewer is available, drop the env var:

```bash
BASE_URL=https://your-app-url.com \
  npx playwright test tests/lifecycle/policy-lifecycle.spec.ts --workers=1
```

> **Important:** Always use `--workers=1` for the lifecycle spec. The 17 tests are serial and share submission state across the run.

---

## Running Individual Tests

Each test navigates to the submission via URL, so any single test can run standalone.

```bash
# By test number
npx playwright test tests/lifecycle/policy-lifecycle.spec.ts -g "03 —" --workers=1

# By keyword
npx playwright test tests/lifecycle/policy-lifecycle.spec.ts -g "Binder" --workers=1

# With headed browser for visual debugging
npx playwright test tests/lifecycle/policy-lifecycle.spec.ts -g "07 —" --headed --slow-mo 500
```

> **First run note:** Test 01 creates the submission. For subsequent solo runs of tests 02–17, the submission context is loaded from cache (`test-data/contexts/policy-lifecycle.json`). Delete this file to force a fresh submission.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `BASE_URL` | ✅ Yes | — | App base URL |
| `SUBMISSION_URL` | Optional | — | Skip submission creation; point tests at an existing submission URL |
| `SUBMISSION_ID` | Optional | — | The submission ID matching `SUBMISSION_URL` |
| `USE_MOCK_PDF` | Optional | `false` | `true` = use local template files instead of real PDF viewer |
| `PDF_VIEWER_AVAILABLE` | Optional | — | `false` = same as `USE_MOCK_PDF=true` |
| `MOCK_TEMPLATE_DIR` | Optional | `test-data/mock-templates` | Directory containing `<FormNumber>.txt` template files |
| `PDF_VALIDATION_ENABLED` | Optional | `true` | `false` = skip all PDF/forms validation entirely |

### Pointing at an existing submission

Useful when you want to skip submission creation and test from a known state:

```bash
SUBMISSION_URL=https://your-app-url.com/submissions/12345 \
SUBMISSION_ID=12345 \
USE_MOCK_PDF=true \
  npx playwright test tests/lifecycle/policy-lifecycle.spec.ts -g "09 —" --workers=1
```

---

## Folder Structure

```
location/
├── src/
│   ├── enums/
│   │   ├── role.enum.ts              — Role.GBO / CUO / UW
│   │   └── status.enum.ts            — SubmissionStatus enum
│   ├── fixtures/
│   │   └── index.ts                  — Playwright test fixture extensions
│   ├── helpers/
│   │   └── FormManifestReader.ts     — Reads Excel manifest; getFormsForProduct()
│   ├── pages/
│   │   ├── base/BasePage.ts          — Abstract base: log, fill, assert helpers
│   │   ├── AccountsReviewPage.ts     — Sidebar accordion + complete review
│   │   ├── BinderPage.ts             — Binder list, drawer, finalize
│   │   ├── BindingInstructionsChecklistPage.ts
│   │   ├── BrokerInformationPage.ts  — Commission, UW rationale fields
│   │   ├── BuildersRiskPage.ts       — BR sub-tab (quote/binder/policy context)
│   │   ├── FormsPage.ts              — Manifest validation + PDF/mock comparison
│   │   ├── FormsPreviewPage.ts
│   │   ├── FormSetOrderPage.ts
│   │   ├── InstallationFloaterPage.ts — Placeholder; fill in after DOM confirmed
│   │   ├── LocationManagementPage.ts — Add/edit locations, table assertions
│   │   ├── PolicyIssuanceChecklistPage.ts
│   │   ├── PolicyPage.ts             — Generate/finalize policy
│   │   ├── PremiumBookingPage.ts     — Send to WINS
│   │   ├── QuotePage.ts              — Quote tab, create/open/finalize/generate binder
│   │   ├── StatusChangePage.ts       — All 3 status transitions with error callbacks
│   │   ├── SubmissionOverviewPage.ts — Navigate by URL, sidebar links
│   │   └── UWRationalePage.ts        — Navigate + fill UW Rationale
│   ├── services/
│   │   └── SubmissionSetupService.ts — Context creation/caching; AuthManager wrapper
│   ├── types/
│   │   ├── builders-risk.types.ts
│   │   ├── forms.types.ts            — FormManifestEntry, PdfValidationInput, etc.
│   │   ├── quote.types.ts
│   │   └── submission.types.ts       — SubmissionContext interface
│   └── utils/
│       ├── MockPdfValidator.ts       — Compares rendered template vs expected values
│       ├── MockPdfViewer.ts          — Renders {{Variable}} templates with live values
│       └── PdfValidator.ts           — Real PDF tab capture + text validation
├── test-data/
│   ├── contexts/                     — Auto-created; stores cached submission contexts
│   │   └── policy-lifecycle.json     — Created on first run; delete to force re-creation
│   ├── mock-pdf-values.ts            — Sample UI values for mock tests
│   ├── mock-templates/
│   │   ├── BR-001.txt                — Main BR coverage form template
│   │   ├── BR-END-TER-001.txt        — Terrorism endorsement template
│   │   └── BR-END-SPR-002.txt        — Sprinkler endorsement template
│   └── form-manifest.xlsx            — ⚠ You must create this (see Prerequisites §4)
├── tests/
│   ├── lifecycle/
│   │   └── policy-lifecycle.spec.ts  — 17 serial lifecycle tests
│   └── mock/
│       └── mock-pdf-comparison.spec.ts — 14 offline template comparison tests
├── storage-states/                   — ⚠ You must generate these (see Prerequisites §2)
│   ├── gbo.json
│   ├── cuo.json
│   └── uw.json
└── HOW-TO-RUN.md                     — This file
```

---

## Lifecycle Test Map

| # | Test | Role | Depends On |
|---|---|---|---|
| 01 | Add a location | GBO | — |
| 02 | Create a new BR quote | GBO | 01 |
| 03 | Fill BR product fields (Quote) | GBO | 02 |
| 04 | Validate Quote forms vs manifest | GBO | 03 |
| 05 | Generate Quote (→ Generated) | GBO | 04 |
| 06 | Finalize Quote (→ Finalized) | GBO | 05 |
| 07 | Status: Open → Quoted | **CUO** | 06 |
| 08 | Status: Quoted → Bound | **CUO** | 07 |
| 09 | Generate Binder | GBO | 08 |
| 10 | Verify BR fields in Binder (read-only) | GBO | 09 |
| 11 | Validate Binder forms vs manifest | GBO | 09 |
| 12 | Generate & Finalize Binder | GBO | 11 |
| 13 | Status: Bound → In-Processing | GBO | 12 |
| 14 | Premium Booking: Send to WINS | GBO | 13 |
| 15 | Generate Policy | GBO | 14 |
| 16 | Validate Policy forms vs manifest | GBO | 15 |
| 17 | Finalize Policy (→ Finalized) | GBO | 16 |

---

## Placeholder Pages — Needs DOM Selectors

These pages contain placeholder implementations. Fill in selectors once you have screenshots or access to the live DOM:

| Page | Missing |
|---|---|
| `AccountsReviewPage.ts` | `completeAccountReview()` — fields for account review form |
| `BindingInstructionsChecklistPage.ts` | `completeChecklist()` — checklist item selectors |
| `PolicyIssuanceChecklistPage.ts` | `completeAndIssuePolicy()` — checklist item selectors |
| `InstallationFloaterPage.ts` | All field selectors and `fillProductDetails()` |

Until these are implemented, the error-handling callbacks in tests 07, 08, and 13 will navigate to those sections but do nothing — which is acceptable for initial runs where those error modals don't appear.

---

## Adding a New Mock Template

When a new form is added to the Excel manifest:

1. Create `test-data/mock-templates/<FormNumber>.txt` using the same `{{Variable Name}}` format as the existing templates.
2. Add any variables unique to that form to `test-data/mock-pdf-values.ts` under `BR_SAMPLE_VALUES`.
3. Run the pre-flight suite to verify:

```bash
npx playwright test tests/mock/mock-pdf-comparison.spec.ts -g "pre-flight"
```

---

## Switching to the Real PDF Viewer (Next Sprint)

When the in-app PDF viewer becomes available:

1. Remove `USE_MOCK_PDF=true` from your run command (or `.env`).
2. `FormsPage.validateFormPdf()` automatically switches to `PdfValidator.captureAndValidate()`.
3. The mock template files remain in place and continue to serve the offline comparison spec.

No code changes are required — the switch is entirely env-var driven.

---

## Troubleshooting

**Tests fail with "storage-state file not found"**
→ Run your login script to generate `storage-states/gbo.json` and `storage-states/cuo.json`.

**Tests fail with "No BASE_URL provided"**
→ Set `BASE_URL` in your environment or `playwright.config.ts`.

**Test 02 fails to find the product/sub-segment dropdown**
→ Check that `QUOTE_DATA.product` and `QUOTE_DATA.subSegment` in the spec exactly match the UI dropdown labels (case-sensitive).

**Submission context is stale / points to a deleted submission**
→ Delete `test-data/contexts/policy-lifecycle.json` and re-run from test 01.

**Mock PDF comparison fails with "template file not found"**
→ Ensure `test-data/mock-templates/<FormNumber>.txt` exists for every form in your manifest.

**Forms validation is skipped with a warning**
→ Either `PDF_VALIDATION_ENABLED=false` is set, or the manifest has no entries for `Builder's Risk / Builders Risk`. Check the Excel sheet name is exactly `FormManifest`.
