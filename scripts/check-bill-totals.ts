import { db } from '../db';
import { sql } from 'drizzle-orm';

async function checkBillTotals() {
    const bills = await db.all(sql`
        SELECT
            vb.id,
            vb.bill_number,
            vb.total_amount,
            COALESCE(SUM(vbl.amount), 0) as line_items_total
        FROM vendor_bills vb
        LEFT JOIN vendor_bill_lines vbl ON vb.id = vbl.bill_id
        WHERE vb.id IN (102, 89, 87)
        GROUP BY vb.id, vb.bill_number, vb.total_amount
    `);

    console.log('Bill Totals vs Line Items:\n');
    bills.forEach((b: any) => {
        console.log(`Bill #${b.id} (${b.bill_number}):`);
        console.log(`  Bill Total (DB):    ${(b.total_amount / 100).toLocaleString('ru-RU')} UZS (raw: ${b.total_amount} tiyin)`);
        console.log(`  Line Items Total:   ${(b.line_items_total / 100).toLocaleString('ru-RU')} UZS (raw: ${b.line_items_total} tiyin)`);
        console.log(`  Difference:         ${((b.line_items_total - b.total_amount) / 100).toLocaleString('ru-RU')} UZS`);
        console.log('');
    });
}

checkBillTotals();
