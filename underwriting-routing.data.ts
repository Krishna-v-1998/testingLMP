import { WinsNumberEntry } from '../types/wins-number.types';

/**
 * underwriting-routing.data.ts
 *
 * ── WHAT THIS IS ──────────────────────────────────────────────────────────
 *   Source of truth for all Wins Numbers available in the dropdown and the
 *   fields they auto-populate in Broker Information and Submission Overview.
 *
 *   This mirrors the "Underwriting Routing" sheet in the application.
 *   When the app's routing sheet changes, update the entries below to match.
 *
 * ── HOW TO ADD A NEW WINS NUMBER ─────────────────────────────────────────
 *   1. Copy an existing entry block.
 *   2. Set winsNumber to the exact dropdown option text.
 *   3. Fill brokerInfo with the values the app auto-populates.
 *   4. Fill overviewInfo with the Overview bar values that change.
 *   5. Add it to the UNDERWRITING_ROUTING array.
 *
 * ── PLACEHOLDER WARNING ───────────────────────────────────────────────────
 *   The entry below uses placeholder values.
 *   Replace them with actual values from the application's routing sheet
 *   before running tests against this data.
 */

export const UNDERWRITING_ROUTING: WinsNumberEntry[] = [
  {
    // ── Replace with the EXACT text shown in the Wins Number dropdown ──────
    winsNumber: 'YOUR_WINS_NUMBER_OPTION_TEXT',

    // ── Replace with the values the app fills in Broker Information ────────
    brokerInfo: {
      brokerCompany:  'YOUR_BROKER_COMPANY_NAME',
      brokerContact:  'YOUR_BROKER_CONTACT_NAME',
      email:          'broker@example.com',
      commission:     15,          // numeric — the % that fills in the field
      streetAddress:  '123 Broker Street',
      city:           'New York',
      state:          'NY',
      zip:            '10001',
      country:        'USA',
    },

    // ── Replace with the values that update in the Submission Overview bar ─
    overviewInfo: {
      underwriter:     'YOUR_UNDERWRITER_NAME',
      currentAssignee: 'YOUR_UNDERWRITER_NAME',  // mirrors underwriter
      zone:            'YOUR_ZONE',
      broker:          'YOUR_BROKER_DISPLAY_NAME_IN_OVERVIEW',
    },
  },

  // ── Add more entries here as more Wins Numbers become available ──────────
  // {
  //   winsNumber: 'WIN-2024-002',
  //   brokerInfo: { ... },
  //   overviewInfo: { ... },
  // },
];

// ── Helper ─────────────────────────────────────────────────────────────────

export const UnderwritingRouting = {

  /**
   * Returns the routing entry for a given Wins Number.
   *
   * @param winsNumber - Exact dropdown option text (e.g. 'WIN-2024-001')
   * @throws if the Wins Number is not in the routing data
   *
   * Usage:
   *   const entry = UnderwritingRouting.getByWinsNumber('WIN-2024-001');
   *   await brokerInfoPage.assertAutoPopulatedFromWinsNumber(entry.brokerInfo);
   *   await submissionOverviewPage.assertAutoPopulatedFromWinsNumber(entry.overviewInfo);
   */
  getByWinsNumber(winsNumber: string): WinsNumberEntry {
    const entry = UNDERWRITING_ROUTING.find(e => e.winsNumber === winsNumber);
    if (!entry) {
      throw new Error(
        `No routing entry found for Wins Number: "${winsNumber}".\n` +
        `Available: ${UNDERWRITING_ROUTING.map(e => `"${e.winsNumber}"`).join(', ')}`
      );
    }
    return entry;
  },

  /**
   * Returns the first (default) Wins Number entry.
   * Use in tests that just need *any* valid Wins Number.
   *
   * Usage:
   *   const entry = UnderwritingRouting.getDefault();
   *   await brokerInfoPage.selectWinsNumber(entry.winsNumber);
   */
  getDefault(): WinsNumberEntry {
    if (UNDERWRITING_ROUTING.length === 0) {
      throw new Error('UNDERWRITING_ROUTING is empty. Add at least one entry.');
    }
    return UNDERWRITING_ROUTING[0];
  },

  /**
   * Returns all available Wins Number strings (for parameterised tests).
   */
  allWinsNumbers(): string[] {
    return UNDERWRITING_ROUTING.map(e => e.winsNumber);
  },
};
