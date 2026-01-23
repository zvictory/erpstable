# CSV Bill Importer

## Overview
Import vendor bills from CSV files with automatic creation of missing vendors, items, and UOMs.

## Features
- ✅ **Auto-create vendors** - Creates "Imported Vendor" if not exists
- ✅ **Auto-create UOMs** - Recognizes Russian units (шт, кг, л, м, etc.)
- ✅ **Auto-create items** - Creates inventory items with proper UOM references
- ✅ **Russian number parsing** - Handles "1 200,00" format
- ✅ **Flexible column mapping** - Supports multiple column name variations
- ✅ **Full accounting integration** - Uses existing `saveVendorBill` function

## CSV Format

### Required Columns
The importer supports various column name variations:

| Data | Possible Column Names |
|------|----------------------|
| Item Name | `Наименование товара`, `Наименование`, `Name`, `Item` |
| UOM | `Ед. изм.`, `Единица`, `Unit`, `UOM` |
| Quantity | `Кол-во`, `Количество`, `Quantity` |
| Price | `Цена`, `Price` |
| Amount | `Сумма`, `Amount` |

### Example CSV

```csv
Наименование товара,Ед. изм.,Кол-во,Цена,Сумма
Мороженое,кг,100,"1 200,00","120 000,00"
Клубника,кг,50,"800,00","40 000,00"
Упаковка,шт,200,"50,00","10 000,00"
```

## Configuration

Edit the script to customize:

```typescript
const CSV_FILE_PATH = './Счет на покупку +++.xlsx - Счет на покупку.csv';
const VENDOR_NAME = 'Imported Vendor';
const BILL_REF_PREFIX = 'IMP';
```

## Usage

### 1. Place CSV File
Put your CSV file in the project root:
```
/Users/promax/Documents/LAZA next/
  └── Счет на покупку +++.xlsx - Счет на покупку.csv
```

### 2. Run Import
```bash
npx tsx src/scripts/import-real-bill.ts
```

### 3. Check Output
```
🚀 Starting CSV Bill Import...
📁 Reading file: ./Счет на покупку +++.xlsx - Счет на покупку.csv
✅ Parsed 10 rows from CSV

👤 Checking vendor: Imported Vendor
   ✅ Created new vendor ID: 5

📦 Processing items...
   Row 1: Мороженое
      Qty: 100 кг, Price: 1200, Amount: 120000
   📏 Created UOM: Килограмм (кг) - mass, precision: 3
   📦 Created item: Мороженое (ID: 15)
   ...

💾 Creating vendor bill with 10 items...
✅ Bill created successfully!
   Vendor: Imported Vendor
   Reference: IMP-1704723456789
   Items: 10
   Total: 500,000.00

🎉 Import complete!
```

## UOM Auto-Creation

The importer recognizes common Russian UOMs:

| Code | Name | Type | Precision |
|------|------|------|-----------|
| шт | Штука | count | 0 |
| кг | Килограмм | mass | 3 |
| г | Грамм | mass | 2 |
| л | Литр | volume | 3 |
| м | Метр | length | 2 |
| см | Сантиметр | length | 1 |
| уп | Упаковка | count | 0 |
| коробка | Коробка | count | 0 |

Unknown UOMs are created as "count" type with 0 precision.

## Item Auto-Creation

New items are created with:
- **Type**: Inventory
- **Category**: Raw Materials
- **Base UOM**: From CSV
- **Standard Cost**: Unit price from CSV (in tiyin)
- **Status**: Active

## Number Parsing

Handles Russian number format:
- `"1 200,00"` → `1200.00`
- `"50,00"` → `50.00`
- `"1 000 000,00"` → `1000000.00`

## Error Handling

The script will:
- ✅ Skip rows with empty item names
- ✅ Show warnings for skipped rows
- ✅ Exit with error if no valid items found
- ✅ Exit with error if CSV file not found
- ✅ Show detailed error messages

## Integration

The importer uses the existing `saveVendorBill` function, which:
- Creates vendor bill record
- Creates journal entries (AP, GRNI, VAT)
- Follows GAAP/IFRS accounting standards
- Revalidates cache paths

## Troubleshooting

### File Not Found
```
❌ File not found: ./Счет на покупку +++.xlsx - Счет на покупку.csv
```
**Solution**: Ensure CSV is in project root or update `CSV_FILE_PATH`

### No Valid Items
```
❌ No valid items found in CSV
```
**Solution**: Check CSV has proper column names and data

### Encoding Issues
If you see garbled Russian text, ensure CSV is UTF-8 encoded.

## Next Steps

After import:
1. Navigate to `/purchasing/vendors`
2. Find "Imported Vendor"
3. Review the imported bill
4. Verify amounts and items
5. Post the bill when ready
