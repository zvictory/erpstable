# PDF Generation - Quick Reference Card

**⚡ TL;DR:** Production-ready PDF system for invoices with multi-language support and Cyrillic rendering.

---

## 📦 Quick Usage

### Add Download Button

```typescript
import { DownloadInvoicePdfButton } from '@/components/sales/DownloadInvoicePdfButton';

// Icon variant (compact)
<DownloadInvoicePdfButton invoiceId={123} variant="icon" size="sm" />

// Button variant (full button)
<DownloadInvoicePdfButton invoiceId={123} variant="button" size="md" />
```

### Call Server Action

```typescript
import { generateInvoicePdf } from '@/app/actions/documents';

const result = await generateInvoicePdf(invoiceId, 'ru');

if (result.success) {
  // result.pdfBase64 - Base64-encoded PDF
  // result.filename - "invoice-INV-XXX.pdf"
}
```

---

## 🗂️ File Locations

| Component | Path |
|-----------|------|
| PDF Layout | `src/components/pdf/InvoicePdf.tsx` |
| Font Config | `src/components/pdf/PdfFontConfig.ts` |
| Server Action | `src/app/actions/documents.ts` |
| Download Button | `src/components/sales/DownloadInvoicePdfButton.tsx` |
| Translations | `messages/{locale}.json` → `sales.pdf.*` |

---

## 🌍 Supported Locales

| Locale | Code | Example Label |
|--------|------|---------------|
| Russian | `ru` | "СЧЕТ" |
| English | `en` | "INVOICE" |
| Uzbek | `uz` | "HISOB-FAKTURA" |
| Turkish | `tr` | "FATURA" |

---

## 🎨 Creating New PDF Types

### 1. Create Layout Component

```typescript
// src/components/pdf/MyDocumentPdf.tsx
import { Document, Page, Text, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { fontFamily: 'Roboto', padding: 40 },  // MUST use Roboto for Cyrillic
});

export function MyDocumentPdf({ data, labels }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text>{labels.title}</Text>
      </Page>
    </Document>
  );
}
```

### 2. Create Server Action

```typescript
// src/app/actions/documents.ts
export async function generateMyDocumentPdf(
  id: number,
  locale: string = 'ru'
): Promise<GeneratePdfResult> {
  // 1. Fetch data
  const data = await db.query.myTable.findFirst({ where: eq(myTable.id, id) });

  // 2. Get translations
  const t = await getTranslations({ locale, namespace: 'my-module.pdf' });
  const labels = { title: t('title') };

  // 3. Register fonts
  registerPdfFonts();

  // 4. Render
  const pdfElement = React.createElement(MyDocumentPdf, { data, labels });
  const stream = await renderToStream(pdfElement);

  // 5. Convert to Base64
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const pdfBase64 = Buffer.concat(chunks).toString('base64');

  return { success: true, pdfBase64, filename: `my-doc-${id}.pdf` };
}
```

### 3. Add Translations

```json
// messages/ru.json
{
  "my-module": {
    "pdf": {
      "title": "Мой Документ",
      "label1": "Значение 1"
    }
  }
}
```

### 4. Create Download Button

```typescript
// src/components/my-module/DownloadMyDocButton.tsx
'use client';
import { generateMyDocumentPdf } from '@/app/actions/documents';

export function DownloadMyDocButton({ id }: { id: number }) {
  const handleClick = async () => {
    const result = await generateMyDocumentPdf(id, 'ru');
    if (result.success) {
      // Create Blob and download (see DownloadInvoicePdfButton.tsx for full code)
    }
  };

  return <button onClick={handleClick}>Download</button>;
}
```

---

## 🔧 Common Patterns

### Currency Formatting (Tiyin → UZS)

```typescript
function formatCurrency(tiyin: number): string {
  const uzs = tiyin / 100;  // 100 Tiyin = 1 UZS
  return new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    minimumFractionDigits: 0,
  }).format(uzs);
}
```

### Date Formatting

```typescript
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date));
}
```

### Striped Table Rows

```typescript
{items.map((item, index) => (
  <View
    key={item.id}
    style={[
      styles.tableRow,
      index % 2 === 1 ? styles.tableRowStriped : {},
    ]}
  >
    <Text>{item.name}</Text>
  </View>
))}
```

---

## ⚠️ Common Gotchas

| Problem | Solution |
|---------|----------|
| Russian text shows as □□□ | Use `fontFamily: 'Roboto'` in StyleSheet |
| PDF won't download | Check `result.success` and `result.error` |
| "Font not found" error | Call `registerPdfFonts()` before `renderToStream()` |
| Long text overflows | Add `flexWrap: 'wrap'` and `maxWidth` to style |
| Build fails with font error | Don't register fonts at module level (only in functions) |

---

## 🚀 Performance Tips

1. **Add Database Indexes**
   ```sql
   CREATE INDEX idx_invoices_customer ON invoices(customerId);
   ```

2. **Use Relations for Eager Loading**
   ```typescript
   const invoice = await db.query.invoices.findFirst({
     with: { customer: true, lines: { with: { item: true } } },
   });
   ```

3. **Cache Paid Invoices** (immutable)
   ```typescript
   if (invoice.status === 'paid') {
     const cached = await cache.get(`pdf:${invoiceId}`);
     if (cached) return cached;
   }
   ```

---

## 🎨 Styling Reference

### Layout Utilities

```typescript
flexDirection: 'row' | 'column'
justifyContent: 'flex-start' | 'center' | 'flex-end' | 'space-between'
alignItems: 'flex-start' | 'center' | 'flex-end'
padding: number  // Or paddingTop, paddingHorizontal, etc.
margin: number   // Or marginTop, marginBottom, etc.
```

### Typography

```typescript
fontSize: 10           // Base size
fontWeight: 300 | 400 | 500 | 700  // Must match registered font weights
color: '#1e293b'      // Hex colors
textAlign: 'left' | 'center' | 'right'
```

### Colors (Stable ERP Palette)

```typescript
'#0f172a'  // Primary text (slate-900)
'#475569'  // Secondary text (slate-600)
'#64748b'  // Tertiary text (slate-500)
'#f8fafc'  // Light background (slate-50)
'#e2e8f0'  // Border (slate-200)
'#1e293b'  // Dark accent (slate-800)
```

---

## 📝 Translation Key Pattern

```json
{
  "module": {
    "pdf": {
      "documentTitle": "Translation",
      "section": {
        "nestedKey": "Nested Translation"
      },
      "status": {
        "pending": "Status Value"
      }
    }
  }
}
```

**Usage:**
```typescript
const t = await getTranslations({ locale, namespace: 'module.pdf' });
t('documentTitle')           // → "Translation"
t('section.nestedKey')       // → "Nested Translation"
t('status.pending')          // → "Status Value"
```

---

## 🔍 Debugging Checklist

When PDFs fail to generate:

- [ ] Check `result.success` is `true`
- [ ] Log `result.error` if `false`
- [ ] Verify invoice exists in database
- [ ] Confirm `registerPdfFonts()` called before render
- [ ] Check all StyleSheet uses `fontFamily: 'Roboto'`
- [ ] Verify translation keys exist in messages file
- [ ] Test with simple invoice (few items) first
- [ ] Check browser console for client-side errors
- [ ] Verify Base64 string is valid (not null/undefined)

---

## 📦 Dependencies

```json
{
  "@react-pdf/renderer": "^4.3.2",
  "pdfkit": "^0.14.0",
  "@types/pdfkit": "^0.13.3"  // devDependency
}
```

**CDN Font URLs:**
- Roboto Light (300): `cdnjs.cloudflare.com/.../roboto-light-webfont.ttf`
- Roboto Regular (400): `cdnjs.cloudflare.com/.../roboto-regular-webfont.ttf`
- Roboto Medium (500): `cdnjs.cloudflare.com/.../roboto-medium-webfont.ttf`
- Roboto Bold (700): `cdnjs.cloudflare.com/.../roboto-bold-webfont.ttf`

---

## 🎓 Learning Resources

- **@react-pdf Docs**: https://react-pdf.org/
- **Live Playground**: https://react-pdf.org/repl
- **Roboto Font**: https://fonts.google.com/specimen/Roboto
- **next-intl**: https://next-intl-docs.vercel.app/

---

## 📞 Need Help?

1. Check [Troubleshooting](#-common-gotchas)
2. Review full guide: `PDF_GENERATION_SYSTEM_GUIDE.md`
3. Examine working code: `src/components/pdf/InvoicePdf.tsx`
4. Test with existing button: Sales → Customers → Download Invoice

---

**Last Updated:** 2026-01-27
