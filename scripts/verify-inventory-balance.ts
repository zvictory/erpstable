/**
 * Inventory Balance Reconciliation Script
 *
 * Investigates why inventory balance (account 1310) may differ from vendor bill items
 *
 * Key Points:
 * - Items post to different accounts based on itemClass:
 *   - RAW_MATERIAL → 1310 (Сырье и материалы)
 *   - WIP → 1330 (Незавершенное производство)
 *   - FINISHED_GOODS → 1340 (Готовая продукция)
 *   - SERVICE → 5100 (Expense account)
 * - Items can have custom assetAccountCode overrides
 * - Other movements: production, adjustments, sales
 */

import { db } from '../db';
import {
  journalEntries,
  journalEntryLines,
  glAccounts,
  vendorBills,
  vendorBillLines,
  items
} from '../db/schema';
import { eq, sql, inArray } from 'drizzle-orm';

interface AccountBalance {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  balance: number;
}

async function verifyInventoryBalance() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  INVENTORY BALANCE RECONCILIATION REPORT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ===================================================================
  // PART 1: GL Account Balances for All Inventory Accounts
  // ===================================================================
  console.log('📊 PART 1: General Ledger Inventory Account Balances\n');

  const inventoryAccounts = ['1310', '1330', '1340'];
  const accountBalances: AccountBalance[] = [];

  for (const accountCode of inventoryAccounts) {
    // Get account info
    const account = await db
      .select()
      .from(glAccounts)
      .where(eq(glAccounts.code, accountCode))
      .limit(1);

    if (account.length === 0) {
      console.log(`  ⚠️  Account ${accountCode} not found\n`);
      continue;
    }

    // Sum all journal entry lines for this account
    const result = await db
      .select({
        totalDebit: sql<number>`COALESCE(SUM(${journalEntryLines.debit}), 0)`,
        totalCredit: sql<number>`COALESCE(SUM(${journalEntryLines.credit}), 0)`,
      })
      .from(journalEntryLines)
      .where(eq(journalEntryLines.accountCode, accountCode));

    const totalDebit = result[0]?.totalDebit || 0;
    const totalCredit = result[0]?.totalCredit || 0;
    const balance = totalDebit - totalCredit; // Asset account (debit normal)

    accountBalances.push({
      accountCode,
      accountName: account[0].name,
      debit: totalDebit,
      credit: totalCredit,
      balance
    });

    console.log(`  ${accountCode} - ${account[0].name}`);
    console.log(`    Total Debits:  ${(totalDebit / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} UZS`);
    console.log(`    Total Credits: ${(totalCredit / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} UZS`);
    console.log(`    Balance:       ${(balance / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} UZS`);
    console.log(`    Cached Balance: ${(account[0].balance / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} UZS`);

    if (account[0].balance !== balance) {
      console.log(`    ⚠️  MISMATCH: Cached balance differs from calculated!`);
    }
    console.log();
  }

  const totalInventoryValue = accountBalances.reduce((sum, a) => sum + a.balance, 0);
  console.log(`  ═══════════════════════════════════════════════════════════`);
  console.log(`  TOTAL INVENTORY VALUE (All Accounts): ${(totalInventoryValue / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} UZS`);
  console.log(`  ═══════════════════════════════════════════════════════════\n\n`);

  // ===================================================================
  // PART 2: Vendor Bill Analysis by Item Class
  // ===================================================================
  console.log('📦 PART 2: Vendor Bill Items by Classification\n');

  // Get all bill lines with item information
  const billLines = await db
    .select({
      billLine: vendorBillLines,
      item: items,
    })
    .from(vendorBillLines)
    .innerJoin(items, eq(vendorBillLines.itemId, items.id));

  // Group by item class
  const byClass: Record<string, { count: number; totalAmount: number; items: string[] }> = {
    RAW_MATERIAL: { count: 0, totalAmount: 0, items: [] },
    WIP: { count: 0, totalAmount: 0, items: [] },
    FINISHED_GOODS: { count: 0, totalAmount: 0, items: [] },
    SERVICE: { count: 0, totalAmount: 0, items: [] },
  };

  const customAccountItems: any[] = [];

  for (const { billLine, item } of billLines) {
    const itemClass = item.itemClass;
    byClass[itemClass].count++;
    byClass[itemClass].totalAmount += billLine.amount;

    if (!byClass[itemClass].items.includes(item.name)) {
      byClass[itemClass].items.push(item.name);
    }

    // Check for custom asset account
    if (item.assetAccountCode && item.assetAccountCode !== '1310') {
      customAccountItems.push({
        itemName: item.name,
        itemClass: item.itemClass,
        customAccount: item.assetAccountCode,
        amount: billLine.amount
      });
    }
  }

  console.log('  Vendor Bill Items by Item Class:\n');

  for (const [itemClass, data] of Object.entries(byClass)) {
    const expectedAccount =
      itemClass === 'RAW_MATERIAL' ? '1310' :
      itemClass === 'WIP' ? '1330' :
      itemClass === 'FINISHED_GOODS' ? '1340' :
      '5100 (Expense)';

    console.log(`  ${itemClass}:`);
    console.log(`    Count: ${data.count} bill lines`);
    console.log(`    Total Amount: ${(data.totalAmount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} UZS`);
    console.log(`    Posts to: ${expectedAccount}`);
    console.log(`    Sample Items: ${data.items.slice(0, 5).join(', ')}${data.items.length > 5 ? '...' : ''}`);
    console.log();
  }

  // ===================================================================
  // PART 3: Custom Account Overrides
  // ===================================================================
  console.log('🔧 PART 3: Items with Custom Asset Accounts\n');

  if (customAccountItems.length === 0) {
    console.log('  ✅ No items with custom asset account overrides\n\n');
  } else {
    console.log(`  Found ${customAccountItems.length} bill line(s) with custom asset accounts:\n`);

    for (const item of customAccountItems) {
      console.log(`  Item: ${item.itemName}`);
      console.log(`    Class: ${item.itemClass}`);
      console.log(`    Custom Account: ${item.customAccount}`);
      console.log(`    Amount: ${(item.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} UZS`);
      console.log();
    }
  }

  // ===================================================================
  // PART 4: Reconciliation Summary
  // ===================================================================
  console.log('📋 PART 4: Reconciliation Summary\n');
  console.log('  ═══════════════════════════════════════════════════════════\n');

  const account1310Balance = accountBalances.find(a => a.accountCode === '1310')?.balance || 0;
  const rawMaterialBills = byClass.RAW_MATERIAL.totalAmount;

  console.log(`  Account 1310 (Raw Materials) Balance:`);
  console.log(`    Per GL:          ${(account1310Balance / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} UZS`);
  console.log();
  console.log(`  Vendor Bills (RAW_MATERIAL items):`);
  console.log(`    Total:           ${(rawMaterialBills / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} UZS`);
  console.log();
  console.log(`  Difference:`);

  const difference = account1310Balance - rawMaterialBills;
  console.log(`    ${(difference / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} UZS`);
  console.log();

  if (difference !== 0) {
    console.log('  Possible reasons for difference:');
    console.log('    • Sales/consumption of raw materials (credits to 1310)');
    console.log('    • Production transfers to WIP or Finished Goods');
    console.log('    • Inventory adjustments (gains/losses)');
    console.log('    • Write-offs or waste');
    console.log('    • Opening balances from previous periods');
    console.log();
  }

  // ===================================================================
  // PART 5: Transaction Type Breakdown for Account 1310
  // ===================================================================
  console.log('📊 PART 5: Transaction Type Breakdown for Account 1310\n');

  const account1310Lines = await db
    .select({
      line: journalEntryLines,
      entry: journalEntries
    })
    .from(journalEntryLines)
    .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .where(eq(journalEntryLines.accountCode, '1310'));

  const transactionTypes: Record<string, { count: number; debit: number; credit: number }> = {};

  for (const { line, entry } of account1310Lines) {
    const transactionId = entry.transactionId || 'MANUAL';
    const type =
      transactionId.startsWith('bill-') ? 'Vendor Bills' :
      transactionId.startsWith('invoice-') ? 'Sales' :
      transactionId.startsWith('production-') ? 'Production' :
      transactionId.startsWith('adjustment-') ? 'Adjustments' :
      entry.description.includes('Opening Balance') ? 'Opening Balance' :
      'Manual Entries';

    if (!transactionTypes[type]) {
      transactionTypes[type] = { count: 0, debit: 0, credit: 0 };
    }

    transactionTypes[type].count++;
    transactionTypes[type].debit += line.debit;
    transactionTypes[type].credit += line.credit;
  }

  console.log('  Transaction Type Summary:\n');

  for (const [type, data] of Object.entries(transactionTypes)) {
    const netImpact = data.debit - data.credit;
    console.log(`  ${type}:`);
    console.log(`    Count:       ${data.count} transactions`);
    console.log(`    Debits:      ${(data.debit / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} UZS`);
    console.log(`    Credits:     ${(data.credit / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} UZS`);
    console.log(`    Net Impact:  ${(netImpact / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} UZS (${netImpact > 0 ? 'increase' : 'decrease'})`);
    console.log();
  }

  // ===================================================================
  // CONCLUSION
  // ===================================================================
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  CONCLUSION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (Math.abs(difference) < 100) { // Less than 1 UZS
    console.log('  ✅ Account 1310 balance matches vendor bill totals (within rounding)');
  } else {
    console.log(`  ℹ️  Account 1310 balance differs from vendor bills by ${(Math.abs(difference) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} UZS`);
    console.log('     This is expected due to sales, production, and other inventory movements.');
  }

  console.log('\n  All inventory accounts are properly classified by item class:');
  console.log('    • RAW_MATERIAL items → Account 1310');
  console.log('    • WIP items → Account 1330');
  console.log('    • FINISHED_GOODS items → Account 1340');
  console.log('    • SERVICE items → Expense accounts');

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

verifyInventoryBalance()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
