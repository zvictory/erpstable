import { db } from '../../db';
import { uoms } from '../../db/schema/inventory';
import { eq } from 'drizzle-orm';

const STANDARD_UNITS = [
    // Count - No decimals
    { name: 'Piece', code: 'pcs', type: 'count', precision: 0 },
    { name: 'Box', code: 'box', type: 'count', precision: 0 },
    { name: 'Pack', code: 'pack', type: 'count', precision: 0 },

    // Mass (Weight) - High precision
    { name: 'Kilogram', code: 'kg', type: 'mass', precision: 3 },
    { name: 'Gram', code: 'g', type: 'mass', precision: 2 },
    { name: 'Ton', code: 't', type: 'mass', precision: 3 },

    // Volume - High precision
    { name: 'Liter', code: 'L', type: 'volume', precision: 3 },
    { name: 'Milliliter', code: 'mL', type: 'volume', precision: 2 },

    // Length - Standard precision
    { name: 'Meter', code: 'm', type: 'length', precision: 2 },
    { name: 'Centimeter', code: 'cm', type: 'length', precision: 1 },
];

/**
 * Seed default UOMs if they don't exist
 * Safe to run multiple times - uses duplicate checking
 */
export async function seedUOMs() {
    console.log('🌱 Seeding Units of Measure...');

    try {
        let addedCount = 0;
        let skippedCount = 0;

        for (const unit of STANDARD_UNITS) {
            // Check if unit already exists by code (unique identifier)
            const existing = await db.select()
                .from(uoms)
                .where(eq(uoms.code, unit.code))
                .limit(1);

            if (existing.length === 0) {
                await db.insert(uoms).values({
                    name: unit.name,
                    code: unit.code,
                    type: unit.type,
                    precision: unit.precision,
                    isActive: true,
                });
                console.log(`  ✅ Added: ${unit.name} (${unit.code})`);
                addedCount++;
            } else {
                console.log(`  ℹ️  Skipped: ${unit.name} (Already exists)`);
                skippedCount++;
            }
        }

        console.log(`\n✨ UOM Seeding Complete!`);
        console.log(`   📊 Added: ${addedCount}, Skipped: ${skippedCount}`);

    } catch (error) {
        console.error('❌ Seeding Failed:', error);
        throw error;
    }
}

// Allow running directly from command line
if (require.main === module) {
    seedUOMs()
        .then(() => {
            console.log('✅ Done');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error:', error);
            process.exit(1);
        });
}
