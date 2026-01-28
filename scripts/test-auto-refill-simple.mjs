/**
 * Simple auto-refill test using direct imports
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', 'db', 'data.db');

const db = new Database(dbPath);

console.log('\n🚀 Auto-Refill Generation Test\n');
console.log('=' .repeat(60));

async function runTests() {
  try {
    // 1. Setup: Create test customer
    console.log('\n📦 Setting up test data...\n');

    const customer = db.prepare(`
      INSERT INTO customers (name, email, phone, credit_limit, is_active)
      VALUES ('TEST-Auto-Refill Customer', 'test@refill.com', '+998901234567', 0, 1)
      RETURNING *
    `).get();

    console.log(`✅ Created customer: ${customer.name} (ID: ${customer.id})`);

    // Get category and UOM
    const category = db.prepare('SELECT * FROM categories WHERE name = ? LIMIT 1').get('Готовая продукция');
    const uom = db.prepare('SELECT * FROM uoms WHERE code = ? LIMIT 1').get('pcs');

    // 2. Create test items
    const item1 = db.prepare(`
      INSERT INTO items (name, sku, category_id, base_uom_id, standard_cost, sales_price, quantity_on_hand, average_cost, asset_account_code, income_account_code, expense_account_code)
      VALUES ('TEST-Toner BLK', 'TEST-TONER-BLK', ?, ?, 150000, 250000, 100, 150000, '1310', '4000', '5000')
      RETURNING *
    `).get(category.id, uom.id);

    const item2 = db.prepare(`
      INSERT INTO items (name, sku, category_id, base_uom_id, standard_cost, sales_price, quantity_on_hand, average_cost, asset_account_code, income_account_code, expense_account_code)
      VALUES ('TEST-Paper A4', 'TEST-PAPER-A4', ?, ?, 50000, 80000, 200, 50000, '1310', '4000', '5000')
      RETURNING *
    `).get(category.id, uom.id);

    console.log(`✅ Created items: ${item1.name}, ${item2.name}`);

    // 3. Create service contract with yesterday's billing date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    const contract = db.prepare(`
      INSERT INTO service_contracts (
        contract_number, customer_id, contract_type, start_date, end_date,
        billing_frequency_months, next_billing_date, auto_generate_refills,
        monthly_value, status
      )
      VALUES ('TEST-CONTRACT-001', ?, 'SUPPLIES_ONLY', ?, ?, 1, ?, 1, 500000, 'ACTIVE')
      RETURNING *
    `).get(customer.id, yesterday.getTime(), endDate.getTime(), yesterday.getTime());

    console.log(`✅ Created contract: ${contract.contract_number} with next_billing_date = ${new Date(contract.next_billing_date).toISOString()}`);

    // 4. Add refill items to contract
    db.prepare(`
      INSERT INTO contract_refill_items (contract_id, item_id, quantity_per_cycle, contract_unit_price)
      VALUES (?, ?, 2, 250000)
    `).run(contract.id, item1.id);

    db.prepare(`
      INSERT INTO contract_refill_items (contract_id, item_id, quantity_per_cycle, contract_unit_price)
      VALUES (?, ?, 5, 80000)
    `).run(contract.id, item2.id);

    console.log(`✅ Added 2 refill items to contract`);

    console.log('\n=== SCENARIO 1: Test Auto-Refill Generation ===\n');

    // 5. Find due contracts (simulating the generateRecurringRefills logic)
    const currentDate = new Date();
    const dueContracts = db.prepare(`
      SELECT * FROM service_contracts
      WHERE status = 'ACTIVE'
        AND auto_generate_refills = 1
        AND next_billing_date <= ?
    `).all(currentDate.getTime());

    console.log(`   Found ${dueContracts.length} due contract(s)`);

    if (dueContracts.length === 0) {
      throw new Error('❌ No due contracts found! Contract should be due.');
    }

    // 6. Test invoice number generation pattern
    const year = new Date().getFullYear();
    const existingRefills = db.prepare(`
      SELECT invoice_number FROM invoices
      WHERE invoice_number LIKE 'SO-REFILL-${year}-%'
      ORDER BY invoice_number DESC
      LIMIT 1
    `).get();

    let sequence = 1;
    if (existingRefills) {
      const match = existingRefills.invoice_number.match(/SO-REFILL-\\d{4}-(\\d{5})/);
      if (match) {
        sequence = parseInt(match[1]) + 1;
      }
    }

    const invoiceNumber = `SO-REFILL-${year}-${String(sequence).padStart(5, '0')}`;
    console.log(`   Generated invoice number: ${invoiceNumber}`);

    // 7. Manually call the server action
    console.log('\n   Calling generateRecurringRefills()...');

    // Import and call the actual function
    const { generateRecurringRefills } = await import('../src/app/actions/service.js');
    const result = await generateRecurringRefills(true);

    console.log(`   Result:`, JSON.stringify(result.results, null, 2));

    // 8. Verify invoice created
    const invoices = db.prepare(`
      SELECT * FROM invoices
      WHERE customer_id = ?
        AND invoice_number LIKE 'SO-REFILL-%'
      ORDER BY created_at DESC
      LIMIT 1
    `).get(customer.id);

    if (!invoices) {
      throw new Error('❌ No refill invoice created!');
    }

    console.log(`\n✅ Invoice created: ${invoices.invoice_number}`);
    console.log(`   Total Amount: ${invoices.total_amount} Tiyin (${invoices.total_amount / 100} UZS)`);

    // 9. Verify invoice lines
    const lines = db.prepare(`
      SELECT il.*, i.name as item_name
      FROM invoice_lines il
      JOIN items i ON il.item_id = i.id
      WHERE il.invoice_id = ?
    `).all(invoices.id);

    console.log(`\n✅ Invoice has ${lines.length} line(s):`);
    lines.forEach(line => {
      console.log(`   - ${line.item_name}: ${line.quantity} x ${line.rate} = ${line.amount} Tiyin`);
    });

    if (lines.length !== 2) {
      throw new Error(`❌ Expected 2 lines, found ${lines.length}`);
    }

    // 10. Verify GL entries
    const je = db.prepare(`
      SELECT * FROM journal_entries
      WHERE reference = ?
    `).get(invoices.invoice_number);

    if (!je) {
      throw new Error('❌ No journal entry created!');
    }

    const jeLines = db.prepare(`
      SELECT * FROM journal_entry_lines
      WHERE journal_entry_id = ?
    `).all(je.id);

    console.log(`\n✅ Journal entry created with ${jeLines.length} line(s):`);
    jeLines.forEach(line => {
      console.log(`   - Account ${line.account_code}: Debit ${line.debit}, Credit ${line.credit}`);
    });

    const arDebit = jeLines.find(l => l.account_code === '1200');
    const revenueCredit = jeLines.find(l => l.account_code === '4000');

    if (!arDebit || !revenueCredit) {
      throw new Error('❌ Missing AR debit or Revenue credit entry!');
    }

    if (arDebit.debit !== revenueCredit.credit) {
      throw new Error(`❌ GL entries not balanced! AR Debit: ${arDebit.debit}, Revenue Credit: ${revenueCredit.credit}`);
    }

    console.log(`   ✅ GL entries balanced: ${arDebit.debit} = ${revenueCredit.credit}`);

    // 11. Verify next_billing_date updated
    const updatedContract = db.prepare('SELECT * FROM service_contracts WHERE id = ?').get(contract.id);
    const expectedNextBilling = new Date(yesterday);
    expectedNextBilling.setMonth(expectedNextBilling.getMonth() + 1);

    console.log(`\n✅ Next billing date advanced:`);
    console.log(`   Original: ${new Date(contract.next_billing_date).toISOString()}`);
    console.log(`   Updated:  ${new Date(updatedContract.next_billing_date).toISOString()}`);
    console.log(`   Expected: ${expectedNextBilling.toISOString()}`);

    if (updatedContract.next_billing_date < expectedNextBilling.getTime()) {
      throw new Error('❌ Next billing date not updated correctly!');
    }

    console.log('\n=== SCENARIO 2: Test Idempotency ===\n');

    // Run again - should process 0 contracts
    const result2 = await generateRecurringRefills(true);
    console.log(`   Second run processed ${result2.results.total} contract(s)`);

    if (result2.results.total !== 0) {
      throw new Error(`❌ Idempotency failed! Expected 0, got ${result2.results.total}`);
    }

    console.log(`   ✅ Idempotency verified`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60) + '\n');

    // Cleanup
    console.log('🧹 Cleaning up test data...');
    db.prepare('DELETE FROM invoice_lines WHERE invoice_id = ?').run(invoices.id);
    db.prepare('DELETE FROM invoices WHERE id = ?').run(invoices.id);
    db.prepare('DELETE FROM journal_entry_lines WHERE journal_entry_id = ?').run(je.id);
    db.prepare('DELETE FROM journal_entries WHERE id = ?').run(je.id);
    db.prepare('DELETE FROM contract_refill_items WHERE contract_id = ?').run(contract.id);
    db.prepare('DELETE FROM service_contracts WHERE id = ?').run(contract.id);
    db.prepare('DELETE FROM items WHERE id IN (?, ?)').run(item1.id, item2.id);
    db.prepare('DELETE FROM customers WHERE id = ?').run(customer.id);
    console.log('✅ Cleanup complete\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

runTests();
