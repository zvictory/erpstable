import { db } from '../index';
import { equipmentUnits } from '../schema/manufacturing';
import { eq } from 'drizzle-orm';

/**
 * Seed equipment units for manufacturing work centers
 * Includes freeze-dryer units, mixers, and other equipment
 *
 * Equipment tracked for:
 * - Capacity utilization monitoring
 * - Maintenance scheduling (next service date, operating hours)
 * - Cost allocation per unit
 * - Downtime tracking
 */
export async function seedEquipmentUnits() {
    const equipmentData = [
        // Sublimation Units (Work Center 4: Sublimation Unit)
        {
            workCenterId: 4,
            unitCode: 'FD-001',
            manufacturer: 'Virtis',
            model: 'Virtis Genesis XL',
            serialNumber: 'VIR-2021-0847',
            chamberCapacity: 50, // kg
            shelveCount: 8,
            maintenanceIntervalHours: 2000,
            totalOperatingHours: 1200,
        },
        {
            workCenterId: 4,
            unitCode: 'FD-002',
            manufacturer: 'Lyophilization Systems',
            model: 'LS-4000',
            serialNumber: 'LS2022-1456',
            chamberCapacity: 65, // kg
            shelveCount: 10,
            maintenanceIntervalHours: 2000,
            totalOperatingHours: 850,
        },
        {
            workCenterId: 4,
            unitCode: 'FD-003',
            manufacturer: 'SP Industries',
            model: 'FD-200',
            serialNumber: 'SP-2023-0392',
            chamberCapacity: 45, // kg
            shelveCount: 7,
            maintenanceIntervalHours: 1500,
            totalOperatingHours: 420,
        },
    ];

    for (const unit of equipmentData) {
        // Check if equipment already exists
        const existing = await db
            .select()
            .from(equipmentUnits)
            .where(eq(equipmentUnits.unitCode, unit.unitCode))
            .limit(1);

        if (existing.length === 0) {
            await db.insert(equipmentUnits).values({
                ...unit,
                isActive: true,
                lastMaintenanceDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
                nextMaintenanceDue: new Date(Date.now() + (2000 - unit.totalOperatingHours) * 60 * 60 * 1000), // Calculate based on interval
            });
            console.log(`✓ Seeded equipment unit: ${unit.unitCode} - ${unit.manufacturer} ${unit.model}`);
        } else {
            console.log(`⊘ Equipment unit already exists: ${unit.unitCode}`);
        }
    }
}
