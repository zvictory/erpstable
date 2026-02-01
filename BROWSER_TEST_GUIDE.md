# Browser Testing Guide - Production Inventory Availability Check

## ✅ Dev Server Status
**Status:** Running on http://localhost:3000
**Compilation:** Successful, no errors

---

## 🧪 Test Scenarios

### Prerequisites
1. Navigate to: **http://localhost:3000/en/production/terminal**
2. Login if required
3. You should see the Production Terminal with 3-step wizard

---

## Test Case 1: ⚠️ Insufficient Inventory Warning

**Objective:** Verify warning appears when selecting raw material with low inventory

**Steps:**
1. On **Step 1: Ingredients**, click "Select Ingredient" dropdown
2. Select one of these items with **LOW inventory**:
   - **Клубника** (Item #5) - Has only **5 kg** available
   - **Вишня** (Item #9) - Has only **5 kg** available
   - **Ананас** (Item #7) - Has only **5 kg** available

3. In the **Qty (kg)** field, enter: **100**
4. Click outside the quantity field (onBlur trigger)

**Expected Result:**
```
┌─────────────────────────────────────────────┐
│ ⚠️ Insufficient Inventory                   │
│ Available: 5.00 kg | Required: 100.00 kg    │
│ Short by: 95.00 kg                          │
└─────────────────────────────────────────────┘
```

- Amber warning box appears immediately
- Shows exact available quantity
- Shows required quantity
- Shows shortage amount
- Warning is NON-BLOCKING (you can still proceed to Step 2)

---

## Test Case 2: ✅ Sufficient Inventory (No Warning)

**Objective:** Verify NO warning when sufficient inventory exists

**Steps:**
1. Click "+ Add Ingredient" to add another row
2. Select one of these items with **HIGH inventory**:
   - **Мороженое Шоколад** (Item #4) - Has **165 kg** available
   - **Йогурт** (Item #6) - Has **128 kg** available
   - **Банан** (Item #8) - Has **110 kg** available

3. In the **Qty (kg)** field, enter: **50**
4. Click outside the quantity field

**Expected Result:**
- ✅ **NO warning appears**
- Input row looks normal (slate background, no amber box)
- Can proceed to next step without issues

---

## Test Case 3: 🔄 Warning Clears When Adjusting Quantity

**Objective:** Verify warning disappears when reducing quantity

**Steps:**
1. Use the row from Test Case 1 (with insufficient inventory warning)
2. Change the **Qty (kg)** from **100** to **3**
3. Click outside the quantity field

**Expected Result:**
- ⚠️ Warning **disappears immediately**
- Row returns to normal appearance
- Available inventory (5 kg) is now sufficient for required (3 kg)

---

## Test Case 4: 🚫 Zero Inventory Item

**Objective:** Verify warning for items with no inventory

**Steps:**
1. Click "+ Add Ingredient"
2. Select one of these items with **ZERO inventory**:
   - **Raw Apple** (Item #1) - Has **0 kg**
   - **Foil Pouch** (Item #2) - Has **0 kg**
   - **Apple Chips** (Item #3) - Has **0 kg**

3. Enter any quantity, e.g., **10**
4. Click outside the quantity field

**Expected Result:**
```
┌─────────────────────────────────────────────┐
│ ⚠️ Insufficient Inventory                   │
│ Available: 0.00 kg | Required: 10.00 kg     │
│ Short by: 10.00 kg                          │
└─────────────────────────────────────────────┘
```

---

## Test Case 5: 🎯 Multiple Ingredients with Mixed Availability

**Objective:** Verify independent warnings per ingredient

**Steps:**
1. Add 3 ingredients:
   - Row 1: **Банан** (110 kg available) → Qty: **50** ✅ No warning
   - Row 2: **Клубника** (5 kg available) → Qty: **20** ⚠️ Warning
   - Row 3: **Йогурт** (128 kg available) → Qty: **100** ✅ No warning

**Expected Result:**
- Only Row 2 shows warning
- Rows 1 and 3 look normal
- Each ingredient tracks warnings independently

---

## Test Case 6: 🔄 Changing Item Selection

**Objective:** Verify warning updates when changing item

**Steps:**
1. Select **Клубника** (5 kg) → Qty: **100** (warning appears)
2. Change dropdown to **Банан** (110 kg) (keep qty at 100)
3. Observe warning

**Expected Result:**
- ⚠️ Warning **disappears** when switching to Банан
- Because 110 kg > 100 kg (sufficient)

---

## Test Case 7: ✅ Non-Blocking: Can Still Submit

**Objective:** Verify warning doesn't prevent form submission

**Steps:**
1. Leave the insufficient inventory warning visible (Test Case 1)
2. Click **"Next Step"** button to go to Step 2
3. Proceed through Step 2 (Operations Cost)
4. Click **"Next Step"** to go to Step 3
5. Fill in Output details
6. Click **"Commit Run"**

**Expected Result:**
- ⚠️ Steps 1-3 allow progression despite warning
- ✅ At Step 3 "Commit Run", **authoritative validation runs**
- ❌ Error appears: **"Insufficient inventory for Item #5. Missing XX"**
- This confirms:
  - Early warning = UX hint (non-blocking)
  - Final validation = authoritative (blocking)

---

## Test Case 8: 🧹 Warning Clears on Empty Selection

**Objective:** Verify warning disappears when deselecting item

**Steps:**
1. Have a row with insufficient inventory warning
2. Change dropdown to **"Select Ingredient"** (value = 0)

**Expected Result:**
- ⚠️ Warning **clears immediately**
- Row shows empty state

---

## UI/UX Verification Checklist

### Visual Design
- [ ] Warning box has **amber background** (`bg-amber-50`)
- [ ] Warning box has **amber border** (`border-amber-200`)
- [ ] Warning icon is **⚠️** emoji
- [ ] Warning text is **amber-700** (header) and **amber-600** (details)
- [ ] Warning appears **below** the ingredient row (not overlapping)

### Behavior
- [ ] Warning appears **immediately** after onBlur (quantity) or onChange (item)
- [ ] Warning is **per-ingredient** (independent tracking)
- [ ] Warning is **non-blocking** (can still proceed to next step)
- [ ] Warning shows **exact values** with 2 decimal places
- [ ] Warning clears when quantity becomes sufficient
- [ ] Warning clears when item deselected (value = 0)

### Performance
- [ ] No visible lag when changing item selection
- [ ] Quantity input uses **onBlur** (check happens after typing completes)
- [ ] Item select uses **onChange** (check happens immediately)
- [ ] No console errors in browser DevTools

---

## DevTools Console Check

Open browser DevTools (F12) and check Console tab:

**Expected:**
- ✅ No errors related to `checkInventoryAvailability`
- ✅ No React hydration errors
- ✅ No 500 server errors
- ⚠️ You might see `console.error` if invalid input is tested (expected behavior)

---

## Network Tab Verification

Open DevTools → Network tab, filter by "production":

**When changing item or quantity:**
- ✅ Should see POST request to server action
- ✅ Response should be JSON with structure:
  ```json
  {
    "available": 5.0,
    "isValid": false,
    "shortage": 95.0,
    "layers": [...]
  }
  ```

---

## Database Inventory Reference

For your testing convenience, here's current inventory:

| Item ID | Item Name | Available (kg) |
|---------|-----------|----------------|
| 4 | Мороженое Шоколад | **165** ✅ |
| 6 | Йогурт | **128** ✅ |
| 8 | Банан | **110** ✅ |
| 5 | Клубника | **5** ⚠️ |
| 7 | Ананас | **5** ⚠️ |
| 9 | Вишня | **5** ⚠️ |
| 1 | Raw Apple | **0** ❌ |
| 2 | Foil Pouch | **0** ❌ |
| 3 | Apple Chips | **0** ❌ |
| 10 | Киви | **0** ❌ |

---

## Success Criteria Summary

✅ **Implementation is successful if:**

1. ⚠️ Warning appears when quantity exceeds available inventory
2. ✅ Warning disappears when quantity is reduced to sufficient level
3. 🎨 Warning has amber styling (not red)
4. 🚀 Warning appears immediately after input (< 1 second)
5. 🔓 Warning is non-blocking (can still proceed)
6. 🎯 Each ingredient tracks warnings independently
7. ✅ Final commit validation still catches errors (transactional safety)
8. 🐛 No console errors or React errors

---

## Troubleshooting

### Warning Not Appearing?
- Check browser console for errors
- Verify dev server is running: http://localhost:3000
- Ensure you clicked **outside** the quantity input (onBlur trigger)
- Check Network tab for failed requests

### Warning Not Clearing?
- Verify quantity is **less than** available inventory
- Click outside the input field (onBlur)
- Try changing the item selection (onChange)

### Server Action Error?
- Check `/tmp/dev-server.log` for server errors
- Verify database exists: `ls -lh db/data.db`
- Check if inventory_layers table has data

---

## Next Steps After Testing

If all tests pass:
- ✅ Mark implementation as verified
- ✅ Create git commit with changes
- ✅ Consider adding translations (if needed)
- ✅ Document for team/users

If issues found:
- 🐛 Note specific test case that failed
- 🔍 Check browser console for errors
- 📝 Provide error messages/screenshots
- 🔧 I'll help debug and fix

---

**Happy Testing! 🎉**
