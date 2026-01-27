import { db } from '../db';
import { invoices, invoiceLines } from '../db/schema/sales';
import { businessSettings } from '../db/schema/business';

async function testPdfSetup() {
  console.log('=== Testing PDF Generation Setup ===\n');

  // 1. Check business settings
  console.log('1. Checking business settings...');
  const businessConfig = await db.select().from(businessSettings).limit(1);
  const companyInfo = businessConfig[0];

  if (!companyInfo) {
    console.error('❌ Business settings not found!');
    return;
  }

  console.log('✅ Business settings found:');
  console.log('   Company Name:', companyInfo.companyName);
  console.log('   Company Name (Local):', companyInfo.companyNameLocal);
  console.log('   Tax ID:', companyInfo.taxId);
  console.log('   Bank Account:', companyInfo.bankAccount);
  console.log('   Bank MFO:', companyInfo.bankMfo);
  console.log('   Director:', companyInfo.directorName);
  console.log('   Accountant:', companyInfo.accountantName);
  console.log('');

  // 2. Create a test invoice
  console.log('2. Creating test invoice...');

  const testInvoice = await db.insert(invoices).values({
    customerId: 2, // Customer 1
    invoiceNumber: 'TEST-PDF-001',
    date: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    subtotal: 500000, // 5000 UZS in tiyin
    totalAmount: 500000,
    balanceRemaining: 500000, // Full amount unpaid
    status: 'unpaid',
  }).returning();

  console.log('✅ Test invoice created:', testInvoice[0].id);
  console.log('');

  // 3. Add invoice line
  console.log('3. Adding invoice line...');
  await db.insert(invoiceLines).values({
    invoiceId: testInvoice[0].id,
    itemId: 3, // Apple Chips
    description: 'Test product for PDF generation',
    quantity: 10,
    rate: 50000, // 500 UZS per unit in tiyin
    amount: 500000, // 5000 UZS total in tiyin
  });

  console.log('✅ Invoice line added');
  console.log('');

  console.log('=== Setup Complete ===');
  console.log('Invoice ID:', testInvoice[0].id);
  console.log('Invoice Number:', testInvoice[0].invoiceNumber);
  console.log('');
  console.log('To test PDF generation:');
  console.log('1. Start the dev server: npm run dev');
  console.log('2. Login as ADMIN or ACCOUNTANT user');
  console.log('3. Navigate to Sales → Customers → Customer 1');
  console.log('4. Find invoice TEST-PDF-001 in the transaction history');
  console.log('5. Click the "Download PDF" button');
  console.log('');
  console.log('Expected results:');
  console.log('✓ PDF header shows:', companyInfo.companyNameLocal || companyInfo.companyName);
  console.log('✓ PDF shows tax ID:', companyInfo.taxId);
  console.log('✓ PDF shows bank account:', companyInfo.bankAccount);
  console.log('✓ PDF shows bank MFO:', companyInfo.bankMfo);
  console.log('✓ PDF shows director name:', companyInfo.directorName);
  console.log('✓ PDF shows accountant name:', companyInfo.accountantName);

  process.exit(0);
}

testPdfSetup().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
