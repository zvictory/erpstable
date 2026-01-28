# PDF Generation System - Complete Guide

**Status:** ✅ **PRODUCTION READY**
**Last Updated:** 2026-01-27

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Deep Dive](#architecture-deep-dive)
3. [File Structure](#file-structure)
4. [How to Use](#how-to-use)
5. [Code Walkthrough](#code-walkthrough)
6. [Testing Guide](#testing-guide)
7. [Extending the System](#extending-the-system)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 System Overview

The Stable ERP PDF Generation System is a **production-ready, server-side PDF rendering engine** that generates professional, localized invoice PDFs with full Cyrillic (Russian) text support.

### Key Features

✅ **Multi-Language Support** - 4 locales (Russian, English, Uzbek, Turkish)
✅ **Cyrillic Text Rendering** - Roboto font with full Russian character support
✅ **Professional Layout** - Invoice-style template with header, items table, totals, bank details
✅ **Server-Side Generation** - Secure, efficient PDF creation via Server Actions
✅ **Type Safety** - Full TypeScript coverage with Drizzle ORM integration
✅ **Client Downloads** - One-click download with loading states and error handling
✅ **Currency Formatting** - Proper Tiyin → UZS conversion (100 Tiyin = 1 UZS)

### Tech Stack

- **@react-pdf/renderer** (v4.3.2) - React component-based PDF generation
- **Roboto Font** (CDN) - Google's font with Cyrillic support
- **next-intl** - Server-side translations
- **Drizzle ORM** - Type-safe database queries
- **Next.js Server Actions** - Secure server-side execution

---

## 🏗️ Architecture Deep Dive

### The Flow: Button Click → PDF Download

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT SIDE (Browser)                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User clicks Download Button                                │
│     Component: DownloadInvoicePdfButton.tsx                    │
│                                                                 │
│  2. handleDownload() calls Server Action                       │
│     Action: generateInvoicePdf(invoiceId, locale)              │
│                                ↓                                │
└────────────────────────────────┼────────────────────────────────┘
                                 │
┌────────────────────────────────┼────────────────────────────────┐
│  SERVER SIDE (Next.js Runtime) │                                │
├────────────────────────────────┴────────────────────────────────┤
│                                                                 │
│  3. Server Action: generateInvoicePdf()                        │
│     File: src/app/actions/documents.ts                         │
│                                                                 │
│     a) Fetch invoice from database (with customer + items)     │
│        → Drizzle ORM query with joins                          │
│                                                                 │
│     b) Load translations for current locale                    │
│        → getTranslations({ locale, namespace: 'sales.pdf' })   │
│                                                                 │
│     c) Register Roboto fonts for Cyrillic support              │
│        → PdfFontConfig.registerPdfFonts()                      │
│                                                                 │
│     d) Render React component to PDF stream                    │
│        → InvoicePdf component with data + labels               │
│        → renderToStream() converts React → PDF bytes           │
│                                                                 │
│     e) Convert stream to Buffer → Base64 string                │
│        → Safe for JSON transmission over Server Action         │
│                                                                 │
│     f) Return: { success, pdfBase64, filename }                │
│                                ↓                                │
└────────────────────────────────┼────────────────────────────────┘
                                 │
┌────────────────────────────────┼────────────────────────────────┐
│  CLIENT SIDE (Browser)         │                                │
├────────────────────────────────┴────────────────────────────────┤
│                                                                 │
│  4. Convert Base64 → Blob                                      │
│     const blob = new Blob([bytes], { type: 'application/pdf' })│
│                                                                 │
│  5. Create temporary download link                             │
│     const url = URL.createObjectURL(blob)                      │
│     link.download = filename                                   │
│     link.click()                                               │
│                                                                 │
│  6. Cleanup and show PDF to user                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Why This Architecture?

1. **Server-Side Rendering**: PDF generation libraries are heavy (~2-3MB). Running on server keeps client bundle small.

2. **Base64 Transmission**: Server Actions return JSON-serializable data. Binary PDF data is encoded as Base64 string for safe transmission.

3. **Stream-to-Buffer**: `renderToStream()` is memory-efficient for large PDFs. We collect chunks and convert to Buffer for Base64 encoding.

4. **Font Registration**: Roboto fonts are loaded once on server startup (idempotent). Default PDF fonts (Helvetica, Times) don't support Cyrillic - Russian text would render as `□□□`.

5. **Localization at Server**: Translations are resolved server-side using `getTranslations()`, avoiding client-side bundle bloat and ensuring consistency.

---

## 📁 File Structure

```
src/
├── components/
│   ├── pdf/
│   │   ├── InvoicePdf.tsx              ← PDF Layout Component (React)
│   │   └── PdfFontConfig.ts            ← Font Registration (Roboto CDN)
│   │
│   └── sales/
│       ├── DownloadInvoicePdfButton.tsx   ← Client Button Component
│       └── customer-center/
│           └── CustomerProfile.tsx         ← Integration (shows button)
│
├── app/
│   └── actions/
│       └── documents.ts                ← Server Action (generateInvoicePdf)
│
└── db/
    └── schema/
        ├── sales.ts                    ← Invoice schema
        └── inventory.ts                ← Item schema

messages/
├── ru.json                             ← Russian translations (sales.pdf.*)
├── en.json                             ← English translations
├── uz.json                             ← Uzbek translations
└── tr.json                             ← Turkish translations

package.json
├── @react-pdf/renderer: ^4.3.2         ← PDF rendering library
└── pdfkit: ^0.14.0                     ← PDF generation core
```

---

## 🚀 How to Use

### For End Users

**Step 1:** Navigate to Sales → Customers

**Step 2:** Click on a customer to view their profile

**Step 3:** Scroll to "Transaction History" section

**Step 4:** Find an invoice row, click the download icon (📥)

**Step 5:** PDF will download automatically with filename: `invoice-INV-XXX.pdf`

### For Developers (Programmatic Usage)

#### 1. Add Download Button to Any Component

```typescript
import { DownloadInvoicePdfButton } from '@/components/sales/DownloadInvoicePdfButton';

export function MyInvoiceList() {
  return (
    <div>
      {invoices.map(invoice => (
        <div key={invoice.id}>
          <span>{invoice.invoiceNumber}</span>

          {/* Icon variant (small, hover effect) */}
          <DownloadInvoicePdfButton
            invoiceId={invoice.id}
            variant="icon"
            size="sm"
          />

          {/* OR Button variant (full button with text) */}
          <DownloadInvoicePdfButton
            invoiceId={invoice.id}
            variant="button"
            size="md"
            className="mt-2"
          />
        </div>
      ))}
    </div>
  );
}
```

#### 2. Call Server Action Directly

```typescript
'use server';

import { generateInvoicePdf } from '@/app/actions/documents';

export async function myCustomAction(invoiceId: number) {
  // Generate PDF for Russian locale
  const result = await generateInvoicePdf(invoiceId, 'ru');

  if (result.success) {
    // result.pdfBase64 contains the Base64-encoded PDF
    // result.filename contains suggested filename (e.g., "invoice-INV-123.pdf")

    // Example: Send via email
    await sendEmailWithPdfAttachment({
      to: 'customer@example.com',
      subject: 'Your Invoice',
      attachments: [{
        filename: result.filename,
        content: result.pdfBase64,
        encoding: 'base64',
        contentType: 'application/pdf',
      }],
    });
  } else {
    console.error('PDF generation failed:', result.error);
  }
}
```

#### 3. Create Custom PDF Layout

```typescript
// src/components/pdf/PurchaseOrderPdf.tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Roboto',  // IMPORTANT: Use Roboto for Cyrillic support
    fontSize: 10,
    padding: 40,
  },
  // ... your styles
});

interface PurchaseOrderPdfProps {
  order: PurchaseOrder;
  vendor: Vendor;
  labels: PdfLabels;
}

export function PurchaseOrderPdf({ order, vendor, labels }: PurchaseOrderPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text>{labels.title}</Text>
        {/* Your layout here */}
      </Page>
    </Document>
  );
}
```

```typescript
// src/app/actions/documents.ts (add new function)
export async function generatePurchaseOrderPdf(
  orderId: number,
  locale: string = 'ru'
): Promise<GeneratePdfResult> {
  try {
    // 1. Fetch order data
    const order = await db.query.purchaseOrders.findFirst({
      where: eq(purchaseOrders.id, orderId),
      with: { vendor: true, lines: true },
    });

    // 2. Get translations
    const t = await getTranslations({ locale, namespace: 'purchasing.pdf' });
    const labels = {
      title: t('purchaseOrder'),
      // ... other labels
    };

    // 3. Register fonts (idempotent)
    registerPdfFonts();

    // 4. Render to stream
    const pdfElement = React.createElement(PurchaseOrderPdf, {
      order,
      vendor: order.vendor,
      labels,
    });
    const stream = await renderToStream(pdfElement as any);

    // 5. Convert to Base64
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const pdfBase64 = Buffer.concat(chunks).toString('base64');

    return {
      success: true,
      pdfBase64,
      filename: `PO-${order.orderNumber}.pdf`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

---

## 🔍 Code Walkthrough

### 1. Font Configuration (PdfFontConfig.ts)

```typescript
import { Font } from '@react-pdf/renderer';

export const registerPdfFonts = () => {
  Font.register({
    family: 'Roboto',
    fonts: [
      { src: 'https://cdnjs.cloudflare.com/.../roboto-light-webfont.ttf', fontWeight: 300 },
      { src: 'https://cdnjs.cloudflare.com/.../roboto-regular-webfont.ttf', fontWeight: 400 },
      { src: 'https://cdnjs.cloudflare.com/.../roboto-medium-webfont.ttf', fontWeight: 500 },
      { src: 'https://cdnjs.cloudflare.com/.../roboto-bold-webfont.ttf', fontWeight: 700 },
    ],
  });
};
```

**Key Points:**
- Roboto is chosen for its comprehensive Cyrillic support
- CDN-hosted fonts (no local files needed)
- 4 weights registered (300, 400, 500, 700) for typography variety
- Idempotent operation (safe to call multiple times)

**Why not default PDF fonts?**
- Standard PDF fonts (Helvetica, Times, Courier) are Latin-only
- Russian text like "Счет" would render as □□□□
- Roboto includes full Cyrillic Unicode range (U+0400-U+04FF)

---

### 2. PDF Layout Component (InvoicePdf.tsx)

**Key Patterns:**

#### StyleSheet Definition
```typescript
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Roboto',  // Critical for Cyrillic
    fontSize: 10,
    paddingTop: 30,
    paddingBottom: 60,
    paddingHorizontal: 40,
  },
  // ... 30+ style definitions
});
```

#### Striped Table Rows
```typescript
{items.map((item, index) => (
  <View
    key={item.id}
    style={[
      styles.tableRow,
      index % 2 === 1 ? styles.tableRowStriped : {},  // Alternating colors
    ]}
  >
    <Text style={styles.colItem}>{item.item?.name}</Text>
    {/* ... other columns */}
  </View>
))}
```

#### Currency Formatting
```typescript
function formatCurrency(tiyin: number): string {
  const uzs = tiyin / 100;  // Convert Tiyin to UZS
  return new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(uzs);
}
```

**Why divide by 100?**
- Database stores amounts in smallest currency unit (Tiyin)
- 1 UZS = 100 Tiyin (like cents to dollars)
- Prevents floating-point errors in calculations
- PDF displays human-readable UZS format (e.g., "500 000 UZS")

---

### 3. Server Action (documents.ts)

**Flow Breakdown:**

```typescript
export async function generateInvoicePdf(
  invoiceId: number,
  locale: string = 'ru'
): Promise<GeneratePdfResult> {
  try {
    // STEP 1: Fetch invoice data
    const invoice = await db.select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    // STEP 2: Fetch customer data
    const customer = await db.select()
      .from(customers)
      .where(eq(customers.id, invoice[0].customerId))
      .limit(1);

    // STEP 3: Fetch invoice lines with items (JOIN)
    const lines = await db.select({
        // ... fields
        item: {
          id: items.id,
          name: items.name,
          sku: items.sku,
        },
      })
      .from(invoiceLines)
      .leftJoin(items, eq(invoiceLines.itemId, items.id))
      .where(eq(invoiceLines.invoiceId, invoiceId));

    // STEP 4: Load translations (server-side)
    const t = await getTranslations({ locale, namespace: 'sales.pdf' });
    const labels = {
      companyName: t('companyName'),  // "Stable ERP" (all locales)
      invoice: t('invoice'),          // "СЧЕТ" (ru) / "INVOICE" (en)
      // ... 20+ labels
    };

    // STEP 5: Register fonts (idempotent)
    registerPdfFonts();

    // STEP 6: Render React component → PDF stream
    const pdfElement = React.createElement(InvoicePdf, {
      invoice: invoice[0],
      customer: customer[0],
      items: lines,
      labels,
    });
    const stream = await renderToStream(pdfElement as any);

    // STEP 7: Collect stream chunks into Buffer
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    // STEP 8: Convert to Base64 for JSON transmission
    const pdfBase64 = pdfBuffer.toString('base64');

    // STEP 9: Return success result
    return {
      success: true,
      pdfBase64,
      filename: `invoice-${invoice[0].invoiceNumber}.pdf`,
    };

  } catch (error) {
    // STEP 10: Error handling
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

**Why separate DB queries instead of one query with relations?**
- Drizzle doesn't support nested `with` for complex joins in all cases
- Explicit queries give more control over selected fields
- Easier to debug if one relation fails
- Performance is fine (3 queries with indexes vs. 1 complex join)

---

### 4. Client Download Component (DownloadInvoicePdfButton.tsx)

**Key Implementation Details:**

```typescript
const handleDownload = async (e: React.MouseEvent) => {
  e.stopPropagation();  // Prevent row click if button is in table

  try {
    setIsDownloading(true);

    // Call Server Action
    const result = await generateInvoicePdf(invoiceId, locale);

    if (!result.success || !result.pdfBase64) {
      throw new Error(result.error || 'Failed to generate PDF');
    }

    // Decode Base64 → Blob
    const binaryString = atob(result.pdfBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'application/pdf' });

    // Trigger download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();

    // Cleanup (prevent memory leaks)
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  } catch (error) {
    alert(error instanceof Error ? error.message : 'Failed to download PDF');
  } finally {
    setIsDownloading(false);
  }
};
```

**Two Variants:**

1. **Icon variant** (default): Small download icon with hover effect
   - Used in compact spaces (table cells)
   - Minimal UI footprint

2. **Button variant**: Full button with text and icon
   - Used in detail pages
   - More discoverable for users

---

## 🧪 Testing Guide

### Manual Testing

#### Test 1: Basic PDF Generation (Russian)
```bash
# 1. Start dev server
npm run dev

# 2. Navigate to Customer Center
# http://localhost:3000/ru/sales/customers

# 3. Select any customer with invoices

# 4. Click download icon next to an invoice

# 5. Verify:
# - PDF downloads with correct filename (invoice-INV-XXX.pdf)
# - Opens without errors
# - Russian text renders correctly (not □□□)
# - All invoice data is present
# - Currency formatted as "XXX XXX UZS" (with spaces)
# - Dates formatted as "DD.MM.YYYY"
```

#### Test 2: Localization (All Locales)
```bash
# 1. Switch to English locale
# http://localhost:3000/en/sales/customers

# 2. Download same invoice

# 3. Verify:
# - Labels are in English ("INVOICE" not "СЧЕТ")
# - Data is same (invoice number, amounts)
# - Date format changes to US standard (MM/DD/YYYY)

# 4. Repeat for Uzbek (uz) and Turkish (tr) locales
```

#### Test 3: Edge Cases
```bash
# Test Case A: Invoice with no customer address
# - PDF should skip address section gracefully

# Test Case B: Invoice with 20+ line items
# - PDF should handle multiple pages (if implemented)
# - Check for overflow or truncation

# Test Case C: Invoice with very long item names
# - Text should wrap or truncate (check styles)

# Test Case D: Invoice with zero subtotal
# - Verify "0 UZS" displays correctly
```

### Automated Testing (Future)

```typescript
// tests/pdf-generation.test.ts
import { generateInvoicePdf } from '@/app/actions/documents';
import { db } from '../../../db';

describe('PDF Generation', () => {
  it('generates PDF for valid invoice', async () => {
    const result = await generateInvoicePdf(1, 'ru');

    expect(result.success).toBe(true);
    expect(result.pdfBase64).toBeDefined();
    expect(result.filename).toMatch(/^invoice-INV-\d+\.pdf$/);

    // Verify Base64 is valid PDF (starts with %PDF header)
    const pdfHeader = Buffer.from(result.pdfBase64!, 'base64').toString('ascii', 0, 4);
    expect(pdfHeader).toBe('%PDF');
  });

  it('handles missing invoice gracefully', async () => {
    const result = await generateInvoicePdf(999999, 'ru');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invoice not found');
  });

  it('supports all locales', async () => {
    const locales = ['ru', 'en', 'uz', 'tr'];

    for (const locale of locales) {
      const result = await generateInvoicePdf(1, locale);
      expect(result.success).toBe(true);
    }
  });
});
```

---

## 🛠️ Extending the System

### Adding New PDF Types

**1. Purchase Orders**

```typescript
// src/components/pdf/PurchaseOrderPdf.tsx
export function PurchaseOrderPdf({ order, vendor, labels }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Similar structure to InvoicePdf */}
        <Text>{labels.purchaseOrder}</Text>
        {/* ... */}
      </Page>
    </Document>
  );
}

// src/app/actions/documents.ts
export async function generatePurchaseOrderPdf(
  orderId: number,
  locale: string = 'ru'
): Promise<GeneratePdfResult> {
  // Similar to generateInvoicePdf
}

// messages/ru.json
{
  "purchasing": {
    "pdf": {
      "purchaseOrder": "ЗАКАЗ ПОСТАВЩИКУ",
      // ... other labels
    }
  }
}
```

**2. Payment Receipts**

```typescript
// src/components/pdf/PaymentReceiptPdf.tsx
export function PaymentReceiptPdf({ payment, customer, labels }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text>{labels.receipt}</Text>
        <Text>{labels.amountPaid}: {formatCurrency(payment.amount)}</Text>
        {/* ... */}
      </Page>
    </Document>
  );
}
```

**3. Customer Statements**

```typescript
// src/components/pdf/CustomerStatementPdf.tsx
export function CustomerStatementPdf({
  customer,
  invoices,
  payments,
  dateRange,
  labels
}: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text>{labels.statement}</Text>
        <Text>{labels.period}: {dateRange.from} - {dateRange.to}</Text>

        {/* Table of invoices */}
        {/* Table of payments */}
        {/* Total balance due */}
      </Page>
    </Document>
  );
}
```

---

### Customization Options

#### Adding Company Logo

```typescript
// src/components/pdf/InvoicePdf.tsx
import { Image } from '@react-pdf/renderer';

// In header section
<View style={styles.headerLeft}>
  <Image
    src="/logo.png"  // Must be absolute URL or Base64
    style={{ width: 100, height: 40, marginBottom: 10 }}
  />
  <Text style={styles.companyName}>{labels.companyName}</Text>
</View>
```

**Important:** `@react-pdf/renderer` doesn't support relative paths. Options:
1. Use absolute URL (e.g., `https://yoursite.com/logo.png`)
2. Convert logo to Base64 and embed
3. Store logo in public CDN

#### Adding Watermarks

```typescript
// Watermark for DRAFT invoices
const styles = StyleSheet.create({
  watermark: {
    position: 'absolute',
    top: '40%',
    left: '20%',
    fontSize: 80,
    fontWeight: 700,
    color: '#e2e8f0',
    opacity: 0.3,
    transform: 'rotate(-45deg)',
  },
});

// In Page component
{invoice.status === 'draft' && (
  <Text style={styles.watermark}>DRAFT</Text>
)}
```

#### QR Code for Payment

```typescript
import { Image } from '@react-pdf/renderer';

// Generate QR code with payment info
const qrCodeDataUrl = generateQRCode({
  amount: invoice.totalAmount,
  recipient: 'Stable ERP',
  invoice: invoice.invoiceNumber,
});

<Image
  src={qrCodeDataUrl}  // Base64 data URL
  style={{ width: 100, height: 100 }}
/>
```

---

## 🐛 Troubleshooting

### Problem: Russian text shows as boxes (□□□)

**Cause:** Fonts not loaded or wrong font family used

**Solution:**
1. Verify `registerPdfFonts()` is called before `renderToStream()`
2. Check StyleSheet uses `fontFamily: 'Roboto'` (not 'Helvetica' or other)
3. Test font URLs are accessible (CDN not blocked)

```typescript
// Debug font registration
console.log('Fonts registered:', Font.getRegisteredFonts());
// Should output: ['Roboto']
```

---

### Problem: PDF download fails with "Invalid Base64" error

**Cause:** Base64 string corrupted during transmission

**Solution:**
1. Check Server Action returns `success: true`
2. Verify `pdfBase64` is a valid Base64 string (no extra characters)
3. Test with small invoice (few items) first

```typescript
// Debug Base64 length
console.log('Base64 length:', result.pdfBase64?.length);
// Should be ~10k-100k characters depending on PDF size
```

---

### Problem: PDF generation is slow (>5 seconds)

**Cause:** Large invoice or slow database query

**Solution:**
1. Add database indexes on frequently queried columns:
   ```sql
   CREATE INDEX idx_invoices_customer ON invoices(customerId);
   CREATE INDEX idx_invoice_lines_invoice ON invoice_lines(invoiceId);
   ```

2. Use database query optimization:
   ```typescript
   // Instead of multiple queries, use WITH relations
   const invoice = await db.query.invoices.findFirst({
     where: eq(invoices.id, invoiceId),
     with: {
       customer: true,
       lines: { with: { item: true } },
     },
   });
   ```

3. Implement caching (advanced):
   ```typescript
   // Cache PDFs for 1 hour if invoice is paid (immutable)
   if (invoice.status === 'paid') {
     const cachedPdf = await cache.get(`pdf:invoice:${invoiceId}`);
     if (cachedPdf) return cachedPdf;
   }
   ```

---

### Problem: "Font not found" error during build

**Cause:** Font URLs not accessible during build time

**Solution:**
Fonts are loaded at runtime (when PDF is generated), not build time. This error shouldn't occur. If it does:

1. Move font registration to Server Action (not module-level):
   ```typescript
   // ❌ BAD: Module-level execution
   Font.register({ ... });  // Runs during build

   // ✅ GOOD: Inside function
   export const registerPdfFonts = () => {
     Font.register({ ... });  // Runs during request
   };
   ```

2. Ensure fonts are registered before `renderToStream()`:
   ```typescript
   registerPdfFonts();  // Must be called first
   const stream = await renderToStream(...);
   ```

---

### Problem: PDF layout breaks on long text

**Cause:** Text overflow without wrapping

**Solution:**
Add `maxWidth` and `flexWrap` to styles:

```typescript
const styles = StyleSheet.create({
  longText: {
    maxWidth: 200,
    flexWrap: 'wrap',
    overflow: 'hidden',
  },

  // For table cells
  colItem: {
    width: '45%',
    flexWrap: 'wrap',  // Allow text wrapping
  },
});
```

---

### Problem: Multiple pages not rendering correctly

**Cause:** `@react-pdf/renderer` doesn't automatically paginate

**Solution:**
Manually split content into pages:

```typescript
const ITEMS_PER_PAGE = 20;

function splitItemsIntoPages(items: Item[]): Item[][] {
  const pages: Item[][] = [];
  for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
    pages.push(items.slice(i, i + ITEMS_PER_PAGE));
  }
  return pages;
}

// In PDF component
const pages = splitItemsIntoPages(items);

<Document>
  {pages.map((pageItems, pageIndex) => (
    <Page key={pageIndex} size="A4" style={styles.page}>
      {/* Header on every page */}
      <View style={styles.header}>...</View>

      {/* Items for this page */}
      {pageItems.map(item => (
        <View key={item.id} style={styles.tableRow}>...</View>
      ))}

      {/* Footer only on last page */}
      {pageIndex === pages.length - 1 && (
        <View style={styles.footer}>...</View>
      )}
    </Page>
  ))}
</Document>
```

---

## 📚 Additional Resources

### Documentation Links

- **@react-pdf/renderer Docs**: https://react-pdf.org/
- **React PDF Examples**: https://react-pdf.org/repl
- **next-intl Docs**: https://next-intl-docs.vercel.app/
- **Drizzle ORM Docs**: https://orm.drizzle.team/docs/overview
- **Roboto Font**: https://fonts.google.com/specimen/Roboto

### Code Examples

All examples from this guide are available in the codebase:

- **Invoice PDF**: `src/components/pdf/InvoicePdf.tsx`
- **Server Action**: `src/app/actions/documents.ts`
- **Download Button**: `src/components/sales/DownloadInvoicePdfButton.tsx`
- **Integration Example**: `src/components/sales/customer-center/CustomerProfile.tsx`

---

## ✅ Summary

The PDF Generation System is **production-ready** and fully integrated into the Stable ERP Sales workflow. Key capabilities:

✅ Multi-language support (4 locales)
✅ Cyrillic/Russian text rendering
✅ Professional invoice layout
✅ Type-safe implementation
✅ Secure server-side generation
✅ One-click client downloads
✅ Currency & date formatting
✅ Extensible architecture

**No additional implementation required** unless adding new PDF types (Purchase Orders, Statements, etc.).

---

**Last Updated:** 2026-01-27
**Maintainer:** Stable ERP Development Team
**Questions?** Check [Troubleshooting](#troubleshooting) or review code examples.
