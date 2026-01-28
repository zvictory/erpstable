import { db } from '../index';
import { uoms } from '../schema/inventory';
import { eq } from 'drizzle-orm';

/**
 * Seed Units of Measure with Russian translations
 * Standard UOMs for manufacturing and inventory management
 */
export async function seedUomsRu() {
    const unitsOfMeasure = [
        // Count units
        {
            name: 'Штука',
            code: 'pcs',
            type: 'count',
            precision: 0,
        },
        {
            name: 'Коробка',
            code: 'box',
            type: 'count',
            precision: 0,
        },
        {
            name: 'Упаковка',
            code: 'pack',
            type: 'count',
            precision: 0,
        },

        // Mass units
        {
            name: 'Килограмм',
            code: 'kg',
            type: 'mass',
            precision: 3,
        },
        {
            name: 'Грамм',
            code: 'g',
            type: 'mass',
            precision: 2,
        },
        {
            name: 'Тонна',
            code: 't',
            type: 'mass',
            precision: 3,
        },

        // Volume units
        {
            name: 'Литр',
            code: 'L',
            type: 'volume',
            precision: 3,
        },
        {
            name: 'Миллилитр',
            code: 'mL',
            type: 'volume',
            precision: 2,
        },

        // Length units
        {
            name: 'Метр',
            code: 'm',
            type: 'length',
            precision: 2,
        },
        {
            name: 'Сантиметр',
            code: 'cm',
            type: 'length',
            precision: 1,
        },
    ];

    for (const uom of unitsOfMeasure) {
        // Check if UOM already exists
        const existing = await db.select().from(uoms)
            .where(eq(uoms.code, uom.code))
            .limit(1);

        if (existing.length === 0) {
            await db.insert(uoms).values({
                ...uom,
                isActive: true,
            });
            console.log(`✓ Создана единица измерения: ${uom.code} - ${uom.name}`);
        } else {
            console.log(`⊘ Единица измерения уже существует: ${uom.code}`);
        }
    }
}
