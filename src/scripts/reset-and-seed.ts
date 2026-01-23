import { db } from '../../db';
import { items, uoms, categories } from '../../db/schema/inventory';

/**
 * Clear all data and seed with real raw materials for ice cream & freeze-dried fruit production
 */
async function clearAndSeed() {
    console.log('🗑️  Clearing all existing data...');

    // Delete the database file and recreate
    const fs = require('fs');
    const path = require('path');
    const dbPath = path.join(__dirname, '../../local.db');

    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
        console.log('✅ Database file deleted');
    }

    // Wait a moment for the file system
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('📦 Creating base UOMs...');

    // Create base UOMs first
    const [kgUom] = await db.insert(uoms).values({
        name: 'Kilogram',
        code: 'kg',
        type: 'mass',
    }).returning();

    const [literUom] = await db.insert(uoms).values({
        name: 'Liter',
        code: 'L',
        type: 'volume',
    }).returning();

    const [pcsUom] = await db.insert(uoms).values({
        name: 'Pieces',
        code: 'pcs',
        type: 'count',
    }).returning();

    console.log(`  ✅ Created UOMs: kg, L, pcs`);

    console.log('\n📦 Creating category...');

    const [category] = await db.insert(categories).values({
        name: 'Raw Materials',
        description: 'Raw materials and components',
        isActive: true,
    }).returning();

    console.log(`  ✅ Created category: ${category.name}`);

    console.log('\n📦 Seeding raw materials...');

    const rawMaterials = [
        { name: 'Мороженое', nameUz: 'Muzqaymoq', nameEn: 'Ice Cream', baseUomId: kgUom.id },
        { name: 'Клубника', nameUz: 'Qulupnay', nameEn: 'Strawberry', baseUomId: kgUom.id },
        { name: 'Йогурт', nameUz: 'Yogurt', nameEn: 'Yogurt', baseUomId: literUom.id },
        { name: 'Ананас', nameUz: 'Ananas', nameEn: 'Pineapple', baseUomId: kgUom.id },
        { name: 'Банан', nameUz: 'Banan', nameEn: 'Banana', baseUomId: kgUom.id },
        { name: 'Вишня', nameUz: 'Olcha', nameEn: 'Cherry', baseUomId: kgUom.id },
        { name: 'Киви', nameUz: 'Kivi', nameEn: 'Kiwi', baseUomId: kgUom.id },
        { name: 'Яблоко', nameUz: 'Olma', nameEn: 'Apple', baseUomId: kgUom.id },
        { name: 'Шоколад', nameUz: 'Shokolad', nameEn: 'Chocolate', baseUomId: kgUom.id },
    ];

    for (const item of rawMaterials) {
        await db.insert(items).values({
            name: item.name,
            description: `${item.nameEn} / ${item.nameUz}`,
            type: 'Inventory',
            categoryId: category.id,
            baseUomId: item.baseUomId,
            isActive: true,
        });
        console.log(`  ✅ Added: ${item.name} (${item.nameUz})`);
    }

    console.log('\n🎉 Database reset complete!');
    console.log(`📊 Total items added: ${rawMaterials.length}`);
    console.log(`📊 Total UOMs: 3 (kg, L, pcs)`);
}

clearAndSeed()
    .then(() => {
        console.log('\n✅ Seed completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Seed failed:', error);
        process.exit(1);
    });
