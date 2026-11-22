# How to Run — Policy Lifecycle Automation Framework

## Overview

This framework automates the full Allianz Insurance policy lifecycle on the Unqork platform using **Playwright + TypeScript**.

```
Quote → Binder → Premium Booking → Policy
Open  → Quoted → Bound → In-Processing → Issued
```

There are three test suites:

| Suite | File | Needs Browser? | Needs PDF Viewer? |
|---|---|---|---|
| **Policy Lifecycle** | `tests/lifecycle/policy-lifecycle.spec.ts` | ✅ Yes | ❌ No (mock mode) / ✅ Next sprint |
| **Forms Validation** | `tests/forms/forms-validation.spec.ts` | ❌ Mock / ✅ Real | ❌ No (mock mode) |
| **Mock PDF Unit Tests** | `tests/mock/mock-pdf-comparison.spec.ts` | ❌ No | ❌ No |

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

### 4. Set up the form manifest Excel file

**First time only — generate the starter manifest:**

```bash
npx tsx scripts/generate-mock-manifest.ts
```

This creates `test-data/form-manifest.xlsx` with the correct 15-column schema and two sample rows.

Open the file, delete the sample rows, and add your real forms.  The sheet must be named **`Forms`**.

| Column | Description | Example |
|---|---|---|
| `Product` | Product line name | `Builder's Risk` |
| `Sub Segment` | Sub-segment | `Standard` |
| `Formset` | Radio-button group name in the UI | `FS-Alpha` |
| `Transaction` | Pipe-separated: `Quote\|Binder\|Policy` | `Quote\|Binder` |
| `Lotus Notes Form Number` | Client form reference | `LN-001` |
| `Unqork Form Number` | Unqork form ID — also used as the PDF filename | `UQ-001` |
| `Form Name` | Display name shown in the UI | `Builder's Risk Coverage` |
| `Lotus Notes Form ID` | ID label shown next to form name | `LN-001` |
| `Form Order` | Sort order within the formset | `1` |
| `Category` | `Mandatory` or `Optional` | `Mandatory` |
| `States Applicable` | Pipe-separated codes, or `ALL` | `CA\|NY\|TX` |
| `Fields` | Field label shown in the UI | `Named Insured` |
| `Field ID` | CSS selector for the field | `#namedInsured` |
| `Type` | `Textfield\|Dropdown\|Checkbox\|Date\|Radio\|Textarea` | `Textfield` |
| `Mapping` | Source path if auto-populated from another module | `submission.policyNumber` |

> **One row per field.** Repeat the form-level columns (Product → States Applicable) on every field row for a given form — the reader groups them automatically by `Unqork Form Number`.

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
| `USE_MOCK_PDF` | Optional | `false` | `true` = compare local PDF files instead of opening real PDF viewer |
| `PDF_VIEWER_AVAILABLE` | Optional | — | `false` = same as `USE_MOCK_PDF=true` |
| `MOCK_PDF_DIR` | Optional | `test-data/mock-pdfs` | Base directory containing `template/` and `preview/` subdirectories |
| `MOCK_PDF_TEMPLATE_DIR` | Optional | `$MOCK_PDF_DIR/template` | Override template PDF directory independently |
| `MOCK_PDF_PREVIEW_DIR` | Optional | `$MOCK_PDF_DIR/preview` | Override preview PDF directory independently |
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
│       ├── MockPdfValidator.ts       — Compares template PDF + UI values against preview PDF
│       ├── MockPdfViewer.ts          — Extracts text from PDFs; renders {{Variable}} placeholders
│       └── PdfValidator.ts           — Real PDF tab capture + text validation
├── scripts/
│   ├── generate-mock-manifest.ts     — Creates starter form-manifest.xlsx with correct schema
│   └── generate-mock-pdfs.ts         — Auto-generates template + preview PDFs from manifest
├── test-data/
│   ├── contexts/                     — Auto-created; stores cached submission contexts
│   │   └── policy-lifecycle.json     — Created on first run; delete to force re-creation
│   ├── mock-pdf-values.ts            — Sample UI values for mock tests
│   ├── mock-pdfs/
│   │   ├── template/
│   │   │   ├── BR-001.pdf            — Main BR coverage form (contains {{variables}})
│   │   │   ├── BR-END-TER-001.pdf    — Terrorism endorsement template
│   │   │   └── BR-END-SPR-002.pdf    — Sprinkler endorsement template
│   │   └── preview/
│   │       ├── BR-001.pdf            — BR form with sample values substituted
│   │       ├── BR-END-TER-001.pdf    — Terrorism endorsement with sample values
│   │       └── BR-END-SPR-002.pdf    — Sprinkler endorsement with sample values
│   └── form-manifest.xlsx            — ⚠ Run generate-mock-manifest.ts first (see §4)
├── tests/
│   ├── forms/
│   │   └── forms-validation.spec.ts  — Data-driven forms test; zero code changes for new forms
│   ├── lifecycle/
│   │   └── policy-lifecycle.spec.ts  — 17 serial lifecycle tests
│   └── mock/
│       └── mock-pdf-comparison.spec.ts — Offline unit tests for PDF comparison framework
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

## Adding New Forms ← **No code changes required**

When new formsets or forms are received, the **only** steps are:

### Step 1 — Add rows to the Excel manifest

Open `test-data/form-manifest.xlsx` and add one row per field for each new form.
Repeat the form-level columns (Product → States Applicable) on every field row.

```
Product  | Sub Segment | Formset  | Transaction | ... | Unqork Form Number | Fields         | Field ID       | Type
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Bldr Risk | Standard   | FS-Alpha | Quote|Binder | ... | UQ-NEW-001         | Named Insured  | #namedInsured  | Textfield
Bldr Risk | Standard   | FS-Alpha | Quote|Binder | ... | UQ-NEW-001         | Policy Number  | #policyNum     | Textfield
Bldr Risk | Standard   | FS-Alpha | Quote|Binder | ... | UQ-NEW-001         | Effective Date | #effectiveDate | Date
```

### Step 2 — Regenerate mock PDFs

```bash
npx tsx scripts/generate-mock-pdfs.ts
```

The script reads the manifest and **auto-generates** `template/<UnqorkFormNumber>.pdf` and
`preview/<UnqorkFormNumber>.pdf` for every form — no manual PDF authoring needed.

### That's it. Run the tests:

```bash
# Mock mode (no browser):
USE_MOCK_PDF=true npx playwright test tests/forms/forms-validation.spec.ts

# Filter to one product:
PRODUCT="Builder's Risk" TRANSACTION=Quote USE_MOCK_PDF=true \
  npx playwright test tests/forms/forms-validation.spec.ts

# Real mode (with browser + live app):
BASE_URL=https://your-app SUBMISSION_URL=https://your-app/submissions/123 \
  npx playwright test tests/forms/forms-validation.spec.ts --workers=1
```

> **Custom sample values (optional):** If the auto-generated values aren't realistic enough for your
> preview PDFs, add entries to `test-data/mock-pdf-values.ts` under `SAMPLE_VALUES`.
> Any variable not found there is auto-filled (dates → `01/01/2025`, numbers → `BR-2024-001`, etc.).

---

## Forms Validation — Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PRODUCT` | *(all)* | Filter to one product name |
| `SUB_SEGMENT` | *(all)* | Filter to one sub-segment |
| `TRANSACTION` | `Quote` | `Quote` \| `Binder` \| `Policy` |
| `STATE` | *(no filter)* | Filter to one state code, e.g. `CA` |
| `SUBMISSION_URL` | — | URL of the open submission (real mode only) |
| `FORM_MANIFEST_PATH` | `test-data/form-manifest.xlsx` | Override manifest location |

---

## Switching to the Real PDF Viewer (Next Sprint)

When the in-app PDF viewer becomes available:

1. Remove `USE_MOCK_PDF=true` from your `.env.qa` / `.env.staging` files (or set it to `false`).
2. `FormsPage.validateFormPdf()` automatically switches to `PdfValidator.captureAndValidate()`, which captures the new-tab PDF bytes and runs live validation.
3. The mock PDFs remain in `test-data/mock-pdfs/` and continue to serve the offline comparison spec (`tests/mock/mock-pdf-comparison.spec.ts`) — no files need to be deleted.

No code changes are required — the switch is entirely env-var driven.

---

## Switching Environments

The framework defaults to **QA**. Set `ENV=staging` to target Staging instead.

| Command | Environment |
|---|---|
| `npx playwright test ...` | QA (default — loads `.env.qa`) |
| `ENV=staging npx playwright test ...` | Staging (loads `.env.staging`) |

**Mac / Linux:**

```bash
# Full lifecycle on Staging
ENV=staging npx playwright test tests/lifecycle/policy-lifecycle.spec.ts --workers=1

# Mock PDF tests on Staging
ENV=staging npx playwright test tests/mock/mock-pdf-comparison.spec.ts

# Single test on Staging
ENV=staging npx playwright test tests/lifecycle/policy-lifecycle.spec.ts -g "09 —" --workers=1
```

**Windows (Command Prompt):**

```cmd
set ENV=staging && npx playwright test tests/lifecycle/policy-lifecycle.spec.ts --workers=1
```

**Windows (PowerShell):**

```powershell
$env:ENV="staging"; npx playwright test tests/lifecycle/policy-lifecycle.spec.ts --workers=1
```

**Edit environment URLs** — open the matching file and update `BASE_URL`:

```
.env.qa       ← QA environment settings
.env.staging  ← Staging environment settings
```

> **Note:** Each environment gets its own HTML report folder (`playwright-report-qa/` or `playwright-report-staging/`) so reports don't overwrite each other.

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

**Mock PDF comparison fails with "Mock PDF(s) not found"**
→ Run `npx tsx scripts/generate-mock-pdfs.ts` to generate `test-data/mock-pdfs/template/` and `test-data/mock-pdfs/preview/` PDFs.

**Forms validation is skipped with a warning**
→ Either `PDF_VALIDATION_ENABLED=false` is set, or the manifest has no entries for the current product/sub-segment filters. Check the Excel sheet name is exactly `Forms`.

**"Mock PDFs not found for UQ-XXX"**
→ You added a row to the manifest but haven't generated PDFs yet. Run `npx tsx scripts/generate-mock-pdfs.ts`.

**"No matching scenarios in manifest for the current env filters"**
→ The `PRODUCT` / `SUB_SEGMENT` / `TRANSACTION` env vars don't match any rows in the manifest. Run without filters first to see what products are available.
