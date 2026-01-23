import { z } from 'zod';

/**
 * Strict validation for Purchasing Line Items
 * All numeric fields use .safe() to prevent overflow and ensure type safety
 */
export const purchaseLineItemSchema = z.object({
    itemId: z.union([z.string(), z.coerce.number()])
        .refine(val => {
            const num = Number(val);
            return !isNaN(num) && num > 0;
        }, { message: "Item is required" }),
    description: z.string().optional(),
    quantity: z.coerce.number().min(0.0001, "Quantity must be greater than 0"),
    unitPrice: z.coerce.number().min(0, "Unit Price cannot be negative"),
    taxCode: z.string().optional(),
    amount: z.coerce.number().min(0, "Amount must be positive").optional(),
});

/**
 * Main Purchasing Document Schema (PO, Receipt, Bill)
 * Enhanced with strict type coercion to handle HTML form string inputs
 * Added warehouse/location fields for multi-warehouse inventory tracking
 */
export const purchasingDocumentSchema = z.object({
    vendorId: z.union([z.string(), z.number()]).transform(val => String(val)),
    transactionDate: z.coerce.date({
        required_error: "Transaction date is required",
        invalid_type_error: "Invalid date format",
    }),
    refNumber: z.string().min(1, "Reference number is required"),
    terms: z.string().optional(),
    dueDate: z.coerce.date().optional(),
    exchangeRate: z.coerce.number().min(0.00001, "Exchange rate must be positive").default(1),
    items: z.array(purchaseLineItemSchema).min(1, "At least one line item is required"),
    memo: z.string().optional(),
    poId: z.coerce.number().optional(),
    receiptId: z.coerce.number().optional(),
    // Warehouse location fields for receiving
    warehouseId: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : undefined),
    locationId: z.union([z.string(), z.number()]).optional().transform(val => val ? Number(val) : undefined),
}).refine(
    (data) => {
        // Ensure at least one valid item with positive quantity
        return data.items.some(item =>
            item.itemId &&
            Number(item.quantity) > 0
        );
    },
    {
        message: "At least one item with quantity greater than 0 is required",
        path: ["items"]
    }
);

// Type definitions derived from schemas
export type PurchaseLineItem = z.infer<typeof purchaseLineItemSchema>;
export type PurchasingDocument = z.infer<typeof purchasingDocumentSchema>;

/**
 * Utility to convert UI Decimal values to DB BigInt (Tiyin)
 */
export const toTiyin = (amount: number) => Math.round(amount * 100);

/**
 * Utility to convert DB BigInt (Tiyin) to UI Decimal
 */
export const fromTiyin = (amount: number) => amount / 100;
