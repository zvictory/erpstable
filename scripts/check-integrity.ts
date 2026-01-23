
import { db } from '../db';
import { vendorBills, journalEntries } from '../db/schema';
import { eq, like } from 'drizzle-orm';

async function checkIntegrity() {
    console.log("🔍 Starting Data Integrity Check...");

    // Fetch all bills
    const bills = await db.select().from(vendorBills);

    console.log(`Found ${bills.length} bills in total.`);

    let ghostCount = 0;
    let connectedCount = 0;

    for (const bill of bills) {
        // Check for matching Journal Entry
        // Pattern defined in actions: transactionId = `bill-${bill.id}`
        // Or reference = bill.billNumber
        const je = await db.select()
            .from(journalEntries)
            .where(eq(journalEntries.transactionId, `bill-${bill.id}`))
            .limit(1);

        if (je.length === 0) {
            console.log(`❌ GHOST BILL: ID ${bill.id}, Ref: ${bill.billNumber} (No GL Entries!)`);
            ghostCount++;
        } else {
            // console.log(`✅ CONNECTED: ID ${bill.id}, Ref: ${bill.billNumber}`);
            connectedCount++;
        }
    }

    console.log("\n--- Integrity Report ---");
    console.log(`✅ Connected Bills: ${connectedCount}`);
    console.log(`❌ Ghost Bills: ${ghostCount}`);

    process.exit(0);
}

checkIntegrity().catch(err => {
    console.error(err);
    process.exit(1);
});
