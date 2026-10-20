/**
 * wins-number.types.ts
 *
 * ── WHY THIS FILE EXISTS ───────────────────────────────────────────────────
 *   The "Wins Number" field on the Broker Information tab is now a dropdown.
 *   Selecting a Wins Number causes the application to auto-populate fields
 *   in both Broker Information and Submission Overview by reading from the
 *   "Underwriting Routing" data sheet inside the app.
 *
 *   This file defines:
 *     1. What data auto-populates in Broker Information after selection.
 *     2. What data auto-populates in Submission Overview after selection.
 *     3. The combined WinsNumberEntry type used by the routing data file.
 *
 * ── HOW IT WORKS IN THE APP ───────────────────────────────────────────────
 *   User opens Broker Information tab
 *   → clicks Wins Number dropdown
 *   → selects a value (e.g. "WIN-2024-001")
 *   → app reads the matching row from Underwriting Routing sheet
 *   → fills broker fields + overview fields automatically
 *
 * ── HOW IT WORKS IN TESTS ─────────────────────────────────────────────────
 *   await brokerInfoPage.selectWinsNumber('WIN-2024-001');
 *   // ↑ selects dropdown + waits for networkidle (auto-population to finish)
 *
 *   const expected = UnderwritingRouting.getByWinsNumber('WIN-2024-001');
 *   await brokerInfoPage.assertAutoPopulatedFromWinsNumber(expected.brokerInfo);
 *   await submissionOverviewPage.assertAutoPopulatedFromWinsNumber(expected.overviewInfo);
 */

// ── Broker Information: fields that auto-populate ─────────────────────────

export interface WinsNumberBrokerInfo {
  brokerCompany:  string;
  brokerContact?: string;
  email?:         string;
  commission?:    number;
  streetAddress?: string;
  city?:          string;
  state?:         string;
  zip?:           string;
  country?:       string;   // typically 'USA' if not explicitly set
}

// ── Submission Overview: fields that auto-populate ─────────────────────────
//
// When a Wins Number is selected, the Overview bar may update:
//   - underwriter  → assigned based on routing rules
//   - currentAssignee → mirrors underwriter
//   - zone         → territory/zone derived from routing
//   - broker       → broker display name in the top bar

export interface WinsNumberOverviewInfo {
  underwriter?:     string;
  currentAssignee?: string;
  zone?:            string;
  broker?:          string;
}

// ── Combined entry ─────────────────────────────────────────────────────────

export interface WinsNumberEntry {
  /**
   * The exact option text as it appears in the Wins Number dropdown.
   * Pass this string to brokerInfoPage.selectWinsNumber().
   */
  winsNumber:   string;

  /** Fields that auto-fill in the Broker Information tab. */
  brokerInfo:   WinsNumberBrokerInfo;

  /** Fields that auto-update in the Submission Overview top bar. */
  overviewInfo: WinsNumberOverviewInfo;
}
