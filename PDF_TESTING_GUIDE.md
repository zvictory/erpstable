# 📋 PDF Invoice Generation - Manual Testing Guide

**Dev Server:** http://localhost:3001 ✅ (Running)
**Test Date:** 2026-01-28

---

## 🔐 Step 1: Login

### Available Test Users:
```
Admin User:
  Email: admin@laza.uz
  Role: ADMIN

Accountant User:
  Email: accountant@laza.uz
  Role: ACCOUNTANT
```

**Note:** Check with your team for the password, or reset it if needed.

### Login Steps:
1. Navigate to: http://localhost:3001/ru/
2. If not logged in, you'll see a login page
3. Enter email and password
4. Click "Войти" (Login)

---

## 📊 Step 2: Navigate to Customer Center

### Direct URL:
```
http://localhost:3001/ru/sales/customers
```

### Or via Navigation:
1. From dashboard, click "Продажи" (Sales) in sidebar
2. Click "Клиенты" (Customers)

---

## 🎯 Step 3: Find Test Customer

### Test Data (from database):
```
Customer: "Customer 1 - Retail Chain"
Customer ID: 2
Invoice Number: TEST-PDF-001
Invoice ID: 2
Amount: 5,000 UZS (500,000 tiyin)
Status: unpaid
```

### Steps:
1. In the customer list, find "Customer 1 - Retail Chain"
2. Click on the customer name or row to open their profile

---

## 📥 Step 4: Download PDF

### What to Look For:
Once on the customer profile page, you should see:
1. **Transaction History** section
2. A table with invoices
3. Each invoice row should have a **blue download icon** (📥)

### Download Steps:
1. Find the invoice "TEST-PDF-001" in the transaction history
2. Look for the download icon (Download symbol) next to the invoice number
3. Click the download icon
4. You should see:
   - Icon changes to a **spinning loader** (⏳)
   - Browser downloads a PDF file named: `invoice-TEST-PDF-001.pdf`
   - Download completes (icon returns to normal)

---

## ✅ Step 5: Verify PDF Content

### Open the downloaded PDF and check:

#### ✓ Header Section
- [ ] Company name appears correctly
- [ ] Company address visible
- [ ] Company tax ID (ИНН)
- [ ] Invoice title in Russian: "СЧЕТ"
- [ ] Invoice number: "TEST-PDF-001"
- [ ] Date in format: DD.MM.YYYY
- [ ] Due date in format: DD.MM.YYYY

#### ✓ Bill To Section
- [ ] Customer name: "Customer 1 - Retail Chain"
- [ ] Customer tax ID
- [ ] Customer address
- [ ] Customer phone
- [ ] Customer email

#### ✓ Line Items Table
- [ ] Table header in Russian:
  - "Наименование" (Item)
  - "Кол-во" (Qty)
  - "Цена" (Price)
  - "Сумма" (Amount)
- [ ] Line items displayed with striped rows (alternating background)
- [ ] Quantities align right
- [ ] Prices align right
- [ ] Amounts align right

#### ✓ Totals Section
- [ ] Subtotal label: "Промежуточный итог"
- [ ] Total label: "ИТОГО"
- [ ] Amount shown as: "5 000 UZS" (with space separator, no decimals)
- [ ] Currency symbol: UZS

#### ✓ Footer Section
- [ ] "Банковские реквизиты" (Bank Details) section
- [ ] Bank name displayed
- [ ] MFO (bank code) displayed
- [ ] Account number displayed
- [ ] Two signature blocks:
  - "Директор:" (Director)
  - "Главный бухгалтер:" (Chief Accountant)
- [ ] Signature lines visible

#### ✓ Typography & Layout
- [ ] **CRITICAL:** Russian Cyrillic text renders correctly (no □□□ boxes)
- [ ] Font is clean and readable
- [ ] No text overflow or cutoff
- [ ] Proper spacing and alignment
- [ ] Professional appearance (print-ready)

---

## 🌍 Step 6: Test Other Languages

### Test URLs:
```
English:  http://localhost:3001/en/sales/customers
Uzbek:    http://localhost:3001/uz/sales/customers
Turkish:  http://localhost:3001/tr/sales/customers
```

### For Each Language:
1. Navigate to the customer center in that locale
2. Find the same customer
3. Download the PDF
4. Verify:
   - UI labels are translated
   - Invoice content is in the correct language
   - Numbers and dates format correctly
   - Special characters render (Cyrillic for Russian, etc.)

---

## 🐛 Common Issues & Troubleshooting

### Issue: No Download Icon
**Symptoms:** The download icon doesn't appear next to invoices
**Possible Causes:**
- User role is not ADMIN or ACCOUNTANT
- Invoice type is not 'INVOICE' (might be QUOTE)
- Component not rendered

**Fix:**
1. Verify you're logged in as admin or accountant
2. Check browser console for errors (F12 → Console tab)

### Issue: Download Fails
**Symptoms:** Click icon but no download happens, or error message appears
**Possible Causes:**
- Invoice data is incomplete
- Business settings not configured
- Server action error

**Debug Steps:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Click download icon
4. Look for error messages
5. Check Network tab for failed requests

### Issue: Cyrillic Shows as Squares (□□□)
**Symptoms:** Russian text appears as square boxes
**Possible Causes:**
- Fonts not loading from CDN
- Font registration failed

**Fix:**
1. Check browser console for font loading errors
2. Verify internet connection (fonts load from CDN)
3. Try regenerating the PDF

### Issue: PDF Won't Open
**Symptoms:** Downloaded file can't be opened in PDF reader
**Possible Causes:**
- PDF generation error
- Corrupted base64 conversion

**Debug Steps:**
1. Check file size (should be 10-50 KB typically)
2. If file is 0 bytes or very small, generation failed
3. Check server logs/console for errors

---

## 📸 Expected Screenshot Reference

The download button should look like:
```
┌─────────────────────────────────────────┐
│ Transaction History                     │
├─────────────────────────────────────────┤
│ Date       | Type    | Number | Amount  │
│ 28.01.2026 | Invoice | TEST-  | 5000    │
│            |         | PDF-   | UZS     │
│            |         | 001    | [👁️][📥]│
└─────────────────────────────────────────┘
                                    ↑
                        This is the download button
```

---

## 📝 Test Results Template

```
[ ] Login successful
[ ] Customer center loaded
[ ] Customer profile opened
[ ] Download icon visible
[ ] Download started (loader appeared)
[ ] PDF downloaded successfully
[ ] File size: _____ KB
[ ] PDF opens without errors
[ ] Header: Company info correct
[ ] Header: Invoice details correct
[ ] Bill To: Customer info correct
[ ] Table: Line items displayed
[ ] Table: Calculations correct
[ ] Footer: Bank details visible
[ ] Footer: Signatures visible
[ ] Typography: Cyrillic renders correctly
[ ] Layout: Professional and printable

LANGUAGES TESTED:
[ ] Russian (ru)
[ ] English (en)
[ ] Uzbek (uz)
[ ] Turkish (tr)

ISSUES FOUND:
(List any issues or bugs discovered)

```

---

## 🚀 Next Steps After Testing

### If All Tests Pass:
✅ System is production-ready!
- No code changes needed
- PDF generation working correctly
- Consider testing with real invoice data

### If Issues Found:
1. Document the specific issue
2. Check browser console for errors
3. Report findings with screenshots
4. I'll provide targeted fixes

---

**Testing Time Estimate:** 10-15 minutes for complete verification

**Questions?** If you encounter any issues or need clarification on any step, let me know!
