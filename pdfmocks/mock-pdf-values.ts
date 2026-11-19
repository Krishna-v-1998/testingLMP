/**
 * mock-pdf-values.ts
 *
 * Sample "live UI values" for mock PDF comparison tests.
 * These simulate the values that would be read from the UI during a real run.
 *
 * In production tests, these values come from  page.getByLabel(...).inputValue()
 * and similar Playwright calls. Here they are hard-coded so the mock spec can
 * run completely offline, without a browser.
 */

import type { TemplateValues } from '../src/utils/MockPdfViewer';

/** Full value set for a Builder's Risk submission */
export const BR_SAMPLE_VALUES: TemplateValues = {
  // ── Insured / policy ────────────────────────────────────────────────────
  'Named Insured':   'Acme Construction LLC',
  'Policy Number':   'BR-2025-001234',
  'Effective Date':  '01/01/2025',
  'Expiration Date': '01/01/2026',

  // ── Location ─────────────────────────────────────────────────────────────
  'Location Address': '123 Test Street',
  'City':             'Chicago',
  'State':            'Illinois',
  'Zip Code':         '60601',

  // ── Coverages / values ────────────────────────────────────────────────────
  'Building Value':      '1,000,000',
  'Contents Value':      '500,000',
  'Total Insured Value': '1,500,000',
  'Deductible':          '5,000',
  'Sprinklered':         'Yes',

  // ── Terrorism ─────────────────────────────────────────────────────────────
  'Terrorism Coverage': 'include',
  'TRIA Percentage':    '1',
  'Terrorism Premium':  '750',

  // ── Premium ───────────────────────────────────────────────────────────────
  'Base Premium':    '15,000',
  'Annual Premium':  '15,750',

  // ── Producer ──────────────────────────────────────────────────────────────
  'Producer Name':    'Allianz GBO Representative',
  'Commission Rate':  '10',
};

/** Minimal values for quick sanity checks (subset only) */
export const BR_MINIMAL_VALUES: TemplateValues = {
  'Named Insured':   'Acme Construction LLC',
  'Policy Number':   'BR-2025-001234',
  'Effective Date':  '01/01/2025',
  'Expiration Date': '01/01/2026',
};
