import { Page, Locator, expect } from '@playwright/test';
import { BasePage }               from './base/BasePage';
import { DropdownComponent }      from '../components/DropdownComponent';
import { SubmissionFormData }     from '../types/submission.types';
import { WinsNumberBrokerInfo }   from '../types/wins-number.types';

/**
 * BrokerInformationPage
 *
 * ── WHAT THIS IS ─────────────────────────────────────────────────────────────
 *   The "Broker Information" tab inside General Information.
 *   This is where the broker's details are stored — who the broker company is,
 *   their contact info, their commission percentage, and any notes about them.
 *
 * ── KEY BUSINESS RULES ENFORCED HERE ─────────────────────────────────────────
 *   1. EMAIL: Must be in valid format (someone@domain.com)
 *      - valid@company.com → accepted, no error
 *      - notanemail       → error appears: "must be a valid email"
 *
 *   2. COMMISSION: Must be a percentage between 0 and 100
 *      - 0 to 100 → accepted, no error
 *      - 101      → error appears (over the maximum)
 *
 *   3. BROKER NOTES CHARACTER COUNTER:
 *      The Broker Notes/Review field has a character limit of 2000.
 *      A counter COUNTS DOWN as you type:
 *        Empty field     → counter shows "2000"
 *        Type 50 chars   → counter shows "1950"
 *        Type 2000 chars → counter shows "0" (cannot type more)
 *      WHY IT COUNTS DOWN: Shows remaining characters, not used characters.
 *
 *   4. WINS NUMBER (dropdown — changed from text input):
 *      Selecting a Wins Number auto-populates broker fields AND
 *      Submission Overview fields from the Underwriting Routing sheet.
 *      Use selectWinsNumber() + assertAutoPopulatedFromWinsNumber() to test this.
 *
 * ── HOW YOU GET HERE ─────────────────────────────────────────────────────────
 *   await submissionOverview.waitUntilLoaded();
 *   await submissionOverview.clickBrokerInformationTab();
 *   await brokerInfoPage.verifyPageLoaded(); ← brokerInfoPage is the fixture
 *
 * ── SETUP REQUIRED ───────────────────────────────────────────────────────────
 *   Replace all YOUR_*_SELECTOR with actual selectors.
 */
export class BrokerInformationPage extends BasePage {

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCATORS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Page Ready Signal ───────────────────────────────────────────────────────
  // Broker Company is always auto-filled when the tab loads.
  // We wait for it to confirm the tab is fully active and ready.
  readonly brokerCompanyInput:  Locator;

  // ── Text Input Fields ───────────────────────────────────────────────────────
  readonly brokerContactInput:  Locator;
  readonly emailInput:          Locator;
  readonly commissionInput:     Locator;
  readonly streetAddressInput:  Locator;
  readonly streetAddress2Input: Locator;
  readonly cityInput:           Locator;
  readonly zipInput:            Locator;

  // ── Dropdown Components ─────────────────────────────────────────────────────
  // WINS NUMBER is now a dropdown — it reads from the Underwriting Routing sheet.
  // Selecting a value auto-populates broker fields + Submission Overview fields.
  readonly winsNumberDropdown: DropdownComponent;

  // Country and State are dropdowns — using DropdownComponent (same as Insured tab)
  readonly countryDropdown: DropdownComponent;
  readonly stateDropdown:   DropdownComponent;

  // ── Rich Text Editor ────────────────────────────────────────────────────────
  // "Broker Notes" / "Broker Review" field — contenteditable div, not an <input>
  // Has a character counter: 2000 chars max, counts DOWN as you type
  readonly brokerNotesEditor:  Locator;
  readonly uwRationaleEditor:  Locator;

  // ── Character Counter ────────────────────────────────────────────────────────
  // Shows how many characters REMAIN in the Broker Notes field.
  // Starts at 2000. Each character typed reduces it by 1.
  // Example text it shows: "1950 characters remaining" or just "1950"
  readonly characterCounter: Locator;

  // ── Validation Error Messages ────────────────────────────────────────────────
  readonly emailError:      Locator;  // "must be a valid email"
  readonly commissionError: Locator;  // "must be between 0 and 100"

  constructor(page: Page) {
    super(page);

    // Page ready signal
    this.brokerCompanyInput  = page.locator('YOUR_BROKER_COMPANY_INPUT');

    // Text inputs
    this.brokerContactInput  = page.locator('YOUR_BROKER_CONTACT_INPUT');
    this.emailInput          = page.locator('YOUR_BROKER_EMAIL_INPUT');
    this.commissionInput     = page.locator('YOUR_BROKER_COMMISSION_INPUT');
    this.streetAddressInput  = page.locator('YOUR_BROKER_STREET_ADDRESS_INPUT');
    this.streetAddress2Input = page.locator('YOUR_BROKER_STREET_ADDRESS_2_INPUT');
    this.cityInput           = page.locator('YOUR_BROKER_CITY_INPUT');
    this.zipInput            = page.locator('YOUR_BROKER_ZIP_INPUT');

    // ── WINS NUMBER — DropdownComponent ──────────────────────────────────────
    // CHANGED: was a text input (winsNumberInput: Locator).
    // Now a dropdown backed by the Underwriting Routing sheet.
    //
    // Replace the two selectors:
    //   YOUR_BROKER_WINS_NUMBER_CONTAINER → the outer wrapper element of the dropdown
    //   YOUR_BROKER_WINS_NUMBER_INPUT     → the inner <input> element of the dropdown
    //
    // Same pattern as countryDropdown and stateDropdown below.
    this.winsNumberDropdown = new DropdownComponent(
      page,
      page.locator('YOUR_BROKER_WINS_NUMBER_CONTAINER'),
      page.locator('YOUR_BROKER_WINS_NUMBER_INPUT'),
    );

    // Country and State dropdowns — unchanged
    this.countryDropdown = new DropdownComponent(
      page,
      page.locator('YOUR_BROKER_COUNTRY_CONTAINER'),
      page.locator('YOUR_BROKER_COUNTRY_INPUT'),
    );

    this.stateDropdown = new DropdownComponent(
      page,
      page.locator('YOUR_BROKER_STATE_CONTAINER'),
      page.locator('YOUR_BROKER_STATE_INPUT'),
    );

    // Rich text editors
    this.brokerNotesEditor  = page.locator('YOUR_BROKER_NOTES_EDITOR_SELECTOR');
    this.uwRationaleEditor  = page.locator('YOUR_BROKER_UW_RATIONALE_SELECTOR');

    // Character counter for broker notes
    this.characterCounter   = page.locator('YOUR_BROKER_NOTES_CHARACTER_COUNTER');

    // Validation errors
    this.emailError         = page.locator('YOUR_BROKER_EMAIL_ERROR_SELECTOR');
    this.commissionError    = page.locator('YOUR_BROKER_COMMISSION_ERROR_SELECTOR');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE LOAD CHECK
  //
  // WHY brokerCompanyInput as the ready signal:
  //   - Always auto-filled from submission creation data
  //   - Always visible on this tab
  //   - Seeing it means data has loaded into the form
  // ═══════════════════════════════════════════════════════════════════════════

  async verifyPageLoaded(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.brokerCompanyInput.waitFor({
      state:   'visible',
      timeout: 15_000,
    });
    this.log('Broker Information tab loaded');
  }

  async getPageTitle(): Promise<string> { return this.page.title(); }

  // ═══════════════════════════════════════════════════════════════════════════
  // READ VALUES
  // ═══════════════════════════════════════════════════════════════════════════

  async getBrokerCompany():  Promise<string> { return (await this.brokerCompanyInput.inputValue()).trim(); }
  async getEmail():          Promise<string> { return (await this.emailInput.inputValue()).trim(); }
  async getCommission():     Promise<string> { return (await this.commissionInput.inputValue()).trim(); }
  async getStreetAddress():  Promise<string> { return (await this.streetAddressInput.inputValue()).trim(); }
  async getCity():           Promise<string> { return (await this.cityInput.inputValue()).trim(); }
  async getZip():            Promise<string> { return (await this.zipInput.inputValue()).trim(); }

  // Dropdown reads via DropdownComponent
  async getWinsNumber():     Promise<string> { return this.winsNumberDropdown.getSelectedValue(); }
  async getCountry():        Promise<string> { return this.countryDropdown.getSelectedValue(); }
  async getState():          Promise<string> { return this.stateDropdown.getSelectedValue(); }

  /**
   * Reads the character counter and returns the remaining count as a number.
   *
   * HOW IT WORKS:
   *   The counter element shows something like "1950 characters remaining"
   *   We extract just the NUMBER from that text using a regex.
   *
   *   regex /(\d+)/ finds the FIRST sequence of digits in the text.
   *   "1950 characters remaining" → extracts "1950" → parseInt → 1950
   *
   * WHY return a number (not string):
   *   Makes it easy to do math: expect(count).toBe(2000 - 50)
   */
  async getRemainingCharacterCount(): Promise<number> {
    const text  = (await this.characterCounter.innerText()).trim();
    const match = text.match(/(\d+)/);
    const count = match ? parseInt(match[1], 10) : 0;
    this.log(`Character counter reads: "${text}" → ${count}`);
    return count;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FILL / SELECT VALUES
  // ═══════════════════════════════════════════════════════════════════════════

  async fillBrokerCompany(name: string): Promise<void> {
    await this.brokerCompanyInput.clear();
    await this.brokerCompanyInput.fill(name);
    await this.brokerCompanyInput.press('Tab');
    this.log(`Filled Broker Company: ${name}`);
  }

  // ── WINS NUMBER — select from dropdown ───────────────────────────────────
  //
  // CHANGED from fillWinsNumber (text input) to selectWinsNumber (dropdown).
  //
  // WHY waitForLoadState('networkidle') after selection:
  //   Selecting a Wins Number triggers an API call to the Underwriting Routing
  //   sheet, which then fills in broker fields + Submission Overview fields.
  //   We must wait for that API call to finish before asserting the auto-filled
  //   values — otherwise we will read the fields before they are populated.
  //
  // Usage:
  //   const entry = UnderwritingRouting.getDefault();
  //   await brokerInfoPage.selectWinsNumber(entry.winsNumber);
  //   await brokerInfoPage.assertAutoPopulatedFromWinsNumber(entry.brokerInfo);

  async selectWinsNumber(winsNumber: string): Promise<void> {
    await this.winsNumberDropdown.select(winsNumber);
    await this.page.waitForLoadState('networkidle');   // wait for auto-population API call
    this.log(`Selected Wins Number: ${winsNumber}`);
  }

  async fillBrokerContact(contact: string): Promise<void> {
    await this.brokerContactInput.clear();
    await this.brokerContactInput.fill(contact);
    await this.brokerContactInput.press('Tab');
  }

  /**
   * Fills the Email field.
   * Pressing Tab triggers BOTH:
   *   1. Auto-save
   *   2. Email format validation (shows error if format is wrong)
   *
   * Valid:   user@company.com → no error
   * Invalid: notanemail       → error appears
   * Invalid: user@            → error appears
   */
  async fillEmail(email: string): Promise<void> {
    await this.emailInput.clear();
    await this.emailInput.fill(email);
    await this.emailInput.press('Tab');
    this.log(`Filled Email: ${email}`);
  }

  /**
   * Fills the Commission field.
   * Commission must be a number between 0 and 100.
   *
   * WHY String(value):
   *   fill() expects a string. Our parameter is a number.
   *   String(100) = "100" — converts cleanly.
   */
  async fillCommission(value: number): Promise<void> {
    await this.commissionInput.clear();
    await this.commissionInput.fill(String(value));
    await this.commissionInput.press('Tab');
    this.log(`Filled Commission: ${value}%`);
  }

  async selectCountry(country: string): Promise<void> {
    await this.countryDropdown.select(country);
    await this.page.waitForLoadState('networkidle');
    this.log(`Selected Broker Country: ${country}`);
  }

  async selectState(state: string): Promise<void> {
    await this.stateDropdown.select(state);
    this.log(`Selected Broker State: ${state}`);
  }

  async fillStreetAddress(address: string): Promise<void> {
    await this.streetAddressInput.clear();
    await this.streetAddressInput.fill(address);
    await this.streetAddressInput.press('Tab');
  }

  async fillCity(city: string): Promise<void> {
    await this.cityInput.clear();
    await this.cityInput.fill(city);
    await this.cityInput.press('Tab');
  }

  async fillZip(zip: string): Promise<void> {
    await this.zipInput.clear();
    await this.zipInput.fill(zip);
    await this.zipInput.press('Tab');
  }

  /**
   * Types text into the Broker Notes rich text editor.
   *
   * WHY click() then fill():
   *   Rich text editors need focus before text is typed.
   *   click() gives it focus, fill() types the text.
   *   The character counter decrements as you type.
   */
  async fillBrokerNotes(text: string): Promise<void> {
    await this.brokerNotesEditor.click();
    await this.brokerNotesEditor.fill(text);
    this.log(`Filled Broker Notes: ${text.length} characters`);
  }

  /**
   * Clears all text from the Broker Notes editor.
   * After clearing, the counter should reset to 2000.
   *
   * HOW IT WORKS:
   *   Control+A = select all text in the editor
   *   Delete    = delete all selected text
   */
  async clearBrokerNotes(): Promise<void> {
    await this.brokerNotesEditor.click();
    await this.brokerNotesEditor.press('Control+a');
    await this.brokerNotesEditor.press('Delete');
    this.log('Cleared Broker Notes');
  }

  async fillUWRationale(text: string): Promise<void> {
    await this.uwRationaleEditor.click();
    await this.uwRationaleEditor.fill(text);
    this.log('Filled UW Rationale');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ASSERTIONS — Field Value Checks
  // ═══════════════════════════════════════════════════════════════════════════

  async assertBrokerCompany(expected: string): Promise<void> {
    await expect(
      this.brokerCompanyInput,
      `BROKER COMPANY — expected: "${expected}"`
    ).toHaveValue(expected);
    this.log(`✅ Broker Company: ${expected}`);
  }

  // ── WINS NUMBER assertion — reads from DropdownComponent ──────────────────
  async assertWinsNumber(expected: string): Promise<void> {
    const actual = await this.winsNumberDropdown.getSelectedValue();
    expect(
      actual,
      `WINS NUMBER — expected: "${expected}" | actual: "${actual}"`
    ).toBe(expected);
    this.log(`✅ WINS Number: ${expected}`);
  }

  async assertEmail(expected: string): Promise<void> {
    await expect(
      this.emailInput,
      `EMAIL — expected: "${expected}"`
    ).toHaveValue(expected);
    this.log(`✅ Email: ${expected}`);
  }

  async assertCommission(expected: number): Promise<void> {
    await expect(
      this.commissionInput,
      `COMMISSION — expected: "${expected}"`
    ).toHaveValue(String(expected));
    this.log(`✅ Commission: ${expected}%`);
  }

  async assertCountry(expected: string): Promise<void> {
    const actual = await this.countryDropdown.getSelectedValue();
    expect(
      actual,
      `COUNTRY — expected: "${expected}" | actual: "${actual}"`
    ).toBe(expected);
    this.log(`✅ Country: ${expected}`);
  }

  async assertDefaultCountry(): Promise<void> {
    await this.assertCountry('USA');
  }

  async assertState(expected: string): Promise<void> {
    const actual = await this.stateDropdown.getSelectedValue();
    expect(
      actual,
      `STATE — expected: "${expected}" | actual: "${actual}"`
    ).toBe(expected);
    this.log(`✅ State: ${expected}`);
  }

  async assertStreetAddress(expected: string): Promise<void> {
    await expect(this.streetAddressInput).toHaveValue(expected);
    this.log(`✅ Street Address: ${expected}`);
  }

  async assertCity(expected: string): Promise<void> {
    await expect(this.cityInput).toHaveValue(expected);
    this.log(`✅ City: ${expected}`);
  }

  async assertZip(expected: string): Promise<void> {
    await expect(this.zipInput).toHaveValue(expected);
    this.log(`✅ Zip: ${expected}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ASSERTIONS — Email Validation
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Confirms the email validation error IS showing.
   * Call after fillEmail() with an invalid email format.
   *
   * Error message typically says something like "must be a valid email"
   * We use toContainText() because the exact wording may vary.
   */
  async assertEmailValidationError(): Promise<void> {
    await expect(
      this.emailError,
      'Email validation error should be visible after invalid email'
    ).toBeVisible();
    await expect(this.emailError).toContainText('valid email');
    this.log('✅ Email validation error shown');
  }

  /**
   * Confirms the email validation error is NOT showing.
   * Call after fillEmail() with a valid email format.
   */
  async assertNoEmailValidationError(): Promise<void> {
    await expect(
      this.emailError,
      'Email error should NOT be visible after valid email'
    ).toBeHidden();
    this.log('✅ No email validation error');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ASSERTIONS — Commission Validation
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Confirms the commission validation error IS showing.
   * Call after fillCommission() with a value over 100.
   */
  async assertCommissionValidationError(): Promise<void> {
    await expect(
      this.commissionError,
      'Commission error should be visible for value over 100'
    ).toBeVisible();
    this.log('✅ Commission validation error shown');
  }

  /**
   * Confirms the commission validation error is NOT showing.
   * Call after fillCommission() with a value between 0 and 100.
   */
  async assertNoCommissionValidationError(): Promise<void> {
    await expect(
      this.commissionError,
      'Commission error should NOT be visible for value 0-100'
    ).toBeHidden();
    this.log('✅ No commission error');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ASSERTIONS — Character Counter
  //
  // HOW THE COUNTER WORKS:
  //   Maximum = 2000 characters
  //   Counter = how many characters REMAIN (counts DOWN, not up)
  //
  //   Empty field → 2000 remaining
  //   50 chars typed → 1950 remaining
  //   2000 chars typed → 0 remaining (at limit)
  //
  // WHY THESE METHODS EXIST:
  //   Instead of the test calculating 2000-50=1950 itself,
  //   the test just says "assertCounterAfterTyping(50)" and this method does the math.
  //   Cleaner test code, easier to understand.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Checks the counter shows 2000 (field is completely empty).
   * Call after clearBrokerNotes() to verify reset.
   */
  async assertCounterAtMaximum(): Promise<void> {
    const count = await this.getRemainingCharacterCount();
    expect(
      count,
      `Counter should show 2000 (empty field) but shows ${count}`
    ).toBe(2000);
    this.log('✅ Character counter at maximum: 2000');
  }

  /**
   * Checks the counter shows the correct remaining count after typing.
   *
   * FORMULA: remaining = 2000 - charsTyped
   * EXAMPLE: typed 50 chars → expects counter to show 1950
   *
   * @param charsTyped - How many characters were typed into the field
   */
  async assertCounterAfterTyping(charsTyped: number): Promise<void> {
    const expectedRemaining = 2000 - charsTyped;
    const actualRemaining   = await this.getRemainingCharacterCount();
    expect(
      actualRemaining,
      `Counter should show ${expectedRemaining} after typing ${charsTyped} chars, but shows ${actualRemaining}`
    ).toBe(expectedRemaining);
    this.log(`✅ Counter: ${actualRemaining} remaining after ${charsTyped} chars`);
  }

  /**
   * Checks the counter shows 0 (field is at the 2000 char maximum).
   * Call after fillBrokerNotes('X'.repeat(2000)).
   */
  async assertCounterAtZero(): Promise<void> {
    const count = await this.getRemainingCharacterCount();
    expect(
      count,
      `Counter should show 0 at maximum chars, but shows ${count}`
    ).toBe(0);
    this.log('✅ Character counter at zero (max reached)');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMBINED ASSERTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Verifies fields auto-populated by selecting a Wins Number.
   *
   * WHY a separate method from assertAutoPopulatedFromSubmission:
   *   When a Wins Number is selected, the app fills broker fields from the
   *   Underwriting Routing sheet — this data is DIFFERENT from (and overrides)
   *   what was stored at submission creation time.
   *
   * Usage:
   *   const entry = UnderwritingRouting.getByWinsNumber('WIN-2024-001');
   *   await brokerInfoPage.selectWinsNumber(entry.winsNumber);
   *   await brokerInfoPage.assertAutoPopulatedFromWinsNumber(entry.brokerInfo);
   *
   * @param data - brokerInfo from the matching UnderwritingRouting entry
   */
  async assertAutoPopulatedFromWinsNumber(data: WinsNumberBrokerInfo): Promise<void> {
    this.log('--- Verifying Broker Information auto-populated from Wins Number ---');

    await this.assertBrokerCompany(data.brokerCompany);

    if (data.email !== undefined)         await this.assertEmail(data.email);
    if (data.commission !== undefined)    await this.assertCommission(data.commission);
    if (data.streetAddress !== undefined) await this.assertStreetAddress(data.streetAddress);
    if (data.city !== undefined)          await this.assertCity(data.city);
    if (data.zip !== undefined)           await this.assertZip(data.zip);

    if (data.country !== undefined) {
      await this.assertCountry(data.country);
    } else {
      // Default: country should still be USA
      await this.assertDefaultCountry();
    }

    this.log('--- Broker Information (Wins Number auto-population) verified ✅ ---');
  }

  /**
   * Verifies all Broker Information fields were auto-populated from creation data.
   *
   * @param formData - submissionCtx.formData — the source of truth from creation.
   *                   NEVER re-generate this data. Always use what was stored at creation.
   */
  async assertAutoPopulatedFromSubmission(formData: SubmissionFormData): Promise<void> {
    this.log('--- Verifying Broker Information auto-population ---');

    await this.assertBrokerCompany(formData.broker.brokerCompany);
    await this.assertDefaultCountry();
    await this.assertStreetAddress(formData.broker.streetAddress);
    await this.assertCity(formData.broker.city);
    await this.assertState(formData.broker.state);
    await this.assertZip(formData.broker.zip);

    // WINS number is optional — only check if it was provided during creation.
    // Note: wins is now a dropdown selection, not a free-text value.
    // assertWinsNumber() reads the selected dropdown value.
    if (formData.broker.wins) {
      await this.assertWinsNumber(formData.broker.wins);
    }

    this.log('--- Broker Information verified ✅ ---');
  }
}
