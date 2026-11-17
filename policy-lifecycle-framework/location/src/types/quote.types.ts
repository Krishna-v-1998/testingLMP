/**
 * quote.types.ts
 * Shared type definitions for the Quote / Binder / Policy lifecycle.
 */

// ── Submission status ─────────────────────────────────────────────────────────

export type SubmissionStatus =
  | 'Open'
  | 'Quoted'
  | 'Bound'
  | 'In-Processing'
  | 'Issued'
  | 'Declined'
  | 'Duplicate'
  | 'Blocked'
  | 'Cancelled';

// ── Quote ─────────────────────────────────────────────────────────────────────

export type QuoteStatus = 'Draft' | 'Generated' | 'Finalized' | 'Archived';

export interface QuoteData {
  product:        string;
  subSegment:     string;
  effectiveDate?: string;
  insuredName?:   string;
  insuredState?:  string;
  insuredCity?:   string;
  expirationDate?:string;
}

export interface QuoteSummary {
  quoteId:        string;
  status:         QuoteStatus;
  effectiveDate?: string;
  product?:       string;
}

// ── Binder ────────────────────────────────────────────────────────────────────

export type BinderStatus = 'Draft' | 'Generated' | 'Finalized' | 'Archived';

// ── Policy ────────────────────────────────────────────────────────────────────

export type PolicyStatus = 'Draft' | 'Generated' | 'Finalized';

// ── Form Set Order ────────────────────────────────────────────────────────────

export type FormOrder = string[];
