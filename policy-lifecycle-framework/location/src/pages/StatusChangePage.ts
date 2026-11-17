/**
 * StatusChangePage.ts
 *
 * Orchestrates ALL submission status transitions:
 *   Open → Quoted
 *   Quoted → Bound
 *   Bound → In-Processing
 *
 * ── HOW STATUS CHANGES WORK ───────────────────────────────────────────────────
 *
 *   1. The user clicks a "Change Status" button (or dedicated transition button)
 *      in the submission top-bar / action bar.
 *   2. A modal opens. It may immediately show:
 *        a) ERROR LIST — required fields / pages not completed.
 *           Action: close the modal, complete the required pages, re-trigger.
 *        b) SEND MODAL — ready to transition; has a "Send" (or "Submit") button.
 *           Action: optionally fill email recipients / notes, then click Send.
 *   3. After the modal closes the submission status badge updates.
 *
 * ── USAGE ────────────────────────────────────────────────────────────────────
 *
 *   const sc = new StatusChangePage(page);
 *
 *   // Open → Quoted (CUO role)
 *   await sc.openToQuoted({
 *     onAccountReviewRequired: async () => {
 *       const ar = new AccountsReviewPage(page);
 *       await ar.goToAccountReview();
 *       await ar.completeAccountReview();
 *     },
 *   });
 *
 *   // Quoted → Bound (CUO role)
 *   await sc.quotedToBound({
 *     onBindingErrorsDetected: async () => {
 *       await new BrokerInformationPage(page).fillCommission(10);
 *       await new UWRationalePage(page).fillUWRationale('Testing');
 *       const bi = new BindingInstructionsChecklistPage(page);
 *       await bi.goToBindingInstructionsChecklist();
 *       await bi.completeChecklist();
 *     },
 *   });
 *
 *   // Bound → In-Processing (GBO role)
 *   await sc.boundToInProcessing({
 *     onPolicyIssuanceRequired: async () => {
 *       const pi = new PolicyIssuanceChecklistPage(page);
 *       await pi.goToPolicyIssuanceChecklist();
 *       await pi.completeAndIssuePolicy();
 *     },
 *   });
 */

import { type Locator, expect } from '@playwright/test';
import { BasePage }             from './base/BasePage';

// ── Option types ─────────────────────────────────────────────────────────────

export interface OpenToQuotedOptions {
  /**
   * Called when the modal reports that Account Review is required.
   * Implement: navigate to Account Review, fill it, save.
   * The method will re-trigger the status change after this callback returns.
   */
  onAccountReviewRequired?: () => Promise<void>;
  /** Email addresses to notify (optional) */
  notifyEmails?: string[];
}

export interface QuotedToBoundOptions {
  /**
   * Called when the modal reports binding-related errors
   * (commission not set, UW Rationale missing, Binding Instructions incomplete).
   * Implement: fill commission, UW Rationale, complete checklist.
   */
  onBindingErrorsDetected?: () => Promise<void>;
  notifyEmails?: string[];
}

export interface BoundToInProcessingOptions {
  /**
   * Called when the modal reports that the Policy Issuance Checklist is required.
   * Implement: navigate to the checklist, fill radio buttons, save.
   */
  onPolicyIssuanceRequired?: () => Promise<void>;
  notifyEmails?: string[];
}

// ═════════════════════════════════════════════════════════════════════════════
// StatusChangePage
// ═════════════════════════════════════════════════════════════════════════════

export class StatusChangePage extends BasePage {

  // ── Status change trigger buttons ─────────────────────────────────────────

  /** Generic "Change Status" button in the submission action bar */
  get btnChangeStatus(): Locator {
    return this.page
      .getByRole('button', { name: /change\s*status/i })
      .or(this.page.getByRole('link', { name: /change\s*status/i }))
      .first();
  }

  /** Transition-specific buttons (may appear instead of / alongside btnChangeStatus) */
  get btnOpenToQuoted(): Locator {
    return this.page.getByRole('button', { name: /open\s*(to\s*)?quoted|quote\s*submission/i }).first();
  }

  get btnQuotedToBound(): Locator {
    return this.page.getByRole('button', { name: /quoted\s*(to\s*)?bound|bind\s*submission/i }).first();
  }

  get btnBoundToInProcessing(): Locator {
    return this.page.getByRole('button', { name: /bound\s*(to\s*)?in.?processing|issue\s*submission/i }).first();
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  get modal(): Locator {
    return this.page.getByRole('dialog').first();
  }

  get modalTitle(): Locator {
    return this.modal.getByRole('heading').first();
  }

  /** Error / warning list inside the modal */
  get modalErrorList(): Locator {
    return this.modal
      .locator('ul, [role="list"], .error-list, .validation-errors, [data-testid*="error"]')
      .first();
  }

  get modalErrorItems(): Locator {
    return this.modal.locator('li, .error-item').filter({ hasText: /.+/ });
  }

  get btnModalSend(): Locator {
    return this.modal.getByRole('button', { name: /^send$|^submit$|^confirm$/i }).first();
  }

  get btnModalClose(): Locator {
    return this.modal
      .getByRole('button', { name: /close|cancel|×/i })
      .or(this.modal.locator('[aria-label="Close"], [data-testid="modal-close"]'))
      .first();
  }

  get modalEmailInput(): Locator {
    return this.modal.getByLabel(/email|notify/i).first();
  }

  // ── Status badge (submission overview) ───────────────────────────────────

  get submissionStatusBadge(): Locator {
    return this.page
      .locator('[data-testid="status-badge"], .status-badge, [class*="status"]')
      .first();
  }

  // ── Low-level helpers ─────────────────────────────────────────────────────

  /** Opens the status-change modal using whatever button is available */
  private async openModal(preferredBtn: Locator): Promise<void> {
    // Try the preferred (specific) button first; fall back to the generic one
    const preferred  = await preferredBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    const btnToClick = preferred ? preferredBtn : this.btnChangeStatus;
    this.log('Opening status-change modal');
    await btnToClick.click();
    await this.page.waitForLoadState('networkidle');
    await this.waitForVisible(this.modal, 15_000);
  }

  /** Returns true when the modal currently shows an error/validation list */
  async modalHasErrors(): Promise<boolean> {
    const errorList = this.modalErrorList;
    if (!(await errorList.isVisible({ timeout: 2_000 }).catch(() => false))) return false;
    const count = await this.modalErrorItems.count();
    return count > 0;
  }

  /** Collects the visible error messages from the modal */
  async getModalErrors(): Promise<string[]> {
    const items = this.modalErrorItems;
    const count = await items.count();
    const errors: string[] = [];
    for (let i = 0; i < count; i++) {
      errors.push((await items.nth(i).textContent() ?? '').trim());
    }
    return errors;
  }

  /** Closes the modal without submitting */
  async closeModal(): Promise<void> {
    this.log('Closing status-change modal (errors present — fix required)');
    await this.btnModalClose.click();
    await this.waitForHidden(this.modal, 10_000);
    await this.page.waitForLoadState('networkidle');
  }

  /** Fills optional email recipients and clicks Send */
  private async sendModal(notifyEmails?: string[]): Promise<void> {
    if (notifyEmails?.length) {
      this.log(`Filling notification emails: ${notifyEmails.join(', ')}`);
      const emailInput = this.modalEmailInput;
      if (await emailInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await this.clearAndFill(emailInput, notifyEmails.join(', '));
      }
    }
    this.log('Clicking Send on status-change modal');
    await this.btnModalSend.click();
    await this.page.waitForLoadState('networkidle');
    // Wait for modal to close
    await this.waitForHidden(this.modal, 20_000).catch(() => {
      this.warn('Modal did not close after Send — may still be processing');
    });
  }

  // ── High-level transition methods ─────────────────────────────────────────

  /**
   * Performs the Open → Quoted transition.
   *
   * Flow:
   *   1. Open modal.
   *   2. If error detected → close modal, call onAccountReviewRequired(), re-open.
   *   3. Click Send.
   */
  async openToQuoted(options: OpenToQuotedOptions = {}): Promise<void> {
    this.log('Starting Open → Quoted transition');

    await this.openModal(this.btnOpenToQuoted);

    if (await this.modalHasErrors()) {
      const errors = await this.getModalErrors();
      this.log(`Modal errors detected: ${errors.join(' | ')}`);

      await this.closeModal();

      if (options.onAccountReviewRequired) {
        this.log('Calling onAccountReviewRequired handler');
        await options.onAccountReviewRequired();
      } else {
        throw new Error(
          'Open → Quoted: modal reported errors but no onAccountReviewRequired handler was provided.\n' +
          `Errors: ${errors.join('\n')}`,
        );
      }

      // Re-open after fixing errors
      await this.openModal(this.btnOpenToQuoted);

      if (await this.modalHasErrors()) {
        const remaining = await this.getModalErrors();
        throw new Error(
          `Open → Quoted: errors remain after fix attempt:\n${remaining.join('\n')}`,
        );
      }
    }

    await this.sendModal(options.notifyEmails);
    this.log('Open → Quoted transition submitted');
  }

  /**
   * Performs the Quoted → Bound transition.
   *
   * Flow:
   *   1. Open modal.
   *   2. If errors → close, call onBindingErrorsDetected(), re-open.
   *   3. Click Send.
   */
  async quotedToBound(options: QuotedToBoundOptions = {}): Promise<void> {
    this.log('Starting Quoted → Bound transition');

    await this.openModal(this.btnQuotedToBound);

    if (await this.modalHasErrors()) {
      const errors = await this.getModalErrors();
      this.log(`Modal errors detected: ${errors.join(' | ')}`);

      await this.closeModal();

      if (options.onBindingErrorsDetected) {
        this.log('Calling onBindingErrorsDetected handler');
        await options.onBindingErrorsDetected();
      } else {
        throw new Error(
          'Quoted → Bound: modal reported errors but no onBindingErrorsDetected handler was provided.\n' +
          `Errors: ${errors.join('\n')}`,
        );
      }

      await this.openModal(this.btnQuotedToBound);

      if (await this.modalHasErrors()) {
        const remaining = await this.getModalErrors();
        throw new Error(
          `Quoted → Bound: errors remain after fix attempt:\n${remaining.join('\n')}`,
        );
      }
    }

    await this.sendModal(options.notifyEmails);
    this.log('Quoted → Bound transition submitted');
  }

  /**
   * Performs the Bound → In-Processing transition.
   *
   * Flow:
   *   1. Open modal.
   *   2. If errors → close, call onPolicyIssuanceRequired(), re-open.
   *   3. Click Send.
   */
  async boundToInProcessing(options: BoundToInProcessingOptions = {}): Promise<void> {
    this.log('Starting Bound → In-Processing transition');

    await this.openModal(this.btnBoundToInProcessing);

    if (await this.modalHasErrors()) {
      const errors = await this.getModalErrors();
      this.log(`Modal errors detected: ${errors.join(' | ')}`);

      await this.closeModal();

      if (options.onPolicyIssuanceRequired) {
        this.log('Calling onPolicyIssuanceRequired handler');
        await options.onPolicyIssuanceRequired();
      } else {
        throw new Error(
          'Bound → In-Processing: modal reported errors but no onPolicyIssuanceRequired handler was provided.\n' +
          `Errors: ${errors.join('\n')}`,
        );
      }

      await this.openModal(this.btnBoundToInProcessing);

      if (await this.modalHasErrors()) {
        const remaining = await this.getModalErrors();
        throw new Error(
          `Bound → In-Processing: errors remain after fix attempt:\n${remaining.join('\n')}`,
        );
      }
    }

    await this.sendModal(options.notifyEmails);
    this.log('Bound → In-Processing transition submitted');
  }

  // ── Assertions ────────────────────────────────────────────────────────────

  async assertSubmissionStatus(expected: string): Promise<void> {
    this.log(`Asserting submission status = "${expected}"`);
    await expect(
      this.page.getByText(expected, { exact: false }).first(),
      `Submission status should be "${expected}"`,
    ).toBeVisible({ timeout: 20_000 });
  }
}
