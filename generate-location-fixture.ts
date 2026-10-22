/**
 * generate-location-fixture.ts
 *
 * One-shot script to create the upload fixture file.
 *
 * RUN:
 *   npx ts-node src/data/fixtures/generate-location-fixture.ts
 *
 * Or as a Playwright globalSetup (playwright.config.ts):
 *   export default { globalSetup: './src/data/fixtures/generate-location-fixture.ts' }
 *
 * The file is created at:
 *   src/data/fixtures/location-upload-fixture.xlsx
 */

import path                    from 'path';
import { LocationFixtureBuilder } from './LocationFixtureBuilder';

const OUTPUT = path.resolve(__dirname, 'location-upload-fixture.xlsx');

async function main(): Promise<void> {
  await LocationFixtureBuilder.generate(OUTPUT);
}

main().catch(err => {
  console.error('[generate-location-fixture] Failed:', err);
  process.exit(1);
});

// Also export as default so Playwright can use it as globalSetup
export default main;
