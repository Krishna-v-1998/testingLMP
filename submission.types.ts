/**
 * submission.types.ts
 *
 * Shared types for submission-level context.
 *
 * A "submission" in the Allianz / Unqork platform is the top-level container
 * that holds one or more Quotes, Binders, and Policies.
 *
 * URL pattern:
 *   https://<host>/app/metrix-ui/#/display/<id>?metrixSubmissionId=<submissionId>
 *
 * ── LIFECYCLE ─────────────────────────────────────────────────────────────────
 *
 *   Submission status: Draft → Quoted → Bound → In-Processing → Issued
 *   Quote status:      Draft → Quoted → Finalized → Bound
 *   Binder status:     Draft → Generated → Finalized
 *   Policy status:     Draft → Generated → Finalized
 *
 * ── USAGE ─────────────────────────────────────────────────────────────────────
 *
 *   // In beforeAll — create or reuse a submission:
 *   const ctx = await SubmissionSetupService.createAndStoreContext(browser, Role.UW);
 *
 *   // In beforeEach — navigate to the submission:
 *   await submissionOverview.navigateByUrl(ctx.submissionUrl);
 *
 *   // In tests — reference quote/binder IDs:
 *   const quoteId = ctx.activeQuoteId;
 */

// ── Submission Context ─────────────────────────────────────────────────────────

/**
 * Full context for a submission created (or retrieved) during test setup.
 * Stored in a module-level variable and shared across all tests in a spec file.
 */
export interface SubmissionContext {

  // ── Submission-level IDs ───────────────────────────────────────────────────

  /** Numeric submission ID — the `metrixSubmissionId` query parameter */
  submissionId: string;

  /**
   * Full URL of the submission overview page.
   * e.g. https://allianz-qa.unqork.io/app/metrix-ui/#/display/abc123?metrixSubmissionId=99999
   * Used in beforeEach to navigate directly to the submission.
   */
  submissionUrl: string;

  /**
   * Display ID shown in the UI for the submission.
   * This may differ from submissionId — in Unqork it is often a human-friendly
   * code like "SUB-2026-00123".
   */
  submissionDisplayId?: string;

  // ── Quote IDs ─────────────────────────────────────────────────────────────

  /**
   * ID of the most-recently created (or reused) quote.
   * Updated by SubmissionSetupService after quote creation.
   */
  activeQuoteId?: string;

  /**
   * All quote IDs created on this submission.
   * Index 0 is the first (oldest) quote; last index is the newest.
   */
  allQuoteIds?: string[];

  // ── Binder IDs ────────────────────────────────────────────────────────────

  /**
   * ID of the most-recently created binder.
   * Populated after the "Generate Binder >" action.
   */
  activeBinderId?: string;

  /**
   * All binder IDs created on this submission.
   */
  allBinderIds?: string[];

  // ── Policy IDs ────────────────────────────────────────────────────────────

  /**
   * ID of the most-recently generated policy.
   * Populated after the "Generate Policy" action on tab 04.
   */
  activePolicyId?: string;

  /**
   * All policy IDs created on this submission.
   */
  allPolicyIds?: string[];

  // ── Meta ───────────────────────────────────────────────────────────────────

  /**
   * Role used to create the submission.
   * Corresponds to Role enum values: 'uw', 'cuo', etc.
   */
  role: string;

  /**
   * ISO timestamp when this context was created.
   * Used for diagnostics — e.g. to log how long setup took.
   */
  createdAt: string;

  /**
   * Optional: human-readable label for the submission, used in test reports.
   * e.g. "Builder's Risk E2E — 2026-01-01"
   */
  label?: string;
}

// ── Minimal creation request ──────────────────────────────────────────────────

/**
 * Options passed to SubmissionSetupService.createAndStoreContext().
 */
export interface SubmissionCreateOptions {

  /** Product type for the first quote — e.g. 'Construction' */
  product?: string;

  /** Sub-segment for the first quote — e.g. "Builder's Risk" */
  subSegment?: string;

  /**
   * If true, the service will attempt to reuse an existing submission stored
   * in the global context cache rather than creating a new one.
   * Default: false (always create a fresh submission).
   */
  reuseExisting?: boolean;

  /**
   * Optional label for the submission, used in diagnostics.
   */
  label?: string;
}
