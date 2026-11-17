/**
 * status.enum.ts
 * Submission status values used for status-change transitions.
 */
export enum SubmissionStatus {
  Open         = 'Open',
  Quoted       = 'Quoted',
  Bound        = 'Bound',
  InProcessing = 'In-Processing',
  Issued       = 'Issued',
  Declined     = 'Declined',
  Duplicate    = 'Duplicate',
  Blocked      = 'Blocked',
  Cancelled    = 'Cancelled',
}
