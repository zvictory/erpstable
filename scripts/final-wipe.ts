import { db } from '../db';
import { sql } from 'drizzle-orm';

async function main() {
    console.log('☢️ COMPLETE DATABASE WIPE\n');

    const tables = [
        'invoice_lines', 'invoices', 'vendor_bill_lines', 'vendor_bills',
        'purchase_order_lines', 'purchase_orders', 'payment_allocations',
        'customer_payments', 'vendor_payment_allocations', 'vendor_payments',
        'journal_entry_lines', 'journal_entries', 'inventory_layers',
        'inventory_reserves', 'inventory_location_transfers', 'stock_reservations',
        'production_costs', 'production_outputs', 'production_inputs', 'production_runs',
        'work_order_step_costs', 'work_order_step_status', 'work_order_steps', 'work_orders',
        'process_readings', 'downtime_events', 'maintenance_events', 'maintenance_schedules',
        'depreciation_entries', 'fixed_assets', 'price_list_rules', 'price_lists',
        'commission_rules', 'commissions', 'opportunities', 'leads',
        'password_reset_tokens', 'audit_logs', 'items', 'customers', 'vendors'
    ];

    for (const table of tables) {
        try {
            await db.run(sql.raw(`DELETE FROM ${table}`));
            console.log(`✅ ${table}`);
        } catch (e) {
            console.log(`⊘ ${table}`);
        }
    }

    try {
        await db.run(sql.raw(`UPDATE gl_accounts SET balance = 0`));
        console.log(`✅ gl_accounts (balance → 0)`);
    } catch (e) {}

    console.log('\n✅ COMPLETE WIPE FINISHED\n');
}

main().catch(console.error);
