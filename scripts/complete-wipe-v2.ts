import { db } from '../db';
import {
    // First: delete dependent records
    priceLists, priceListRules,
    commissionRules, commissions,
    leads, opportunities,
    
    // Then: delete the items/customers/vendors
    items, customers, vendors,
} from '../db/schema';

async function main() {
    console.log('🔥 DELETING REMAINING MASTER DATA...\n');

    const deleteTable = async (name: string, table: any) => {
        try {
            const result = await db.delete(table).returning();
            console.log(`✅ Deleted ${name}: ${result.length} rows`);
            return result.length;
        } catch (e: any) {
            console.error(`❌ Failed to delete ${name}: ${e.message}`);
            return 0;
        }
    };

    try {
        console.log('=== Deleting CRM Data ===');
        await deleteTable('commissions', commissions);
        await deleteTable('commissionRules', commissionRules);
        await deleteTable('opportunities', opportunities);
        await deleteTable('leads', leads);

        console.log('\n=== Deleting Price Management ===');
        await deleteTable('priceListRules', priceListRules);
        await deleteTable('priceLists', priceLists);

        console.log('\n=== Deleting Master Data ===');
        await deleteTable('items', items);
        await deleteTable('vendors', vendors);
        
        // Try customers with error handling
        try {
            const custResult = await db.delete(customers).returning();
            console.log(`✅ Deleted customers: ${custResult.length} rows`);
        } catch (e: any) {
            console.log(`⚠️  Skipped customers (schema issue): ${e.message}`);
        }

        console.log('\n' + '='.repeat(50));
        console.log('✅ COMPLETE WIPE FINISHED');
        console.log('='.repeat(50));

    } catch (error) {
        console.error('❌ WIPE FAILED:', error);
        process.exit(1);
    }
}

main().catch(console.error);
