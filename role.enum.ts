test('BR-001: full comparison passes with all sample values', async ({}, testInfo) => {
  const input = {
    templatePdfPath: tpl('BR-001.pdf'),
    previewPdfPath: prev('BR-001.pdf'),
    values: BR_SAMPLE_VALUES,
    requiredStatements: [
      'direct physical loss or damage to covered property',
      'Terrorism Risk Insurance Act',
      'ALL OTHER TERMS AND CONDITIONS OF THIS POLICY REMAIN UNCHANGED',
    ],
  };

  // Step 1: Perform PDF validation
  const result = await MockPdfValidator.comparePdfs(input);

  MockPdfValidator.printReport(result);

  // Step 2: Generate detailed HTML and JSON comparison reports
  const report = await PdfComparisonReporter.generate({
    templatePath: input.templatePdfPath,
    previewPath: input.previewPdfPath,
    expectedText: result.renderedText,
    actualText: result.previewText,
    expectedFields: input.values,
    validationResult: result,
    testName: testInfo.title,
    outputPath: testInfo.outputPath('pdf-comparison'),
  });

  // Step 3: Attach reports to Playwright execution
  await testInfo.attach('PDF Comparison Report', {
    path: report.htmlPath,
    contentType: 'text/html',
  });

  await testInfo.attach('PDF Comparison Results', {
    path: report.jsonPath,
    contentType: 'application/json',
  });

  // Step 4: Attach source PDFs
  await testInfo.attach('Client Template PDF', {
    path: input.templatePdfPath,
    contentType: 'application/pdf',
  });

  await testInfo.attach('Preview PDF', {
    path: input.previewPdfPath,
    contentType: 'application/pdf',
  });

  // Step 5: Assertions
  expect(result.passed, result.summary).toBe(true);
  expect(result.unresolvedVars).toHaveLength(0);
  expect(result.failures).toHaveLength(0);
  expect(report.summary.overallPassed).toBe(true);
});
