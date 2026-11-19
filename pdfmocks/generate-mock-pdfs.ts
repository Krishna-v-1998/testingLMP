/**
 * generate-mock-pdfs.ts
 *
 * Generates two PDF files per form:
 *
 *   test-data/mock-pdfs/template/<FormNumber>.pdf
 *     → Client template PDF — text contains {{Variable}} placeholders,
 *       mirroring exactly what the client provides.
 *
 *   test-data/mock-pdfs/preview/<FormNumber>.pdf
 *     → Preview PDF — same layout but placeholders replaced with real values,
 *       mirroring what the app shows when the Eye icon is clicked.
 *
 * Run once (or whenever templates change):
 *
 *   npx ts-node scripts/generate-mock-pdfs.ts
 *   npx tsx scripts/generate-mock-pdfs.ts
 *
 * Dependency:
 *   npm install --save-dev pdfkit @types/pdfkit
 */

import * as fs   from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { BR_SAMPLE_VALUES } from '../test-data/mock-pdf-values';

// ── Directories ───────────────────────────────────────────────────────────────

const TEMPLATE_DIR = path.resolve(__dirname, '../test-data/mock-pdfs/template');
const PREVIEW_DIR  = path.resolve(__dirname, '../test-data/mock-pdfs/preview');

[TEMPLATE_DIR, PREVIEW_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

// ── Form content definitions ─────────────────────────────────────────────────
// Each entry defines the text content for one form.
// Lines are written as-is into the template PDF; the preview PDF substitutes
// {{Variable}} with the corresponding sample value.

interface FormContent {
  formNumber: string;
  title:      string;
  edition:    string;
  sections:   Array<{ heading?: string; lines: string[] }>;
}

const FORMS: FormContent[] = [
  // ── BR-001: Main Builders Risk Coverage Form ────────────────────────────────
  {
    formNumber: 'BR-001',
    title:      'BUILDERS RISK COVERAGE FORM',
    edition:    'Form BR-001 (Ed. 01/2024)',
    sections: [
      {
        heading: 'DECLARATIONS',
        lines: [
          'Named Insured:    {{Named Insured}}',
          'Policy Number:    {{Policy Number}}',
          'Effective Date:   {{Effective Date}}',
          'Expiration Date:  {{Expiration Date}}',
          '',
          'Coverage Location:',
          '  {{Location Address}}',
          '  {{City}}, {{State}} {{Zip Code}}',
        ],
      },
      {
        heading: 'COVERAGE SUMMARY',
        lines: [
          'Building Value (Hard Costs):    ${{Building Value}}',
          'Contents / Soft Costs:          ${{Contents Value}}',
          'Total Insured Value:            ${{Total Insured Value}}',
          'Per-Occurrence Deductible:      ${{Deductible}}',
          'Sprinklered Premises:           {{Sprinklered}}',
        ],
      },
      {
        heading: 'COVERAGE AGREEMENT',
        lines: [
          'In consideration of the premium paid by {{Named Insured}}, and subject to all',
          'terms and conditions of this policy, the insurer agrees to provide Builders Risk',
          'coverage as described herein.',
          '',
          'This policy covers direct physical loss or damage to covered property arising',
          'during the course of construction at the premises located at {{Location Address}},',
          '{{City}}, {{State}} {{Zip Code}}.',
          '',
          'Coverage under this policy is effective from {{Effective Date}} and shall remain',
          'in force through {{Expiration Date}}, unless cancelled or terminated earlier.',
          '',
          'The maximum limit of insurance payable shall not exceed ${{Total Insured Value}}',
          'for any one occurrence.',
        ],
      },
      {
        heading: 'DEDUCTIBLE PROVISION',
        lines: [
          'The insured, {{Named Insured}}, shall bear the first ${{Deductible}} of each',
          'and every loss before this policy becomes applicable.',
        ],
      },
      {
        heading: 'TERRORISM COVERAGE',
        lines: [
          'Terrorism Coverage Elected:  {{Terrorism Coverage}}',
          'TRIA Surcharge Percentage:   {{TRIA Percentage}}%',
          'Terrorism Premium:           ${{Terrorism Premium}}',
          '',
          'Pursuant to the Terrorism Risk Insurance Act, {{Named Insured}} has been offered',
          'and has elected to {{Terrorism Coverage}} certified acts of terrorism coverage.',
        ],
      },
      {
        heading: 'PREMIUM SUMMARY',
        lines: [
          'Base Premium:              ${{Base Premium}}',
          'Terrorism Surcharge:       ${{Terrorism Premium}}',
          'Annual Policy Premium:     ${{Annual Premium}}',
        ],
      },
      {
        heading: 'PRODUCER INFORMATION',
        lines: [
          'Producer Name:   {{Producer Name}}',
          'Commission Rate: {{Commission Rate}}%',
          '',
          'This policy is issued on behalf of {{Named Insured}}.',
        ],
      },
      {
        lines: ['ALL OTHER TERMS AND CONDITIONS OF THIS POLICY REMAIN UNCHANGED.'],
      },
    ],
  },

  // ── BR-END-TER-001: Terrorism Risk Insurance Act Endorsement ────────────────
  {
    formNumber: 'BR-END-TER-001',
    title:      'TERRORISM RISK INSURANCE ACT ENDORSEMENT',
    edition:    'Form BR-END-TER-001 (Ed. 01/2024)',
    sections: [
      {
        lines: [
          'This endorsement modifies insurance provided under:',
          '  BUILDERS RISK COVERAGE FORM (BR-001)',
        ],
      },
      {
        heading: 'SCHEDULE',
        lines: [
          'Named Insured:              {{Named Insured}}',
          'Policy Number:              {{Policy Number}}',
          'Endorsement Effective Date: {{Effective Date}}',
        ],
      },
      {
        heading: 'DISCLOSURE NOTICE — TERRORISM RISK INSURANCE ACT',
        lines: [
          'You are hereby notified that under the Terrorism Risk Insurance Act, as amended,',
          'the definition of act of terrorism has changed. As defined in Section 102(1) of',
          'the Act, the term "act of terrorism" means any act that is certified by the',
          'Secretary of the Treasury.',
        ],
      },
      {
        heading: 'ELECTION OF TERRORISM COVERAGE',
        lines: [
          '{{Named Insured}} has been offered and has elected the following:',
          '',
          'Terrorism Coverage:         {{Terrorism Coverage}}',
          'TRIA Surcharge Percentage:  {{TRIA Percentage}}%',
          'Terrorism Premium:          ${{Terrorism Premium}}',
        ],
      },
      {
        lines: [
          'This endorsement is attached to and forms a part of Policy Number {{Policy Number}}',
          'issued to {{Named Insured}}, effective {{Effective Date}}.',
          '',
          'ALL OTHER TERMS AND CONDITIONS OF THIS POLICY REMAIN UNCHANGED.',
        ],
      },
    ],
  },

  // ── BR-END-SPR-002: Sprinkler Leakage Endorsement ───────────────────────────
  {
    formNumber: 'BR-END-SPR-002',
    title:      'SPRINKLER LEAKAGE ENDORSEMENT',
    edition:    'Form BR-END-SPR-002 (Ed. 01/2024)',
    sections: [
      {
        lines: [
          'This endorsement modifies insurance provided under:',
          '  BUILDERS RISK COVERAGE FORM (BR-001)',
        ],
      },
      {
        heading: 'SCHEDULE',
        lines: [
          'Named Insured:  {{Named Insured}}',
          'Policy Number:  {{Policy Number}}',
          'Effective Date: {{Effective Date}}',
          '',
          'Coverage Location:',
          '  {{Location Address}}',
          '  {{City}}, {{State}} {{Zip Code}}',
          '',
          'Sprinklered Premises:  {{Sprinklered}}',
        ],
      },
      {
        heading: 'SPRINKLER LEAKAGE COVERAGE',
        lines: [
          'This policy is extended to cover direct physical loss or damage to covered',
          'property caused by or resulting from leakage or discharge from an automatic',
          'sprinkler system installed at {{Location Address}}.',
          '',
          'Coverage applies only where the insured premises have been confirmed as:',
          'Sprinklered — {{Sprinklered}}.',
        ],
      },
      {
        heading: 'SPECIAL CONDITIONS',
        lines: [
          '1. The insured, {{Named Insured}}, agrees to maintain all sprinkler systems',
          '   in proper working order throughout the policy period {{Effective Date}}',
          '   through {{Expiration Date}}.',
          '',
          '2. The deductible applicable to sprinkler leakage losses shall be ${{Deductible}}.',
        ],
      },
      {
        lines: [
          'This endorsement is attached to and forms a part of Policy Number {{Policy Number}}',
          'issued to {{Named Insured}}, effective {{Effective Date}}.',
          '',
          'ALL OTHER TERMS AND CONDITIONS OF THIS POLICY REMAIN UNCHANGED.',
        ],
      },
    ],
  },
];

// ── Variable substitution ────────────────────────────────────────────────────

function substitute(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{\s*(.+?)\s*\}\}/g, (_, varName: string) => {
    const key   = varName.trim().toLowerCase();
    const match = Object.entries(values).find(([k]) => k.toLowerCase() === key);
    return match ? match[1] : `{{${varName}}}`;
  });
}

// ── PDF builder ───────────────────────────────────────────────────────────────

async function buildPdf(
  outputPath: string,
  form:       FormContent,
  values:     Record<string, string> | null,  // null = keep {{variables}} as-is
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc  = new PDFDocument({ margin: 50, size: 'LETTER' });
    const out  = fs.createWriteStream(outputPath);

    out.on('error', reject);
    doc.on('error', reject);
    doc.pipe(out);

    const render = (text: string) => values ? substitute(text, values) : text;

    // ── Header ──────────────────────────────────────────────────────────────
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(form.title, { align: 'center' });

    doc
      .fontSize(9)
      .font('Helvetica')
      .text(form.edition, { align: 'center' });

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
    doc.moveDown(0.5);

    // ── Sections ─────────────────────────────────────────────────────────────
    for (const section of form.sections) {
      if (section.heading) {
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(render(section.heading));
        doc.moveTo(50, doc.y).lineTo(560, doc.y).strokeColor('#cccccc').stroke();
        doc.strokeColor('black');
        doc.moveDown(0.3);
      }

      for (const line of section.lines) {
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(render(line), { lineGap: 1 });
      }

      doc.moveDown(0.7);
    }

    doc.end();
    out.on('finish', resolve);
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('Generating mock PDFs...\n');

  for (const form of FORMS) {
    const templatePath = path.join(TEMPLATE_DIR, `${form.formNumber}.pdf`);
    const previewPath  = path.join(PREVIEW_DIR,  `${form.formNumber}.pdf`);

    // Template PDF — keep {{variables}} as literal text
    await buildPdf(templatePath, form, null);
    console.log(`  ✓ template/${form.formNumber}.pdf`);

    // Preview PDF — substitute variables with sample values
    await buildPdf(previewPath, form, BR_SAMPLE_VALUES);
    console.log(`  ✓ preview/${form.formNumber}.pdf`);
  }

  console.log('\nDone. Files written to test-data/mock-pdfs/');
}

main().catch(err => { console.error(err); process.exit(1); });
