
import { db } from './index';
import * as schema from './schema';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { seedGlAccountsRu } from './seed-data/finance-ru';
import { seedUomsRu } from './seed-data/uoms-ru';

async function seedRussian() {
    console.log('🌱 Начало инициализации базы данных (русская версия)...');

    // 1. Clean existing data (Safe Mode: only if explicitly safe, but local DBs are disposable usually)
    // For safety in dev, we'll just delete common tables.
    console.log('🧹 Очистка существующих данных...');

    // Disable foreign keys temporarily for clean slate
    // SQLite specific pragma
    try {
        await db.run(sql`PRAGMA foreign_keys = OFF`);
    } catch (e) {
        console.warn("Невозможно отключить внешние ключи, продолжаем осторожно.");
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

    // 2. Create Standard Users (Russian names)
    console.log('👤 Создание пользователей...');
    const passwordHash = bcrypt.hashSync('password123', 10);

    await db.insert(schema.users).values([
        {
            email: 'admin@erpstable.com',
            name: 'Администратор',
            password: passwordHash,
            role: 'ADMIN',
            isActive: true,
        },
        {
            email: 'accountant@erpstable.com',
            name: 'Главный бухгалтер',
            password: passwordHash,
            role: 'ACCOUNTANT',
            isActive: true,
        },
        {
            email: 'manager@erpstable.com',
            name: 'Директор завода',
            password: passwordHash,
            role: 'PLANT_MANAGER',
            isActive: true,
        },
        {
            email: 'worker@erpstable.com',
            name: 'Рабочий',
            password: passwordHash,
            role: 'FACTORY_WORKER',
            isActive: true,
        },
        {
            email: 'warehouse@erpstable.com',
            name: 'Заведующий складом',
            password: passwordHash,
            role: 'PLANT_MANAGER', // Giving manager role for access
            isActive: true,
        }
    ]);

    // 3. Create Warehouses & Locations (Russian names)
    console.log('🏭 Создание складов и зон хранения...');

    const [mainWh] = await db.insert(schema.warehouses).values({
        code: 'WH-MAIN',
        name: 'Основной склад',
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

    // 4. Create Vendors (English pattern as per requirement)
    console.log('🚚 Создание поставщиков...');
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

    // 5. Create Customers (English pattern as per requirement)
    console.log('🤝 Создание клиентов...');
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

    // 6. Seed GL Accounts (Russian)
    console.log('📊 Создание плана счетов...');
    await seedGlAccountsRu();

    // 7. Seed Units of Measure (Russian)
    console.log('📏 Создание единиц измерения...');
    await seedUomsRu();

    console.log('✅ Инициализация завершена!');
}

seedRussian().catch((err) => {
    console.error('❌ Ошибка инициализации:', err);
    process.exit(1);
});
