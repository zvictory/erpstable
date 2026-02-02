import { db } from '../db';

async function main() {
    console.log('☢️ NUCLEAR OPTION: COMPLETE DATABASE WIPE\n');

    try {
        // List of all tables to delete
        const tables = [
            // Dependent tables first
            'invoice_lines', 'invoices',
            'vendor_bill_lines', 'vendor_bills',
            'purchase_order_lines', 'purchase_orders',
            'payment_allocations', 'customer_payments',
            'vendor_payment_allocations', 'vendor_payments',
            'journal_entry_lines', 'journal_entries',
            'inventory_layers', 'inventory_reserves',
            'inventory_location_transfers', 'stock_reservations',
            'production_costs', 'production_outputs', 'production_inputs', 'production_runs',
            'work_order_step_costs', 'work_order_step_status', 'work_order_steps', 'work_orders',
            'process_readings', 'downtime_events', 'maintenance_events', 'maintenance_schedules',
            'depreciation_entries', 'fixed_assets',
            'price_list_rules', 'price_lists',
            'commission_rules', 'commissions',
            'opportunities', 'leads',
            'password_reset_tokens', 'audit_logs',
            
            // Master data - delete last
            'items', 'customers', 'vendors',
        ];

        for (const table of tables) {
            try {
                // Use raw SQL to delete
                const result = await db.execute(`DELETE FROM ${table}`);
                console.log(`✅ Deleted ${table}`);
            } catch (e: any) {
                if (e.message?.includes('no such table')) {
                    console.log(`⊘ Table ${table} doesn't exist`);
                } else {
                    console.log(`⚠️  Couldn't delete ${table}: ${e.message}`);
                }
            }
        }

        // Reset GL accounts
        try {
            await db.execute(`UPDATE gl_accounts SET balance = 0`);
            console.log('✅ Reset GL account balances to 0');
        } catch (e) {
            console.log(`⚠️  Couldn't reset GL accounts`);
        }

        console.log('\n' + '='.repeat(50));
        console.log('☢️ COMPLETE NUCLEAR WIPE FINISHED');
        console.log('='.repeat(50));

    } catch (error) {
        console.error('❌ WIPE FAILED:', error);
        process.exit(1);
    }
}

main().catch(console.error);
