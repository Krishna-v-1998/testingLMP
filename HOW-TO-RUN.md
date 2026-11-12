# How to Run — Allianz Policy Lifecycle Tests

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

# Generate auth storage states (once per environment)
# Log in manually in the browser and save:
npx playwright codegen --save-storage=storage-states/uw.json  https://allianz-qa-subhubplus-uatx.unqork.io
npx playwright codegen --save-storage=storage-states/cuo.json https://allianz-qa-subhubplus-uatx.unqork.io
```

---

## 2. Environment Variables

Set these before running (or create a `.env` file):

```bash
# Required — your submission URL and ID
export SUBMISSION_URL="https://allianz-qa-subhubplus-uatx.unqork.io/app/metrix-ui/#/display/xxx?metrixSubmissionId=yyy"
export SUBMISSION_ID="yyy"

# Optional — skip UI creation and jump straight to tests
export BASE_URL="https://allianz-qa-subhubplus-uatx.unqork.io"

# Optional — provide existing IDs to skip discovery
export BINDER_ID="BND-001"    # skips auto-discovery of first binder row
export POLICY_ID="POL-001"    # skips auto-discovery of first policy row

# Optional — dry-run mode (skips actual WINS submission)
export SKIP_SEND_TO_WINS=true
```

---

## 3. Run Individual Spec Files

### Quote Lifecycle
```bash
# Full run (headed, so you see the browser)
npx playwright test tests/quote/quote-lifecycle.spec.ts --headed

# Headless (CI mode)
npx playwright test tests/quote/quote-lifecycle.spec.ts

# Debug with slow motion
npx playwright test tests/quote/quote-lifecycle.spec.ts --headed --slow-mo 400

# Skip PDF-related tests (placeholder tests)
npx playwright test tests/quote/quote-lifecycle.spec.ts --grep-invert @pdf
```

### Binder Lifecycle
```bash
npx playwright test tests/binder/binder-lifecycle.spec.ts --headed
npx playwright test tests/binder/binder-lifecycle.spec.ts --headed --slow-mo 400
```

### Premium Booking
```bash
npx playwright test tests/premium-booking/premium-booking.spec.ts --headed

# Dry run — skips "Send to WINS" button click
SKIP_SEND_TO_WINS=true npx playwright test tests/premium-booking/premium-booking.spec.ts --headed
```

### Policy Lifecycle
```bash
npx playwright test tests/policy/policy-lifecycle.spec.ts --headed
```

---

## 4. Run Full Lifecycle (End-to-End)

Run all 4 stages in order (they share state via env vars):

```bash
npx playwright test \
  tests/quote/quote-lifecycle.spec.ts \
  tests/binder/binder-lifecycle.spec.ts \
  tests/premium-booking/premium-booking.spec.ts \
  tests/policy/policy-lifecycle.spec.ts \
  --headed
```

Or use a tag to run all lifecycle tests:
```bash
npx playwright test --grep "@quote|@binder|@premium-booking|@policy" --headed
```

---

## 5. Run with HTML Report

```bash
npx playwright test tests/quote tests/binder tests/premium-booking tests/policy
npx playwright show-report
```

---

## 6. Debug a Failing Test

```bash
# Run a single test by name
npx playwright test tests/quote/quote-lifecycle.spec.ts \
  --grep "Create Quote" \
  --headed --slow-mo 500

# Pause at first failure (opens Playwright inspector)
PWDEBUG=1 npx playwright test tests/quote/quote-lifecycle.spec.ts --headed

# Trace viewer (record + replay)
npx playwright test tests/quote/quote-lifecycle.spec.ts --trace on
npx playwright show-trace test-results/*/trace.zip
```

---

## 7. PDF Preview Tests (Currently Skipped)

All PDF preview tests are **skipped by default** because the Eye/Preview button is not yet working in the app. They are tagged `@pdf`.

To enable them when the feature is working:
1. Open the spec file (e.g., `tests/quote/quote-lifecycle.spec.ts`)
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
    quote-lifecycle.spec.ts         ← Quote creation → Generate Binder
  binder/
    binder-lifecycle.spec.ts        ← Binder Forms → Finalize Binder
  premium-booking/
    premium-booking.spec.ts         ← Location/Coverage tables → Send to WINS
  policy/
    policy-lifecycle.spec.ts        ← Policy Forms → Generate Policy → Issued

src/
  pages/
    QuotePage.ts                    ← Quote tab POM
    BinderPage.ts                   ← Binder tab POM + drawer
    PremiumBookingPage.ts           ← Premium Booking tab POM
    PolicyPage.ts                   ← Policy tab POM (placeholder)
    FormsPage.ts                    ← Forms/Form Fields tab POM (shared)
    SubmissionOverviewPage.ts       ← Submission overview POM
  services/
    SubmissionSetupService.ts       ← Creates/caches submission contexts
  data/fixtures/
    forms-fixture.xlsx              ← Excel test data (4 forms, 23 fields)
    FormsDataReader.ts              ← Reads Excel → FormDefinition[]
    FormsFixtureBuilder.ts          ← Form metadata definitions
  types/
    submission.types.ts             ← SubmissionContext, SubmissionCreateOptions
    quote.types.ts                  ← QuoteStatus, BinderStatus, PolicyStatus, etc.
  fixtures.ts                       ← Playwright custom fixtures (submissionOverview)
  enums/
    role.enum.ts                    ← Role.UW, Role.CUO

storage-states/
  uw.json                           ← UW auth state (generate with playwright codegen)
  cuo.json                          ← CUO auth state
```

---

## 9. Quick Troubleshooting

| Problem | Fix |
|---|---|
| `storage-states/uw.json not found` | Run `npx playwright codegen --save-storage=storage-states/uw.json <url>` |
| `forms-fixture.xlsx not found` | Run `python3 src/data/fixtures/gen_fixture.py` |
| `SUBMISSION_URL not set` | Export `SUBMISSION_URL` and `SUBMISSION_ID` env vars |
| `Status still Draft after Create Quote` | CUO must run "Open to Quoted" first (Test 11) |
| `Binder row not found` | Ensure Quote test 13 (Generate Binder) completed successfully |
| `Premium Booking tables empty` | Ensure binder is Finalized and submission is In-Processing |
| `Policy tab shows No Data Found` | Ensure "Send to WINS" completed successfully |
| PDF test `test.skip` skipped | Expected — set `PDF_PREVIEW_ENABLED = true` when app supports it |
