/**
 * SubmissionSetupService.ts
 *
 * Manages submission context for lifecycle tests.
 *
 * ── WHAT IT DOES ─────────────────────────────────────────────────────────────
 *
 *   createAndStoreContext():
 *     1. If reuseExisting=true and a context file already exists for `label`,
 *        return the stored context immediately (fast path for suite re-runs).
 *     2. Otherwise, create a new browser context with the given role's
 *        storage state, navigate to the app, and delegate to AuthManager
 *        (or the env-var fallback) to obtain the submission URL + ID.
 *     3. Write the context to `test-data/contexts/<label>.json` for reuse.
 *
 * ── ENV VARS ─────────────────────────────────────────────────────────────────
 *
 *   SUBMISSION_URL   – direct URL to the submission overview page
 *   SUBMISSION_ID    – numeric submission ID
 *
 *   These are used as an override / fallback when the AuthManager is not
 *   available or when you want to point tests at an existing submission.
 *
 * ── STORAGE STATE PATHS ──────────────────────────────────────────────────────
 *
 *   storage-states/gbo.json
 *   storage-states/cuo.json
 *   storage-states/uw.json
 */

import * as fs   from 'fs';
import * as path from 'path';
import type { Browser } from '@playwright/test';
import type { SubmissionContext } from '../types/submission.types';
import { Role } from '../enums/role.enum';

// ── Storage location for persisted contexts ───────────────────────────────────

const CONTEXT_DIR = path.resolve(process.cwd(), 'test-data', 'contexts');

function contextFilePath(label: string): string {
  return path.join(CONTEXT_DIR, `${label}.json`);
}

// ── Storage-state path per role ───────────────────────────────────────────────

function storageStatePath(role: Role): string {
  const map: Record<Role, string> = {
    [Role.GBO]: 'storage-states/gbo.json',
    [Role.CUO]: 'storage-states/cuo.json',
    [Role.UW]:  'storage-states/uw.json',
  };
  return path.resolve(process.cwd(), map[role]);
}

// ═════════════════════════════════════════════════════════════════════════════
// SubmissionSetupService
// ═════════════════════════════════════════════════════════════════════════════

export class SubmissionSetupService {

  /**
   * Creates or retrieves a SubmissionContext.
   *
   * @param browser       Playwright Browser instance (from beforeAll fixture)
   * @param role          The role to authenticate as when creating a new context
   * @param options.label           Key used to store / look up the context on disk
   * @param options.reuseExisting   If true (default), return a cached context if present
   * @param options.baseUrl         App base URL; falls back to process.env.BASE_URL
   */
  static async createAndStoreContext(
    browser: Browser,
    role:    Role,
    options: {
      label:          string;
      reuseExisting?: boolean;
      baseUrl?:       string;
    },
  ): Promise<SubmissionContext> {
    const { label, reuseExisting = true, baseUrl } = options;

    // ── Fast path: return cached context ──────────────────────────────────
    if (reuseExisting) {
      const cached = this.loadCachedContext(label);
      if (cached) {
        console.log(`[SubmissionSetupService] Reusing cached context for "${label}"`);
        return cached;
      }
    }

    // ── Env-var override (for CI / quick manual runs) ─────────────────────
    const envUrl = process.env.SUBMISSION_URL;
    const envId  = process.env.SUBMISSION_ID;

    if (envUrl && envId) {
      console.log(`[SubmissionSetupService] Using env-var submission: ${envId}`);
      const ctx: SubmissionContext = {
        submissionUrl: envUrl,
        submissionId:  envId,
        label,
        createdAt:     new Date().toISOString(),
      };
      this.storeContext(label, ctx);
      return ctx;
    }

    // ── Full creation path: browser context + AuthManager ─────────────────
    const storageState = storageStatePath(role);

    if (!fs.existsSync(storageState)) {
      throw new Error(
        `SubmissionSetupService: storage-state file not found: ${storageState}\n` +
        `Run your login script to generate it, or set SUBMISSION_URL + SUBMISSION_ID env vars.`,
      );
    }

    const context = await browser.newContext({ storageState });
    const page    = await context.newPage();

    try {
      // Navigate to the app home / submissions list
      const appUrl = baseUrl ?? process.env.BASE_URL ?? '';
      if (!appUrl) {
        throw new Error(
          'SubmissionSetupService: no BASE_URL provided. ' +
          'Set process.env.BASE_URL or pass options.baseUrl.',
        );
      }

      await page.goto(appUrl);
      await page.waitForLoadState('networkidle');

      // ── Delegate to AuthManager if available ─────────────────────────────
      // AuthManager is an external service already set up in the codebase.
      // We try to import it dynamically so this file compiles even without it.
      let submissionCtx: SubmissionContext | null = null;

      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { AuthManager } = require('../services/AuthManager') as {
          AuthManager: {
            getSubmissionContext(label: string): SubmissionContext | null;
            createSubmission(page: unknown, role: Role): Promise<SubmissionContext>;
            storeContext(label: string, ctx: SubmissionContext): void;
          };
        };

        // Try to get existing context via AuthManager first
        submissionCtx = AuthManager.getSubmissionContext(label);

        if (!submissionCtx) {
          submissionCtx = await AuthManager.createSubmission(page, role);
          AuthManager.storeContext(label, submissionCtx);
        }
      } catch {
        // AuthManager not available — caller must supply SUBMISSION_URL + SUBMISSION_ID
        throw new Error(
          'SubmissionSetupService: AuthManager not found and SUBMISSION_URL / SUBMISSION_ID ' +
          'env vars are not set. Either set those env vars or ensure AuthManager is importable ' +
          'from ../services/AuthManager.',
        );
      }

      this.storeContext(label, submissionCtx);
      return submissionCtx;
    } finally {
      await context.close();
    }
  }

  // ── Persistence helpers ───────────────────────────────────────────────────

  private static loadCachedContext(label: string): SubmissionContext | null {
    const filePath = contextFilePath(label);
    if (!fs.existsSync(filePath)) return null;
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw) as SubmissionContext;
    } catch {
      return null;
    }
  }

  static storeContext(label: string, ctx: SubmissionContext): void {
    if (!fs.existsSync(CONTEXT_DIR)) {
      fs.mkdirSync(CONTEXT_DIR, { recursive: true });
    }
    const filePath = contextFilePath(label);
    fs.writeFileSync(filePath, JSON.stringify({ ...ctx, label }, null, 2), 'utf8');
    console.log(`[SubmissionSetupService] Context stored: ${filePath}`);
  }

  /**
   * Removes a cached context file (useful when you want to force re-creation).
   */
  static clearCachedContext(label: string): void {
    const filePath = contextFilePath(label);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}
