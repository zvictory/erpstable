import { db } from '../../db';
import { items, uoms } from '../../db/schema/inventory';
import { categories } from '../../db/schema';
import { vendors } from '../../db/schema/purchasing';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import { saveVendorBill } from '../app/actions/purchasing';

/**
 * CSV Bill Importer
 * Imports vendor bills from CSV with auto-creation of missing items and UOMs
 */

// CONFIGURATION
const CSV_FILE_PATH = './sample-bill.csv';
const VENDOR_NAME = 'Imported Vendor';
const BILL_REF_PREFIX = 'IMP';

interface CSVRow {
    [key: string]: string;
}

/**
 * Simple CSV parser that handles quoted values
 */
function parseCSV(content: string): CSVRow[] {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    // Parse a CSV line handling quoted values
    function parseLine(line: string): string[] {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }

    // Parse header
    const headers = parseLine(lines[0]);

    // Parse rows
    const rows: CSVRow[] = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseLine(lines[i]);
        const row: CSVRow = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        rows.push(row);
    }

    return rows;
}

/**
 * Parse Russian number format: "1 200,00" -> 1200.00
 */
function parseRussianNumber(value: string): number {
    if (!value) return 0;
    const cleaned = value.toString().replace(/\s/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
}

/**
 * Get or create vendor
 */
async function getOrCreateVendor(name: string): Promise<number> {
    console.log(`\n👤 Checking vendor: ${name}`);

    const existing = await db.select()
        .from(vendors)
        .where(eq(vendors.name, name))
        .limit(1);

    if (existing.length > 0) {
        console.log(`   ✅ Found existing vendor ID: ${existing[0].id}`);
        return existing[0].id;
    }

    const [newVendor] = await db.insert(vendors).values({
        name,
        currency: 'UZS',
        isActive: true,
    }).returning();

    console.log(`   ✅ Created new vendor ID: ${newVendor.id}`);
    return newVendor.id;
}

/**
 * Get or create UOM
 */
async function getOrCreateUOM(uomCode: string): Promise<number> {
    const normalized = uomCode.trim().toLowerCase();

    const existing = await db.select()
        .from(uoms)
        .where(eq(uoms.code, normalized))
        .limit(1);

    if (existing.length > 0) {
        return existing[0].id;
    }

    let type: 'mass' | 'volume' | 'count' | 'length' = 'count';
    let precision = 0;
    let name = uomCode;

    const uomMappings: Record<string, { name: string; type: 'mass' | 'volume' | 'count' | 'length'; precision: number }> = {
        'шт': { name: 'Штука', type: 'count', precision: 0 },
        'кг': { name: 'Килограмм', type: 'mass', precision: 3 },
        'г': { name: 'Грамм', type: 'mass', precision: 2 },
        'л': { name: 'Литр', type: 'volume', precision: 3 },
        'м': { name: 'Метр', type: 'length', precision: 2 },
        'см': { name: 'Сантиметр', type: 'length', precision: 1 },
        'уп': { name: 'Упаковка', type: 'count', precision: 0 },
        'коробка': { name: 'Коробка', type: 'count', precision: 0 },
    };

    if (uomMappings[normalized]) {
        const mapping = uomMappings[normalized];
        name = mapping.name;
        type = mapping.type;
        precision = mapping.precision;
    }

    const [newUOM] = await db.insert(uoms).values({
        name,
        code: normalized,
        type,
        precision,
        isActive: true,
    }).returning();

    console.log(`   📏 Created UOM: ${name} (${normalized}) - ${type}, precision: ${precision}`);
    return newUOM.id;
}

/**
 * Get or create default category
 */
async function getOrCreateDefaultCategory(): Promise<number> {
    const existing = await db.select()
        .from(categories)
        .where(eq(categories.name, 'Raw Materials'))
        .limit(1);

    if (existing.length > 0) {
        return existing[0].id;
    }

    const [newCategory] = await db.insert(categories).values({
        name: 'Raw Materials',
        description: 'Raw materials and components',
        isActive: true,
    }).returning();

    return newCategory.id;
}

/**
 * Get or create item
 */
async function getOrCreateItem(itemName: string, uomId: number, unitPrice: number, categoryId: number): Promise<number> {
    const existing = await db.select()
        .from(items)
        .where(eq(items.name, itemName))
        .limit(1);

    if (existing.length > 0) {
        return existing[0].id;
    }

    const [newItem] = await db.insert(items).values({
        name: itemName,
        type: 'Inventory',
        categoryId: categoryId,
        baseUomId: uomId,
        standardCost: Math.round(unitPrice * 100),
        isActive: true,
    }).returning();

    console.log(`   📦 Created item: ${itemName} (ID: ${newItem.id})`);
    return newItem.id;
}

/**
 * Main import function
 */
async function importBill() {
    console.log('🚀 Starting CSV Bill Import...\n');
    console.log(`📁 Reading file: ${CSV_FILE_PATH}`);

    if (!fs.existsSync(CSV_FILE_PATH)) {
        console.error(`❌ File not found: ${CSV_FILE_PATH}`);
        console.log('\nPlease ensure the CSV file is in the project root directory.');
        process.exit(1);
    }

    const fileContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    const records = parseCSV(fileContent);

    console.log(`✅ Parsed ${records.length} rows from CSV\n`);

    const vendorId = await getOrCreateVendor(VENDOR_NAME);
    const categoryId = await getOrCreateDefaultCategory();

    console.log('\n📦 Processing items...');
    const billItems = [];

    for (let i = 0; i < records.length; i++) {
        const row = records[i];

        const itemName = row['Наименование товара'] || row['Наименование'] || row['Name'] || row['Item'];
        const uomCode = row['Ед. изм.'] || row['Единица'] || row['Unit'] || row['UOM'] || 'шт';
        const qtyStr = row['Кол-во'] || row['Количество'] || row['Quantity'] || '0';
        const priceStr = row['Цена'] || row['Price'] || '0';
        const amountStr = row['Сумма'] || row['Amount'] || '0';

        if (!itemName || itemName.trim() === '') {
            console.log(`   ⚠️  Row ${i + 1}: Skipping empty item name`);
            continue;
        }

        const quantity = parseRussianNumber(qtyStr);
        const unitPrice = parseRussianNumber(priceStr);
        const amount = parseRussianNumber(amountStr);

        console.log(`\n   Row ${i + 1}: ${itemName}`);
        console.log(`      Qty: ${quantity} ${uomCode}, Price: ${unitPrice}, Amount: ${amount}`);

        const uomId = await getOrCreateUOM(uomCode);
        const itemId = await getOrCreateItem(itemName, uomId, unitPrice, categoryId);

        billItems.push({
            itemId: itemId.toString(),
            description: itemName,
            quantity,
            unitPrice,
            amount: quantity * unitPrice,
        });
    }

    if (billItems.length === 0) {
        console.error('\n❌ No valid items found in CSV');
        process.exit(1);
    }

    console.log(`\n\n💾 Creating vendor bill with ${billItems.length} items...`);

    const billData = {
        vendorId: vendorId.toString(),
        transactionDate: new Date(),
        refNumber: `${BILL_REF_PREFIX}-${Date.now()}`,
        items: billItems,
        memo: `Imported from CSV: ${CSV_FILE_PATH}`,
        isVatEnabled: false,
    };

    const result = await saveVendorBill(billData);

    if (result.success) {
        console.log('\n✅ Bill created successfully!');
        console.log(`   Vendor: ${VENDOR_NAME}`);
        console.log(`   Reference: ${billData.refNumber}`);
        console.log(`   Items: ${billItems.length}`);
        console.log(`   Total: ${billItems.reduce((sum, item) => sum + item.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    } else {
        const errorMsg = 'error' in result ? result.error : 'Unknown error';
        console.error('\n❌ Failed to create bill:', errorMsg);
        process.exit(1);
    }

    console.log('\n🎉 Import complete!');
}

importBill()
    .then(() => {
        console.log('\n✅ Done');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Import failed:', error);
        console.error(error.stack);
        process.exit(1);
    });
