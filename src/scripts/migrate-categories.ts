import { db } from '../../db';
import { categories, items } from '../../db/schema/inventory';
import { eq } from 'drizzle-orm';

async function migrateCategoriesSchema() {
  try {
    console.log('Starting category migration...');

    // Step 1: Check if categories already exist
    const existingCount = await db
      .select()
      .from(categories)
      .then(cats => cats.length);

    if (existingCount > 0) {
      console.log(`Categories table already has ${existingCount} records. Checking if migration needed...`);

      // Check if any items don't have categoryId
      const itemsWithoutCategory = await db
        .select()
        .from(items)
        .then(items => items.filter((item: any) => !item.categoryId));

      if (itemsWithoutCategory.length === 0) {
        console.log('✓ Migration already complete. All items have categoryId.');
        return;
      }

      console.log(`Found ${itemsWithoutCategory.length} items without category. Continuing migration...`);
    }

    // Step 2: Create seed categories if not exist
    const seedCategories = [
      {
        name: 'Raw Materials',
        icon: 'Box',
        color: 'amber',
        description: 'Raw materials and supplies',
      },
      {
        name: 'Finished Goods',
        icon: 'Package',
        color: 'emerald',
        description: 'Finished products ready for sale',
      },
      {
        name: 'Services',
        icon: 'Wrench',
        color: 'blue',
        description: 'Service items',
      },
    ];

    console.log('Inserting seed categories...');
    for (const cat of seedCategories) {
      try {
        await db.insert(categories).values(cat);
        console.log(`✓ Created category: ${cat.name}`);
      } catch (err) {
        // Category might already exist (unique constraint)
        console.log(`ℹ Category "${cat.name}" already exists, skipping...`);
      }
    }

    // Step 3: Get all categories for mapping
    const allCategories = await db.select().from(categories);
    const categoryMap = new Map(allCategories.map(c => [c.name, c.id]));

    console.log(`\nCategory mapping created: ${allCategories.length} categories`);
    allCategories.forEach(cat => {
      console.log(`  ${cat.id}: ${cat.name}`);
    });

    // Step 4: Migrate items (if any exist)
    const allItems = await db.select().from(items);

    if (allItems.length === 0) {
      console.log('\n✓ No items to migrate.');
      return;
    }

    console.log(`\nMigrating ${allItems.length} items...`);
    let migratedCount = 0;
    let skippedCount = 0;

    for (const item of allItems) {
      const oldCategory = (item as any).category;

      // Skip if already has categoryId
      if ((item as any).categoryId) {
        skippedCount++;
        continue;
      }

      const categoryId = categoryMap.get(oldCategory) || categoryMap.get('Raw Materials')!;

      try {
        await db.update(items)
          .set({ categoryId: categoryId })
          .where(eq(items.id, item.id));
        migratedCount++;

        if (migratedCount % 10 === 0) {
          console.log(`  Migrated ${migratedCount} items...`);
        }
      } catch (err) {
        console.error(`✗ Failed to migrate item ${item.id}:`, err instanceof Error ? err.message : err);
      }
    }

    console.log(`\n✓ Migration complete!`);
    console.log(`  Migrated: ${migratedCount} items`);
    console.log(`  Skipped: ${skippedCount} items (already migrated)`);
  } catch (error) {
    console.error('✗ Migration failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

migrateCategoriesSchema()
  .then(() => {
    console.log('\n✓ All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
