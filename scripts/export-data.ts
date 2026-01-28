
import { db } from './db/index';
import { items } from './db/schema/inventory';
import { vendorBills, vendorBillLines } from './db/schema/purchasing';
import { vendors } from './db/schema/purchasing';
import { eq } from 'drizzle-orm';
import fs from 'fs';

async function exportData() {
    console.log('Exporting data...');

    // 1. Export Items
    const allItems = await db.select().from(items);
    if (allItems.length > 0) {
        const header = Object.keys(allItems[0]).join(',');
        const rows = allItems.map(item => Object.values(item).map(v => `"${v}"`).join(','));
        fs.writeFileSync('items_export.csv', [header, ...rows].join('\n'));
        console.log(`✅ Exported ${allItems.length} items to items_export.csv`);
    }

    // 2. Export Vendor Bills (Flatted with lines)
    const bills = await db.query.vendorBills.findMany({
        with: {
            lines: true,
            vendor: true
        }
    });

    if (bills.length > 0) {
        const flatRows = [];
        const headers = ['Bill ID', 'Ref Number', 'Date', 'Vendor', 'Total Amount', 'Item', 'Qty', 'Unit Price', 'Line Amount'];

        for (const bill of bills) {
            if (bill.lines.length === 0) {
                flatRows.push([
                    bill.id,
                    bill.refNumber,
                    new Date(bill.billDate).toISOString().split('T')[0],
                    bill.vendor.name,
                    bill.totalAmount,
                    '', '', '', ''
                ].map(v => `"${v}"`).join(','));
            } else {
                for (const line of bill.lines) {
                    flatRows.push([
                        bill.id,
                        bill.refNumber,
                        new Date(bill.billDate).toISOString().split('T')[0],
                        bill.vendor.name,
                        bill.totalAmount,
                        line.description,
                        line.quantity,
                        line.unitPrice,
                        line.amount
                    ].map(v => `"${v}"`).join(','));
                }
            }
        }

        fs.writeFileSync('bills_export.csv', [headers.join(','), ...flatRows].join('\n'));
        console.log(`✅ Exported ${bills.length} bills to bills_export.csv`);
    }
}

exportData().catch(console.error).then(() => process.exit(0));
