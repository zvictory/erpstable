import { db } from '../../db';
import { uoms, items, uomConversions } from '../../db/schema/inventory';
import { eq, inArray, sql, notInArray, or } from 'drizzle-orm';

const RUSSIAN_UNITS = [
    { name: 'Штука', code: 'шт', type: 'count', precision: 0, mapFrom: ['pcs', 'piece', 'Piece', 'box', 'Box', 'pack', 'Pack', 'count'] },
    { name: 'Килограмм', code: 'кг', type: 'mass', precision: 3, mapFrom: ['kg', 'kilogram', 'Kilogram', 'mass'] },
    { name: 'Литр', code: 'л', type: 'volume', precision: 3, mapFrom: ['l', 'L', 'liter', 'Liter', 'mL', 'Milliliter', 'volume'] },
    { name: 'Метр', code: 'м', type: 'length', precision: 2, mapFrom: ['m', 'meter', 'Meter', 'cm', 'Centimeter', 'length'] },
];

export async function setupRussianUOMs() {
    console.log('🇷🇺 Setting up Russian Units of Measure (Merging & Cleanup)...');

    try {
        const processedIds = new Set<number>();

        // Helper to update shadow table if exists
        const updateShadowTable = async (table: string, masterId: number, slaveIds: number[]) => {
            try {
                // Check if table exists implicitly by running update
                await db.run(sql.raw(`UPDATE "${table}" SET base_uom_id = ${masterId} WHERE base_uom_id IN (${slaveIds.join(',')})`));
                await db.run(sql.raw(`UPDATE "${table}" SET purchase_uom_id = ${masterId} WHERE purchase_uom_id IN (${slaveIds.join(',')})`));
                console.log(`  Updated shadow table ${table}.`);
            } catch (e) {
                // Ignore if table doesn't exist or other error
            }
        };

        // 1. Map existing units to Russian ones
        for (const unit of RUSSIAN_UNITS) {
            console.log(`\nProcessing target: ${unit.name} (${unit.code})...`);

            // Find all existing UOMs that map to this target
            const mapTargets = [...unit.mapFrom, unit.code];
            const matchingUnits = await db.select().from(uoms).where(inArray(uoms.code, mapTargets));

            if (matchingUnits.length === 0) {
                // No matches, create fresh
                const res = await db.insert(uoms).values({
                    name: unit.name,
                    code: unit.code,
                    type: unit.type,
                    precision: unit.precision,
                    isActive: true,
                }).returning();
                console.log(`  Created new record: ${unit.name} (ID: ${res[0].id})`);
                processedIds.add(res[0].id);
                continue;
            }

            // Identify Master
            let master = matchingUnits.find(u => u.code === unit.code);

            if (!master) {
                master = matchingUnits[0];
                console.log(`  Promoting existing '${master.name}' (${master.code}) to Master '${unit.name}'...`);
                await db.update(uoms).set({
                    name: unit.name,
                    code: unit.code,
                    type: unit.type,
                    precision: unit.precision,
                    isActive: true
                }).where(eq(uoms.id, master.id));
            } else {
                console.log(`  Found existing Master: ${master.name}`);
            }

            processedIds.add(master.id);

            // Reassign Slaves
            const slaveUnits = matchingUnits.filter(u => u.id !== master!.id);
            const slaveIds = slaveUnits.map(u => u.id);

            if (slaveIds.length > 0) {
                console.log(`  Merging ${slaveIds.length} obsolete units into Master...`);

                await db.run(sql`UPDATE items SET base_uom_id = ${master.id} WHERE base_uom_id IN ${slaveIds}`);
                await db.run(sql`UPDATE items SET purchase_uom_id = ${master.id} WHERE purchase_uom_id IN ${slaveIds}`);

                // Handle shadow table "__old_push_items"
                await updateShadowTable('__old_push_items', master.id, slaveIds);

                await db.delete(uomConversions).where(or(
                    inArray(uomConversions.fromUomId, slaveIds),
                    inArray(uomConversions.toUomId, slaveIds)
                ));
                console.log('  Deleted related UOM conversions.');

                // Delete Slaves
                await db.delete(uoms).where(inArray(uoms.id, slaveIds));
                console.log('  Slave units deleted.');
            }
        }

        // 2. Cleanup ANY remaining non-Russian units
        const russianCodes = RUSSIAN_UNITS.map(u => u.code);
        console.log(`\nCleaning up any remaining non-Russian units (keeping: ${russianCodes.join(', ')})...`);

        const shtUnit = await db.select().from(uoms).where(eq(uoms.code, 'шт')).limit(1);
        const defaultUomId = shtUnit.length > 0 ? shtUnit[0].id : null;

        if (defaultUomId) {
            const unknownUnits = await db.select().from(uoms)
                .where(notInArray(uoms.code, russianCodes));

            const unknownIds = unknownUnits.map(u => u.id);

            if (unknownIds.length > 0) {
                console.log(`  Reassigning items from ${unknownIds.length} unknown units to 'шт'...`);
                await db.run(sql`UPDATE items SET base_uom_id = ${defaultUomId} WHERE base_uom_id IN ${unknownIds}`);
                await db.run(sql`UPDATE items SET purchase_uom_id = ${defaultUomId} WHERE purchase_uom_id IN ${unknownIds}`);

                await updateShadowTable('__old_push_items', defaultUomId, unknownIds);

                await db.delete(uomConversions).where(or(
                    inArray(uomConversions.fromUomId, unknownIds),
                    inArray(uomConversions.toUomId, unknownIds)
                ));

                await db.delete(uoms).where(inArray(uoms.id, unknownIds));
                console.log('  Unknown units deleted.');
            }
        }

        console.log('\n✨ Russian UOM Setup Complete!');

    } catch (error) {
        console.error('❌ Setup Failed:', error);
        throw error;
    }
}

if (require.main === module) {
    setupRussianUOMs()
        .then(() => {
            console.log('✅ Done');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error:', error);
            process.exit(1);
        });
}
