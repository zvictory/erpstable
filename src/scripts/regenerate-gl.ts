import { db } from '../../db';
import { vendorBills } from '../../db/schema/purchasing';
import { journalEntries, journalEntryLines } from '../../db/schema/finance';
import { eq, isNull } from 'drizzle-orm';

/**
 * Regenerate GL Entries for Ghost Bills
 * 
 * Finds vendor bills that don't have associated journal entries
 * and creates the proper GL entries for them.
 */

async function regenerateGLEntries() {
    console.log('🔍 Finding bills without journal entries...\n');

    // Get all vendor bills
    const bills = await db.select().from(vendorBills);

    console.log(`📊 Found ${bills.length} total bills\n`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const bill of bills) {
        // Check if journal entry exists for this bill
        const existingJE = await db.select()
            .from(journalEntries)
            .where(eq(journalEntries.reference, bill.billNumber || ''))
            .limit(1);

        if (existingJE.length > 0) {
            console.log(`  ⏭️  Bill ${bill.id} (${bill.billNumber}): Already has journal entry`);
            skippedCount++;
            continue;
        }

        console.log(`\n  🔧 Fixing Bill ${bill.id} (${bill.billNumber})...`);

        try {
            await db.transaction(async (tx) => {
                const totalAmountTiyin = bill.totalAmount;
                const subtotalTiyin = totalAmountTiyin;

                // Create journal entry
                const [je] = await tx.insert(journalEntries).values({
                    date: bill.billDate,
                    description: `Vendor Bill: ${bill.billNumber || bill.id}`,
                    reference: bill.billNumber || `BILL-${bill.id}`,
                    transactionId: bill.id.toString(),
                    isPosted: true,
                }).returning();

                console.log(`     ✅ Created journal entry ${je.id}`);

                // Debit Accrued Liability / GRNI (2110)
                await tx.insert(journalEntryLines).values({
                    journalEntryId: je.id,
                    accountCode: '2110',
                    debit: subtotalTiyin,
                    credit: 0,
                    description: `Clear Accrual for Bill ${bill.billNumber || bill.id}`
                });

                // Credit Accounts Payable (2100)
                await tx.insert(journalEntryLines).values({
                    journalEntryId: je.id,
                    accountCode: '2100',
                    debit: 0,
                    credit: totalAmountTiyin,
                    description: `Vendor Liability ${bill.billNumber || bill.id}`
                });

                console.log(`     ✅ Created 2 journal entry lines`);
            });

            fixedCount++;
            console.log(`     ✅ Bill ${bill.id} fixed successfully`);

        } catch (error: any) {
            console.error(`     ❌ Failed to fix bill ${bill.id}:`, error.message);
        }
    }

    console.log(`\n\n📊 Summary:`);
    console.log(`   ✅ Fixed: ${fixedCount} bills`);
    console.log(`   ⏭️  Skipped: ${skippedCount} bills (already have journal entries)`);
    console.log(`   📋 Total: ${bills.length} bills`);
}

regenerateGLEntries()
    .then(() => {
        console.log('\n✅ Repair complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Repair failed:', error);
        console.error(error.stack);
        process.exit(1);
    });
