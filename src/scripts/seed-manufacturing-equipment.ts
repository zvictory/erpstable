import { seedEquipmentUnits } from '../../db/seed-data/equipment_units';

/**
 * Seed manufacturing equipment units for production
 * Includes freeze-dryer units, mixers, and other equipment
 *
 * Run with: npx ts-node src/scripts/seed-manufacturing-equipment.ts
 */
async function seedManufacturingEquipment() {
    console.log('🏭 MANUFACTURING EQUIPMENT SEEDING');
    console.log('====================================\n');

    try {
        console.log('📋 Seeding equipment units (freeze-dryers, mixers, etc.)...');
        await seedEquipmentUnits();
        console.log('\n✅ Equipment units seeded successfully\n');

        console.log('🎉 Manufacturing equipment seeding complete!');
        console.log('✅ Equipment tracking is now ready for production');
    } catch (error) {
        console.error('\n❌ Seeding failed:', error);
        throw error;
    }
}

seedManufacturingEquipment()
    .then(() => {
        console.log('\n✅ Seed completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Seed failed:', error);
        process.exit(1);
    });
