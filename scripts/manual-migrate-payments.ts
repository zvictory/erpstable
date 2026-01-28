
import Database from 'better-sqlite3';

const db = new Database('db/data.db');

console.log('📦 Creating vendor_payments and vendor_payment_allocations tables...');

try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS "vendor_payments" (
            "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
            "vendor_id" integer NOT NULL,
            "date" integer NOT NULL,
            "amount" integer NOT NULL,
            "payment_method" text DEFAULT 'BANK_TRANSFER' NOT NULL,
            "reference" text,
            "bank_account_id" text,
            "notes" text,
            "created_at" integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
            "updated_at" integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
            FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON UPDATE no action ON DELETE no action
        );
    `);
    console.log('✅ Created vendor_payments');

    db.exec(`
        CREATE TABLE IF NOT EXISTS "vendor_payment_allocations" (
            "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
            "payment_id" integer NOT NULL,
            "bill_id" integer NOT NULL,
            "amount" integer NOT NULL,
            "created_at" integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
            "updated_at" integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
            FOREIGN KEY ("payment_id") REFERENCES "vendor_payments"("id") ON UPDATE no action ON DELETE cascade,
            FOREIGN KEY ("bill_id") REFERENCES "vendor_bills"("id") ON UPDATE no action ON DELETE no action
        );
    `);
    console.log('✅ Created vendor_payment_allocations');

} catch (e: any) {
    console.error('❌ Migration failed:', e.message);
}

db.close();
