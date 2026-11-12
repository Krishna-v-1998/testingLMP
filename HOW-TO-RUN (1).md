# How to Run — Allianz Policy Lifecycle Tests

## How Submission Context Works

**You never need to set `SUBMISSION_URL` or `SUBMISSION_ID` manually.**

Each spec calls `SubmissionSetupService.createAndStoreContext(browser, role, options)` in
its `beforeAll`. That service creates a fresh submission through the UI, captures the
resulting URL and ID into a `SubmissionContext`, and returns it. Every test in the suite
then reads `submissionCtx.submissionUrl` and `submissionCtx.submissionId` from that context.

```
SubmissionSetupService.createAndStoreContext()
  → navigates UI, creates submission
  → returns SubmissionContext { submissionUrl, submissionId, ... }

test uses submissionCtx.submissionUrl  ← always fresh, always correct
```

The optional env vars (`SUBMISSION_URL`, `SUBMISSION_ID`) are a **developer shortcut only** —
set them when you already have a submission open and want to skip the UI-creation step during
local debugging. Normal CI runs never need them.

---

## Prerequisites

| Requirement | Details |
|---|---|
| Node.js | v18 or later |
| Playwright | `npx playwright install --with-deps chromium` |
| Auth states | `storage-states/uw.json`, `storage-states/cuo.json` |
| Excel fixture | `src/data/fixtures/forms-fixture.xlsx` |

---

## 1. First-Time Setup

```bash
# Install dependencies
npm install

# Install Chromium browser
npx playwright install chromium

# Generate auth storage states (once per environment / once after session expires)
# A browser window opens — log in as UW, then close the window to save.
npx playwright codegen --save-storage=storage-states/uw.json  https://allianz-qa-subhubplus-uatx.unqork.io
npx playwright codegen --save-storage=storage-states/cuo.json https://allianz-qa-subhubplus-uatx.unqork.io
```

---

## 2. Run Individual Spec Files

Each spec creates its own submission via `SubmissionSetupService` — no env vars needed.

### Quote Lifecycle
```bash
# Full run (headed, so you can watch)
npx playwright test tests/quote/quote-lifecycle.spec.ts --headed

# Headless (CI mode)
npx playwright test tests/quote/quote-lifecycle.spec.ts

# Debug with slow motion (400 ms between steps)
npx playwright test tests/quote/quote-lifecycle.spec.ts --headed --slow-mo 400

# Skip PDF placeholder tests
npx playwright test tests/quote/quote-lifecycle.spec.ts --grep-invert @pdf
```

### Binder Lifecycle
```bash
npx playwright test tests/binder/binder-lifecycle.spec.ts --headed
```

### Premium Booking
```bash
npx playwright test tests/premium-booking/premium-booking.spec.ts --headed

# Dry run — skips clicking "Send to WINS →"
SKIP_SEND_TO_WINS=true npx playwright test tests/premium-booking/premium-booking.spec.ts --headed
```

### Policy Lifecycle
```bash
npx playwright test tests/policy/policy-lifecycle.spec.ts --headed
```

---

## 3. Run Full Lifecycle (End-to-End)

Run all 4 stages in a single process so they share the same in-memory submission context:

```bash
npx playwright test \
  tests/quote/quote-lifecycle.spec.ts \
  tests/binder/binder-lifecycle.spec.ts \
  tests/premium-booking/premium-booking.spec.ts \
  tests/policy/policy-lifecycle.spec.ts \
  --headed --workers=1
```

> `--workers=1` is important for the full lifecycle — the specs run serially and share the
> `SubmissionSetupService` in-memory cache, so each stage finds the same submission that the
> previous stage created. Parallel workers run in separate processes and lose the cache.

Or filter by tag:
```bash
npx playwright test --grep "@quote|@binder|@premium-booking|@policy" --headed --workers=1
```

---

## 4. HTML Report

```bash
npx playwright test tests/quote tests/binder tests/premium-booking tests/policy --workers=1
npx playwright show-report
```

---

## 5. Debug a Failing Test

```bash
# Run a single test by name
npx playwright test tests/quote/quote-lifecycle.spec.ts \
  --grep "Create Quote" \
  --headed --slow-mo 500

# Pause at first failure (opens Playwright inspector)
PWDEBUG=1 npx playwright test tests/quote/quote-lifecycle.spec.ts --headed

# Record a trace then replay it
npx playwright test tests/quote/quote-lifecycle.spec.ts --trace on
npx playwright show-trace test-results/*/trace.zip
```

---

## 6. Optional Developer Shortcuts (env vars)

These are **not required** in normal runs. Use them only when you already have a known
submission and want to skip UI creation during local debugging:

```bash
# Point all specs at an existing submission (skips SubmissionSetupService UI creation)
export SUBMISSION_URL="https://allianz-qa-subhubplus-uatx.unqork.io/app/metrix-ui/#/display/xxx?metrixSubmissionId=yyy"
export SUBMISSION_ID="yyy"

# Skip WINS submission during Premium Booking dry runs
export SKIP_SEND_TO_WINS=true

# If you already know the binder / policy ID (skips row auto-discovery)
export BINDER_ID="BND-001"
export POLICY_ID="POL-001"
```

---

## 7. PDF Preview Tests (Currently Skipped)

PDF preview tests are **skipped by default** (the Eye/Preview button is not yet working).
They are tagged `@pdf` and use `test.skip()` as a placeholder.

To enable once the app supports it:
1. Open the spec file
2. Change `const PDF_PREVIEW_ENABLED = false;` → `true`
3. Re-run

```bash
# Run only PDF tests (once enabled)
npx playwright test --grep @pdf --headed
```

---

## 8. File Structure

```
tests/
  quote/
    quote-lifecycle.spec.ts         ← 13 tests: Quote → Generate Binder
  binder/
    binder-lifecycle.spec.ts        ← 12 tests: Binder Forms → Finalize Binder
  premium-booking/
    premium-booking.spec.ts         ← 9 tests: Tables → Send to WINS
  policy/
    policy-lifecycle.spec.ts        ← 9 tests: Policy Forms → Issued

src/
  services/
    SubmissionSetupService.ts       ← Creates submission, returns SubmissionContext
  types/
    submission.types.ts             ← SubmissionContext interface
  pages/
    QuotePage.ts
    BinderPage.ts
    PremiumBookingPage.ts
    PolicyPage.ts
    FormsPage.ts
    SubmissionOverviewPage.ts
  data/fixtures/
    forms-fixture.xlsx              ← Test data (4 forms, 23 fields)
    FormsDataReader.ts
  fixtures.ts                       ← Playwright custom fixtures

storage-states/
  uw.json                           ← UW auth state
  cuo.json                          ← CUO auth state
```

---

## 9. Troubleshooting

| Problem | Fix |
|---|---|
| `storage-states/uw.json not found` | Run `npx playwright codegen --save-storage=storage-states/uw.json <url>` |
| `forms-fixture.xlsx not found` | Run `python3 src/data/fixtures/gen_fixture.py` |
| `Binder row not found` | Ensure Quote test 13 (Generate Binder) completed on the same submission |
| `Premium Booking tables empty` | Ensure binder is Finalized and submission is In-Processing |
| `Policy tab shows No Data Found` | Ensure "Send to WINS" completed successfully |
| `Test fails: submission context lost between suites` | Use `--workers=1` when running multiple spec files together |
| PDF test skipped | Expected — set `PDF_PREVIEW_ENABLED = true` when app supports it |
