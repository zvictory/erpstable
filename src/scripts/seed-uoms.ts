import { db } from '../../db';
import { uoms } from '../../db/schema';
import { eq } from 'drizzle-orm';

const DEFAULT_UOMS = [
    { name: 'Kilogram', code: 'kg', type: 'mass' },
    { name: 'Liter', code: 'L', type: 'volume' },
    { name: 'Piece', code: 'pcs', type: 'count' },
    { name: 'Box', code: 'box', type: 'count' },
    { name: 'Gram', code: 'g', type: 'mass' },
];

async function seed() {
    console.log('🌱 Seeding UOMs...');

    for (const uom of DEFAULT_UOMS) {
        const existing = await db.select().from(uoms).where(eq(uoms.code, uom.code)).get();
        if (!existing) {
            await db.insert(uoms).values(uom);
            console.log(`✅ Created UOM: ${uom.name} (${uom.code})`);
        } else {
            console.log(`ℹ️  Skipped UOM: ${uom.name} (${uom.code}) - Already exists`);
        }
    }

    console.log('✅ Seeding complete.');
}

seed().catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
