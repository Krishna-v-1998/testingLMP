/**
 * submission.types.ts
 * Shared types for submission context, form data, and related models.
 */

// ── Submission Context ────────────────────────────────────────────────────────

/**
 * Minimal context stored after a submission is created.
 * AuthManager writes this; lifecycle specs read it.
 */
export interface SubmissionContext {
  /** Full URL to the submission overview page */
  submissionUrl:        string;
  /** Metrix submission ID (numeric string) */
  submissionId:         string;
  /** Display submission number (e.g. "NB-2026-00001") */
  submissionNumber?:    string;
  /** Named Insured used at creation time */
  namedInsured?:        string;
  /** Label used when storing / looking up this context */
  label?:               string;
  /** ISO timestamp of when the context was created */
  createdAt?:           string;
  /** Form data used to create the submission */
  formData?:            SubmissionFormData;
}

// ── Submission Form Data ──────────────────────────────────────────────────────

export interface InsuredData {
  namedInsured:   string;
  country:        string;
  streetAddress:  string;
  city:           string;
  state:          string;
  zip:            string;
  streetAddress2?: string;
}

export interface BrokerData {
  brokerCompany:  string;
  country:        string;
  streetAddress:  string;
  city:           string;
  state:          string;
  zip:            string;
  wins?:          string;
  email?:         string;
  commission?:    number;
}

export interface SubmissionFormData {
  submissionNumber:   string;
  sfdcId?:            string;
  inceptionDate:      string;
  expirationDate:     string;
  requestedDate?:     string;
  winsNumber:         string;
  products:           string[];
  policyType:         'New' | 'Renewal';
  subLob:             'Inland' | 'Cargo';
  insured:            InsuredData;
  broker:             BrokerData;
  primaryUnderwriter: string;
}
