#!/usr/bin/env node

import { db } from '../db/index.js';
import { warehouses, warehouseLocations, inventoryLayers, items } from '../db/schema/index.js';
import { eq, sql } from 'drizzle-orm';

async function seedTestData() {
  try {
    console.log('🌱 Seeding warehouse location test data...\n');

    // 1. Create additional warehouses
    console.log('📦 Creating warehouses...');
    const warehouse2 = await db.insert(warehouses).values({
      code: 'WH02',
      name: 'Cold Storage',
      address: '456 Freezer Lane, Denver CO',
      isActive: true,
      warehouseType: 'cold_storage',
    }).returning();

    const warehouse3 = await db.insert(warehouses).values({
      code: 'WH03',
      name: 'West Coast Distribution',
      address: '789 Shipping Ave, Los Angeles CA',
      isActive: true,
      warehouseType: 'general',
    }).returning();

    console.log(`   ✅ Created ${[warehouse2, warehouse3].length} additional warehouses\n`);

    // 2. Get main warehouse
    const mainWarehouse = await db.select().from(warehouses).where(eq(warehouses.code, 'MAIN')).limit(1);
    const main = mainWarehouse[0];

    // 3. Create locations for MAIN warehouse (100 locations)
    console.log('📍 Creating locations for MAIN warehouse (100 locations)...');
    const mainLocations = [];

    // Zone A: Aisles 01-05, Shelves 1-5, Bins A-D (100 total)
    for (let aisle = 1; aisle <= 5; aisle++) {
      for (let shelf = 1; shelf <= 5; shelf++) {
        for (const bin of ['A', 'B', 'C', 'D']) {
          mainLocations.push({
            warehouseId: main.id,
            locationCode: `MAIN-A-${String(aisle).padStart(2, '0')}-${shelf}-${bin}`,
            zone: 'A',
            aisle: String(aisle).padStart(2, '0'),
            shelf: String(shelf),
            bin,
            locationType: 'picking',
            capacityQty: 1000,
            isActive: true,
          });
        }
      }
    }

    // Zone B: Bulk storage (20 locations)
    for (let i = 1; i <= 20; i++) {
      mainLocations.push({
        warehouseId: main.id,
        locationCode: `MAIN-B-BULK-${String(i).padStart(2, '0')}`,
        zone: 'B',
        aisle: 'BULK',
        shelf: String(Math.floor(i / 5) + 1),
        bin: String(i % 5 || 5),
        locationType: 'bulk',
        capacityQty: 5000,
        isActive: true,
      });
    }

    if (mainLocations.length > 0) {
      await db.insert(warehouseLocations).values(mainLocations);
      console.log(`   ✅ Created ${mainLocations.length} locations for MAIN warehouse\n`);
    }

    // 4. Create locations for WH02 (Cold Storage)
    console.log('📍 Creating locations for WH02 (Cold Storage)...');
    const coldLocations = [];

    // COLD zone: 5 aisles, 2 shelves each (10 locations)
    for (let aisle = 1; aisle <= 5; aisle++) {
      for (let shelf = 1; shelf <= 2; shelf++) {
        coldLocations.push({
          warehouseId: warehouse2[0].id,
          locationCode: `WH02-COLD-${String(aisle).padStart(2, '0')}-${shelf}`,
          zone: 'COLD',
          aisle: String(aisle).padStart(2, '0'),
          shelf: `L${shelf}`,
          bin: 'A',
          locationType: 'picking',
          capacityQty: 500,
          isActive: true,
        });
      }
    }

    if (coldLocations.length > 0) {
      await db.insert(warehouseLocations).values(coldLocations);
      console.log(`   ✅ Created ${coldLocations.length} locations for WH02\n`);
    }

    // 5. Create locations for WH03 (Distribution)
    console.log('📍 Creating locations for WH03 (Distribution)...');
    const distLocations = [];

    // PICK zone: 3 aisles, 3 shelves each (9 locations)
    for (let aisle = 1; aisle <= 3; aisle++) {
      for (let shelf = 1; shelf <= 3; shelf++) {
        distLocations.push({
          warehouseId: warehouse3[0].id,
          locationCode: `WH03-PICK-${String(aisle).padStart(2, '0')}-${shelf}`,
          zone: 'PICK',
          aisle: String(aisle).padStart(2, '0'),
          shelf: String(shelf),
          bin: 'A',
          locationType: 'picking',
          capacityQty: 1000,
          isActive: true,
        });
      }
    }

    // BULK zone: 5 locations
    for (let i = 1; i <= 5; i++) {
      distLocations.push({
        warehouseId: warehouse3[0].id,
        locationCode: `WH03-BULK-${String(i).padStart(2, '0')}`,
        zone: 'BULK',
        aisle: 'BULK',
        shelf: `B${i}`,
        bin: 'X',
        locationType: 'bulk',
        capacityQty: 5000,
        isActive: true,
      });
    }

    if (distLocations.length > 0) {
      await db.insert(warehouseLocations).values(distLocations);
      console.log(`   ✅ Created ${distLocations.length} locations for WH03\n`);
    }

    // 6. Add inventory to locations
    console.log('📦 Adding inventory layers to locations...');

    // Get some items to add inventory for
    const itemsList = await db.select({ id: items.id, name: items.name }).from(items).limit(5);

    if (itemsList.length > 0) {
      const inventoryToAdd = [];
      const baseDate = new Date(2025, 0, 1); // Jan 1, 2025
      let inventoryCount = 0;

      // Add inventory for first 3 items to various locations
      for (let itemIdx = 0; itemIdx < Math.min(3, itemsList.length); itemIdx++) {
        const item = itemsList[itemIdx];

        // Add to 3 different locations
        for (let locIdx = 0; locIdx < 3; locIdx++) {
          const randomMainLoc = mainLocations[Math.floor(Math.random() * mainLocations.length)];
          const mainLocationDb = await db.select().from(warehouseLocations)
            .where(eq(warehouseLocations.locationCode, randomMainLoc.locationCode))
            .limit(1);

          if (mainLocationDb.length > 0) {
            inventoryToAdd.push({
              itemId: item.id,
              batchNumber: `TEST-BATCH-${itemIdx}-${locIdx}`,
              initialQty: Math.floor(Math.random() * 100) + 50,
              remainingQty: Math.floor(Math.random() * 100) + 50,
              unitCost: Math.floor(Math.random() * 5000) + 1000, // cents
              warehouseId: main.id,
              locationId: mainLocationDb[0].id,
              isDepleted: false,
              receiveDate: new Date(baseDate.getTime() + locIdx * 24 * 60 * 60 * 1000),
              version: 1,
            });
            inventoryCount++;
          }
        }
      }

      // Add inventory for last 2 items to cold storage
      for (let itemIdx = 3; itemIdx < Math.min(5, itemsList.length); itemIdx++) {
        const item = itemsList[itemIdx];

        const randomColdLoc = coldLocations[Math.floor(Math.random() * coldLocations.length)];
        const coldLocationDb = await db.select().from(warehouseLocations)
          .where(eq(warehouseLocations.locationCode, randomColdLoc.locationCode))
          .limit(1);

        if (coldLocationDb.length > 0) {
          inventoryToAdd.push({
            itemId: item.id,
            batchNumber: `TEST-BATCH-COLD-${itemIdx}`,
            initialQty: Math.floor(Math.random() * 100) + 50,
            remainingQty: Math.floor(Math.random() * 100) + 50,
            unitCost: Math.floor(Math.random() * 5000) + 1000, // cents
            warehouseId: warehouse2[0].id,
            locationId: coldLocationDb[0].id,
            isDepleted: false,
            receiveDate: new Date(),
            version: 1,
          });
          inventoryCount++;
        }
      }

      if (inventoryToAdd.length > 0) {
        await db.insert(inventoryLayers).values(inventoryToAdd);
        console.log(`   ✅ Created ${inventoryToAdd.length} inventory layers\n`);
      }
    }

    // 7. Summary
    console.log('📊 Test Data Summary:');
    const wareCount = await db.select({ count: sql`count(*)` }).from(warehouses);
    const locCount = await db.select({ count: sql`count(*)` }).from(warehouseLocations);
    const invCount = await db.select({ count: sql`count(*)` }).from(inventoryLayers).where(sql`warehouse_id IS NOT NULL`);

    console.log(`   ✅ Warehouses: ${wareCount[0].count}`);
    console.log(`   ✅ Locations: ${locCount[0].count}`);
    console.log(`   ✅ Inventory Layers (with location): ${invCount[0].count}`);
    console.log('\n✨ Test data seeding complete!');

    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seedTestData();
