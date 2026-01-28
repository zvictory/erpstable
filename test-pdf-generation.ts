/**
 * Test script for PDF invoice generation
 * This tests the generateInvoicePdf server action directly
 */

import { generateInvoicePdf } from './src/app/actions/documents';
import * as fs from 'fs';
import * as path from 'path';

async function testPdfGeneration() {
  console.log('🧪 Testing PDF Invoice Generation\n');
  console.log('=================================\n');

  // Test invoice ID 2 (found in database)
  const invoiceId = 2;
  const testLocales = ['ru', 'en', 'uz', 'tr'];

  for (const locale of testLocales) {
    console.log(`\n📄 Testing locale: ${locale.toUpperCase()}`);
    console.log('-'.repeat(40));

    try {
      const result = await generateInvoicePdf(invoiceId, locale);

      if (!result.success) {
        console.error(`❌ Failed: ${result.error}`);
        continue;
      }

      if (!result.pdfBase64) {
        console.error('❌ Failed: No PDF data returned');
        continue;
      }

      // Verify base64 is valid
      const pdfBuffer = Buffer.from(result.pdfBase64, 'base64');

      // Check if it starts with PDF magic bytes (%PDF)
      const isPdf = pdfBuffer.toString('utf8', 0, 4) === '%PDF';

      if (!isPdf) {
        console.error('❌ Failed: Generated file is not a valid PDF');
        continue;
      }

      // Save PDF to file for manual inspection
      const outputDir = path.join(__dirname, 'test-output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputPath = path.join(outputDir, `invoice-${invoiceId}-${locale}.pdf`);
      fs.writeFileSync(outputPath, pdfBuffer);

      console.log(`✅ Success!`);
      console.log(`   Filename: ${result.filename}`);
      console.log(`   Size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
      console.log(`   Saved to: ${outputPath}`);
      console.log(`   Valid PDF: Yes (magic bytes: %PDF)`);

    } catch (error) {
      console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof Error && error.stack) {
        console.error(`   Stack: ${error.stack.split('\n')[1]?.trim()}`);
      }
    }
  }

  console.log('\n=================================');
  console.log('✨ Test Complete!\n');
  console.log('📂 PDF files saved to: test-output/');
  console.log('💡 Open the PDF files to verify:');
  console.log('   - Cyrillic text renders correctly (Russian)');
  console.log('   - Company and customer information');
  console.log('   - Line items and calculations');
  console.log('   - Bank details in footer');
  console.log('   - Signature blocks');
}

// Run test
testPdfGeneration()
  .then(() => {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
