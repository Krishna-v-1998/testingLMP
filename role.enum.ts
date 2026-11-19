
import { test, expect } from '@playwright/test';

import { MockPdfValidator } from '../utils/MockPdfValidator';
import { PdfComparisonReporter } from '../utils/PdfComparisonReporter';

test('Validate generated PDF preview', async ({}, testInfo) => {

  const input = {
    templatePdfPath:
      'test-data/mock-pdfs/template/BR-001.pdf',

    previewPdfPath:
      'test-data/mock-pdfs/preview/BR-001.pdf',

    values: {
      'Named Insured': 'Acme Construction LLC',
      'Policy Number': 'BR-2025-001234',
      'Policy Type': 'Inland Marine',
    },

    requiredStatements: [
      'direct physical loss or damage to covered property',
    ],
  };

  // 1. Validate template and preview PDFs
  const validationResult =
    await MockPdfValidator.comparePdfs(input);

  // 2. Generate comparison report
  const report = await PdfComparisonReporter.generate({
    templatePath: input.templatePdfPath,
    previewPath: input.previewPdfPath,

    expectedText: validationResult.renderedText,
    actualText: validationResult.previewText,

    expectedFields: input.values,

    validationResult,

    testName: testInfo.title,
    outputPath: testInfo.outputPath('pdf-comparison'),
  });

  // 3. Attach HTML report
  await testInfo.attach('PDF Comparison Report', {
    path: report.htmlPath,
    contentType: 'text/html',
  });

  // 4. Attach JSON comparison results
  await testInfo.attach('PDF Comparison Results', {
    path: report.jsonPath,
    contentType: 'application/json',
  });

  // 5. Attach original PDFs
  await testInfo.attach('Client Template PDF', {
    path: input.templatePdfPath,
    contentType: 'application/pdf',
  });

  await testInfo.attach('Preview PDF', {
    path: input.previewPdfPath,
    contentType: 'application/pdf',
  });

  // 6. Print validation summary
  MockPdfValidator.printReport(validationResult);

  // 7. Assert both validation and detailed comparison
  expect(
    report.summary.overallPassed,
    'PDF validation or detailed comparison failed. Check the PDF Comparison Report.'
  ).toBe(true);
});
