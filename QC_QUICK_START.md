# QC Approval Workflow - Quick Start Guide

## ✅ Implementation Complete

The QC approval workflow is fully implemented and ready to use!

---

## 🚀 How to Access

### URL
```
http://localhost:3000/{locale}/quality
```

Examples:
- English: http://localhost:3000/en/quality
- Russian: http://localhost:3000/ru/quality
- Uzbek: http://localhost:3000/uz/quality
- Turkish: http://localhost:3000/tr/quality

### Navigation
**Sidebar Menu:** Quality & Maintenance → Quality Control

---

## 👥 Who Can Access?

Only users with these roles can approve inspections:
- ✅ PLANT_MANAGER
- ✅ ADMIN

Other roles will not see the menu item.

---

## 📋 How to Approve Pending Inventory

### Step 1: Access the Dashboard
1. Login as PLANT_MANAGER or ADMIN
2. Click **Quality Control** from sidebar
3. View the dashboard with:
   - **Pending Inspections** count
   - **Passed Today** count
   - **Failed Today** count
   - Table of all inspections

### Step 2: Start an Inspection
1. Find a PENDING inspection in the table
2. Click the **"Perform Inspection"** button
3. You'll be taken to the Inspection Wizard

### Step 3: Complete the 3-Step Wizard

#### 🔍 Step 1: Review Details
- Batch Number (e.g., BILL-133-26)
- Item Name
- Quantity
- Source (Purchase Receipt or Production Run)
- Click **"Next"**

#### ✅ Step 2: Perform Tests
The system shows tests based on:
- Item class (Raw Material, WIP, Finished Goods)
- Source type (Purchase or Production)

**For PASS/FAIL tests:**
- Click the green **PASS** button ✓
- Or click the red **FAIL** button ✗
- Add notes (optional)

**For NUMERIC tests:**
- Enter the measured value
- System shows if it's within acceptable range
- Green checkmark = PASS ✓
- Red X = FAIL ✗
- Add notes (optional)

All tests must be completed to proceed.

Click **"Next"**

#### 📝 Step 3: Review & Submit
- See overall result (All Passed or Some Failed)
- Review all test results
- Add overall inspector notes
- Click **"Submit Inspection"**

### Step 4: System Updates

**If ALL Tests Pass:**
- ✅ Inspection status → PASSED
- ✅ Inventory status → APPROVED
- ✅ **Inventory becomes available for production**

**If ANY Test Fails:**
- ❌ Inspection status → FAILED
- ❌ Inventory status → REJECTED
- ❌ Inventory moved to **QUARANTINE**
- ❌ **Cannot be used in production**

---

## 🔄 When Are Inspections Created?

Inspections are automatically generated when:

1. **Vendor Bill is Received**
   - System checks if the item requires QC
   - Creates pending inspection for the batch
   - Inventory blocked until approved

2. **Production Run Completes**
   - System checks if output requires QC
   - Creates pending inspection for output
   - Output blocked until approved

---

## 📊 Current Quality Tests

The system has 4 pre-configured tests:

| Test               | Type      | Applies To        | Source Type |
|--------------------|-----------|-------------------|-------------|
| Visual Inspection  | Pass/Fail | All items         | Both        |
| Weight Check       | Numeric   | Finished Goods    | Production  |
| Moisture Content   | Numeric   | Raw Materials     | Receipt     |
| Temperature Check  | Numeric   | All items         | Receipt     |

---

## 🛠️ Troubleshooting

### "No inspections found"
**Cause:** No pending inspections exist yet
**Solution:** Create a vendor bill or production run to generate inspections

### Can't see Quality Control menu
**Cause:** User role doesn't have access
**Solution:** Login as PLANT_MANAGER or ADMIN

### "Insufficient permissions" error
**Cause:** User role is not authorized
**Solution:** Only PLANT_MANAGER and ADMIN can approve QC

### Inventory still shows PENDING
**Cause:** Inspection not completed yet
**Solution:** Go to /quality and approve the inspection

---

## 📖 Full Documentation

For detailed technical documentation, see:
- `QC_APPROVAL_WORKFLOW_IMPLEMENTATION.md` - Complete implementation details
- Database queries, troubleshooting, and configuration options

---

## 🎯 Quick Test Scenario

**To test the full workflow:**

1. **Create a vendor bill** with some item quantity
2. **Go to** `/quality` page
3. **See** the pending inspection appear
4. **Click** "Perform Inspection"
5. **Complete** all three wizard steps
6. **Submit** the inspection
7. **Verify** inventory becomes APPROVED
8. **Try** using that inventory in production - should work!

---

## ✅ Implementation Status

- [x] Database schema created
- [x] 4 quality tests seeded
- [x] Server Actions implemented
- [x] Dashboard page working
- [x] Inspection wizard working
- [x] Navigation configured
- [x] Translations complete (4 languages)
- [x] Permissions enforced
- [x] Integration with vendor bills
- [x] Integration with production
- [x] Quarantine management
- [x] Server running at http://localhost:3000

**Status: 🚀 READY FOR TESTING**

---

*Last Updated: 2026-01-29*
