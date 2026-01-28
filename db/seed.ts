
import { db } from './index';
import * as schema from './schema';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function seed() {
    console.log('🌱 Starting Universal Seeder...');

    // 1. Clean existing data (Safe Mode: only if explicitly safe, but local DBs are disposable usually)
    // For safety in dev, we'll just delete common tables.
    console.log('🧹 Cleaning existing data...');

    // Disable foreign keys temporarily for clean slate
    // SQLite specific pragma
    try {
        await db.run(sql`PRAGMA foreign_keys = OFF`);
    } catch (e) {
        console.warn("Could not disable FKs (might not be supported on this driver), proceeding carefully.");
    }

    await db.delete(schema.inventoryLocationTransfers);
    await db.delete(schema.inventoryLayers);
    await db.delete(schema.warehouseLocations);
    await db.delete(schema.warehouses);

    await db.delete(schema.vendorBillLines);
    await db.delete(schema.vendorBills);
    await db.delete(schema.purchaseOrderLines);
    await db.delete(schema.purchaseOrders);
    await db.delete(schema.vendors);

    await db.delete(schema.paymentAllocations);
    await db.delete(schema.customerPayments);
    await db.delete(schema.invoiceLines);
    await db.delete(schema.invoices);
    await db.delete(schema.customers);

    await db.delete(schema.users);

    try {
        await db.run(sql`PRAGMA foreign_keys = ON`);
    } catch (e) { }

    // 2. Create Standard Users
    console.log('👤 Creating Users...');
    const passwordHash = bcrypt.hashSync('password123', 10);

    await db.insert(schema.users).values([
        {
            email: 'admin@erpstable.com',
            name: 'Admin User',
            password: passwordHash,
            role: 'ADMIN',
            isActive: true,
        },
        {
            email: 'accountant@erpstable.com',
            name: 'Chief Accountant',
            password: passwordHash,
            role: 'ACCOUNTANT',
            isActive: true,
        },
        {
            email: 'manager@erpstable.com',
            name: 'Plant Manager',
            password: passwordHash,
            role: 'PLANT_MANAGER',
            isActive: true,
        },
        {
            email: 'worker@erpstable.com',
            name: 'Factory Worker',
            password: passwordHash,
            role: 'FACTORY_WORKER',
            isActive: true,
        },
        {
            email: 'warehouse@erpstable.com',
            name: 'Warehouse Keeper',
            password: passwordHash,
            role: 'PLANT_MANAGER', // Giving manager role for access
            isActive: true,
        }
    ]);

    // 3. Create Warehouses & Locations
    console.log('🏭 Creating Warehouses & Locations...');

    const [mainWh] = await db.insert(schema.warehouses).values({
        code: 'WH-MAIN',
        name: 'Main Warehouse',
        warehouseType: 'general',
        isActive: true,
    }).returning();

    if (mainWh) {
        const locations = [
            { code: 'RM-01', zone: 'RM', type: 'receiving' },
            { code: 'WIP-01', zone: 'WIP', type: 'production' },
            { code: 'FG-01', zone: 'FG', type: 'shipping' },
        ];

        for (const loc of locations) {
            await db.insert(schema.warehouseLocations).values({
                warehouseId: mainWh.id,
                locationCode: loc.code,
                zone: loc.zone,
                locationType: loc.type,
                isActive: true,
                capacityQty: 10000,
            });
        }
    }

    // 4. Create Vendors
    console.log('🚚 Creating Vendors...');
    const vendorData = Array.from({ length: 10 }).map((_, i) => ({
        name: `Vendor ${i + 1} - Supplies Co`,
        taxId: `900000${i}`,
        email: `vendor${i + 1}@supplies.co`,
        phone: `+9989012345${i}`,
        address: `Industrial Zone ${i}, Tashkent`,
        currency: 'UZS',
        status: 'ACTIVE' as const,
        isActive: true,
    }));
    await db.insert(schema.vendors).values(vendorData);

    // 5. Create Customers
    console.log('🤝 Creating Customers...');
    const customerData = Array.from({ length: 10 }).map((_, i) => ({
        name: `Customer ${i + 1} - Retail Chain`,
        taxId: `800000${i}`,
        email: `buyer${i + 1}@retail.uz`,
        phone: `+9989098765${i}`,
        address: `Shopping Mall ${i}, Tashkent`,
        creditLimit: 100000000, // 1M UZS
        isActive: true,
    }));
    await db.insert(schema.customers).values(customerData);

    console.log('✅ Seeding Complete!');
}

seed().catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
