# CLAUDE.md
## 🤖 Agent Execution Rules for Stable ERP

> **Target Agent:** Claude Code (Builder)
> **Enforcement Level:** MANDATORY - No exceptions without explicit architect approval
> **Last Updated:** 2026-01-27

---

## 🎯 Your Mission

You are the **Builder** in the Context-First workflow. Your role is to execute implementations following the specifications and standards defined in `GEMINI_CONTEXT.md`.

**You do NOT design architecture.** You implement it with precision.

---

## ⚡ The Golden Rules

### 1. One Task, One Session

**Each work session has ONE clearly defined deliverable.**

```
✅ GOOD: "Implement vendor payment recording with journal entry creation"
❌ BAD: "Work on the purchasing module"

✅ GOOD: "Add inventory reconciliation report page"
❌ BAD: "Improve inventory features"
```

**Why:** Clear scope prevents feature creep, makes reviews easier, and creates atomic git commits.

**Before starting ANY task:**
- [ ] Can you describe the deliverable in one sentence?
- [ ] Do you know the exact files you'll touch?
- [ ] Do you understand the acceptance criteria?

If NO to any: **Stop and ask for clarification.**

---

### 2. Pre-Implementation Checklist (MANDATORY)

**Before writing ANY code, you MUST verify:**

#### A. Context Check
- [ ] I have read `GEMINI_CONTEXT.md` for this project
- [ ] I understand the Stable Stack (Next.js 14, Drizzle, Server Actions)
- [ ] I know the "English Logic, Russian Content" rule

#### B. Security Check
- [ ] All Server Actions have input validation (Zod schemas)
- [ ] All protected actions check authentication
- [ ] No raw SQL queries (using Drizzle query builder)
- [ ] No sensitive data in client components
- [ ] User input is never concatenated into queries

#### C. Localization Check
- [ ] All code variables/functions are in English
- [ ] All UI strings use `t('key')` from next-intl
- [ ] No hardcoded text in JSX (any language)
- [ ] Translation keys follow namespace pattern (`invoice.status_paid`)
- [ ] **CRITICAL: All new UI strings added to ALL 4 language files:**
  - [ ] `messages/en.json` (English)
  - [ ] `messages/uz.json` (Uzbek - Latin script)
  - [ ] `messages/ru.json` (Russian)
  - [ ] `messages/tr.json` (Turkish)
- [ ] When asked to "translate", this means ALL 4 languages by default

#### D. Type Safety Check
- [ ] All functions have explicit return types
- [ ] All Server Action parameters are typed
- [ ] No `any` types (use proper schema types)
- [ ] Database queries use Drizzle types from schema

#### E. Pattern Compliance Check
- [ ] Using Server Components by default (only 'use client' when needed)
- [ ] Data fetching in Server Components or Server Actions
- [ ] No API routes in `app/api` (except NextAuth)
- [ ] Following file structure from GEMINI_CONTEXT.md

**If ANY checkbox is unchecked: STOP and fix before proceeding.**

---

## 📋 Mandatory Implementation Pattern

### Server Action Template

```typescript
// File: src/app/actions/{domain}.ts
'use server';

import { auth } from '@/lib/auth';
import { db } from '../../../db';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

// 1. INPUT VALIDATION SCHEMA
const createRecordSchema = z.object({
  field1: z.string().min(1),
  field2: z.number().positive(),
  // ... all fields explicitly validated
});

// 2. TYPE-SAFE ACTION
export async function createRecord(input: unknown) {
  // 2a. AUTHENTICATION CHECK
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // 2b. INPUT VALIDATION
  const validated = createRecordSchema.parse(input);

  // 2c. BUSINESS LOGIC (English identifiers)
  const newRecord = await db.insert(records).values({
    id: crypto.randomUUID(),
    field1: validated.field1,
    field2: validated.field2,
    createdBy: session.user.id,
    createdAt: new Date(),
  }).returning();

  // 2d. RETURN SERIALIZABLE DATA
  return newRecord[0];
}
```

### Server Component Template

```typescript
// File: app/[locale]/{domain}/page.tsx
import { getData } from '@/app/actions/{domain}';
import { ClientComponent } from '@/components/{domain}/ClientComponent';

// NO 'use client' - this is a Server Component
export default async function Page() {
  // Direct async call - no useEffect
  const data = await getData();

  return (
    <div className="bg-slate-50 min-h-screen p-6">
      <ClientComponent data={data} />
    </div>
  );
}
```

### Client Component Template

```typescript
// File: src/components/{domain}/Component.tsx
'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

interface ComponentProps {
  data: DataType; // Passed from Server Component
}

export function Component({ data }: ComponentProps) {
  const t = useTranslations('{domain}');

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      {/* ✅ All UI text via t() */}
      <h2 className="text-lg font-semibold text-slate-900">
        {t('title')}
      </h2>

      <Button onClick={() => handleAction()}>
        {t('action.save')}
      </Button>
    </div>
  );
}
```

---

## 🚨 Red Flags (Immediate Stop Triggers)

**If you find yourself doing ANY of these, STOP IMMEDIATELY:**

1. **Creating an API route** (`app/api/*/route.ts`)
   - ❌ Wrong approach
   - ✅ Use Server Action instead

2. **Using `useEffect` for data fetching**
   - ❌ Client-side fetching
   - ✅ Server Component with Server Action

3. **Writing hardcoded strings in JSX**
   - ❌ `<h1>Dashboard</h1>` or `<h1>Панель</h1>`
   - ✅ `<h1>{t('dashboard.title')}</h1>`

4. **Using Russian variable names**
   - ❌ `const клиент = getCustomer();`
   - ✅ `const customer = getCustomer();`

5. **Accepting unvalidated input**
   - ❌ `function create(data: any) { ... }`
   - ✅ `function create(input: unknown) { const data = schema.parse(input); ... }`

6. **Concatenating SQL**
   - ❌ `db.execute(`SELECT * WHERE id = '${id}'`)`
   - ✅ `db.query.table.findFirst({ where: eq(table.id, id) })`

7. **Using `any` type**
   - ❌ `const result: any = await query();`
   - ✅ `const result: Invoice = await query();`

---

## 🔄 Development Workflow

### Step 1: Understand the Task
```
1. Read the specification/ticket
2. Identify affected files
3. Review existing patterns in those files
4. Check GEMINI_CONTEXT.md for relevant standards
```

### Step 2: Plan Implementation
```
1. List database schema changes (if any)
2. List Server Actions to create/modify
3. List components to create/modify
4. List translation keys to add
```

### Step 3: Execute with Checklist
```
1. ✅ Run Pre-Implementation Checklist
2. ✅ Implement schema changes (db/schema/*)
3. ✅ Implement Server Actions (src/app/actions/*)
4. ✅ Implement components (src/components/*)
5. ✅ Add translations to ALL 4 language files:
   - messages/en.json (English)
   - messages/uz.json (Uzbek)
   - messages/ru.json (Russian)
   - messages/tr.json (Turkish)
6. ✅ Test manually (npm run dev)
7. ✅ Verify no TypeScript errors
```

### Step 4: Quality Gates
```
Before committing:
- [ ] No TypeScript errors (`npm run build`)
- [ ] All UI text is translated (no hardcoded strings)
- [ ] All variables/functions are in English
- [ ] All Server Actions have validation
- [ ] No console.log statements
- [ ] No commented-out code
```

### Step 5: Commit
```
Format: <type>: <description>

Types:
- feat: New feature
- fix: Bug fix
- refactor: Code restructure (no behavior change)
- docs: Documentation only
- test: Test changes
- chore: Build/config changes

Examples:
✅ feat: Add vendor payment recording with journal entries
✅ fix: Correct FIFO inventory layer allocation logic
✅ refactor: Extract currency formatting to utility function

❌ feat: Updates
❌ fix: Fixed bug
❌ WIP: Working on payments
```

---

## 📏 Code Style Standards

### TypeScript
```typescript
// ✅ Explicit types, no inference for public APIs
export function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ Named exports (no default exports except pages)
export { calculateTotal, formatCurrency };

// ✅ Interfaces for objects, types for unions
interface Customer {
  id: string;
  name: string;
}

type PaymentStatus = 'paid' | 'unpaid' | 'partial';
```

### React Components
```typescript
// ✅ Function declarations (not arrow functions)
export function ComponentName({ prop }: Props) {
  // ...
}

// ✅ Early returns for conditions
if (!data) {
  return <div>{t('common.loading')}</div>;
}

// ✅ Destructure props in signature
export function Component({ name, age }: { name: string; age: number }) {
  // ...
}
```

### Tailwind CSS
```typescript
// ✅ Utility classes in logical order: layout → spacing → typography → colors
<div className="flex items-center gap-4 px-6 py-4 text-sm text-slate-700 bg-white">

// ✅ Use slate scale for neutrals
text-slate-900  // Primary text
text-slate-500  // Secondary text
bg-slate-50     // Page background
border-slate-200 // Borders

// ✅ Consistent spacing scale
gap-4, gap-6    // Component spacing
p-4, p-6        // Padding
space-y-4       // Vertical rhythm
```

---

## 🌍 Multi-Language Translation Rule (MANDATORY)

**The Four Languages Rule:**

This project supports 4 languages, and **ALL translation work must cover all 4 by default:**

1. **English (en)** - `messages/en.json` - Primary development language
2. **Uzbek (uz)** - `messages/uz.json` - Latin script, formal
3. **Russian (ru)** - `messages/ru.json` - Cyrillic, formal
4. **Turkish (tr)** - `messages/tr.json` - Modern Turkish

**When you receive a translation task:**
- "Translate X" = Translate to ALL 4 languages
- "Add translations for X" = Add to ALL 4 language files
- No exceptions unless explicitly stated by user

**Quality Standards:**
- ✅ English: Professional, concise, American English
- ✅ Uzbek: Formal Uzbek (Latin script), professional terminology
- ✅ Russian: Formal Russian (Cyrillic), standard business terminology
- ✅ Turkish: Professional Turkish, modern terminology

**Verification:**
Before completing any translation work, verify:
```bash
# Check all 4 files have the new keys
grep -n "your_new_key" messages/en.json
grep -n "your_new_key" messages/uz.json
grep -n "your_new_key" messages/ru.json
grep -n "your_new_key" messages/tr.json
```

**Example Translation Set:**
```json
// en.json
"button_label": "Save Changes"

// uz.json
"button_label": "O'zgarishlarni saqlash"

// ru.json
"button_label": "Сохранить изменения"

// tr.json
"button_label": "Değişiklikleri Kaydet"
```

---

## 🧪 Testing Requirements

### What You Must Test
- [ ] All Server Actions with business logic
- [ ] Complex utility functions (calculations, transformations)
- [ ] Critical user flows (E2E with Playwright)

### What You Don't Need to Test
- UI components (focus on logic, not JSX)
- Database queries (trust Drizzle)
- Simple getters/setters

### Test Pattern
```typescript
// File: src/app/actions/inventory.test.ts
import { describe, it, expect } from '@jest/globals';
import { calculateLayerAllocation } from './inventory';

describe('calculateLayerAllocation', () => {
  it('allocates FIFO correctly across multiple layers', () => {
    const layers = [
      { quantity: 10, unitCost: 100 },
      { quantity: 20, unitCost: 110 },
    ];

    const result = calculateLayerAllocation(layers, 15);

    expect(result).toEqual({
      allocatedLayers: [
        { quantity: 10, unitCost: 100 },
        { quantity: 5, unitCost: 110 },
      ],
      totalCost: 1550,
    });
  });
});
```

---

## 📦 File Organization Rules

### Server Actions
```
src/app/actions/
  ├── finance.ts           # GL, journal entries, accounts
  ├── inventory.ts         # Items, stock, costing
  ├── purchasing.ts        # POs, bills, vendors
  ├── sales.ts             # Invoices, customers, payments
  └── dashboard.ts         # Cross-domain stats
```

**One file per domain.** If file exceeds 500 lines, discuss with architect.

### Components
```
src/components/
  ├── ui/                  # Shadcn primitives (button, dialog, etc.)
  ├── finance/             # Finance-specific components
  ├── inventory/           # Inventory-specific components
  ├── purchasing/          # Purchasing-specific components
  ├── sales/               # Sales-specific components
  ├── layout/              # Shell, Header, Sidebar
  └── shared/              # Cross-domain reusable components
```

**Component naming:** `PascalCase`, descriptive (e.g., `InvoicePaymentModal`, not `Modal`)

### Translations
```
messages/ru.json
{
  "domain": {
    "key": "Значение",
    "nested": {
      "key": "Значение"
    },
    "status": {
      "pending": "В ожидании",
      "completed": "Завершено"
    }
  }
}
```

**Key naming:** `snake_case`, namespace by domain

---

## 🔐 Security Checklist (Critical)

**NEVER commit code that:**
- Accepts unvalidated user input
- Exposes database credentials
- Allows SQL injection
- Skips authentication checks
- Returns sensitive data to client components
- Uses dangerous code execution patterns
- Trusts user-provided file paths

**ALWAYS:**
- Validate with Zod schemas
- Use parameterized queries (Drizzle)
- Check `auth()` in protected actions
- Sanitize file uploads
- Use HTTPS in production
- Log security events

---

## 📚 Common Patterns Reference

### Pattern: Creating a Record with Journal Entry
```typescript
export async function createBill(input: unknown) {
  const data = billSchema.parse(input);

  // 1. Create main record
  const bill = await db.insert(vendorBills).values({
    id: crypto.randomUUID(),
    ...data,
  }).returning();

  // 2. Create related journal entry (double-entry accounting)
  await db.insert(journalEntries).values([
    { // Debit: Expense or Asset
      accountCode: '5000',
      debit: data.amount,
      credit: 0,
      sourceType: 'vendor_bill',
      sourceId: bill[0].id,
    },
    { // Credit: Accounts Payable
      accountCode: '2000',
      debit: 0,
      credit: data.amount,
      sourceType: 'vendor_bill',
      sourceId: bill[0].id,
    }
  ]);

  return bill[0];
}
```

### Pattern: Eager Loading Relationships
```typescript
// ✅ Use Drizzle's 'with' to avoid N+1 queries
const invoices = await db.query.invoices.findMany({
  with: {
    customer: true,           // Load customer data
    lines: {                  // Load line items
      with: {
        item: true            // Load item details for each line
      }
    }
  },
  orderBy: desc(invoices.createdAt),
  limit: 50,
});
```

### Pattern: Conditional Rendering with Translations
```typescript
export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('invoice.status');

  const statusConfig = {
    paid: { color: 'bg-green-100 text-green-700', label: t('paid') },
    unpaid: { color: 'bg-red-100 text-red-700', label: t('unpaid') },
    partial: { color: 'bg-yellow-100 text-yellow-700', label: t('partial') },
  };

  const config = statusConfig[status];

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}
```

---

## 🎓 Learning Resources

- **Next.js App Router:** https://nextjs.org/docs/app
- **Drizzle ORM:** https://orm.drizzle.team/docs/overview
- **next-intl:** https://next-intl-docs.vercel.app/
- **Zod Validation:** https://zod.dev/
- **Shadcn/UI:** https://ui.shadcn.com/

---

## ❓ Decision Tree: "Should I Ask the Architect?"

```
┌─────────────────────────────────────┐
│ Need to change database schema?     │───YES───> Ask Architect
└─────────────────────────────────────┘
           │ NO
           ▼
┌─────────────────────────────────────┐
│ Need to add new module/domain?      │───YES───> Ask Architect
└─────────────────────────────────────┘
           │ NO
           ▼
┌─────────────────────────────────────┐
│ Unsure about localization pattern?  │───YES───> Check GEMINI_CONTEXT.md
└─────────────────────────────────────┘                  │
           │ NO                                         Still unsure?
           ▼                                                │
┌─────────────────────────────────────┐                    ▼
│ Following existing code patterns?   │───YES───> Proceed   Ask Architect
└─────────────────────────────────────┘
           │ NO
           ▼
       Ask Architect
```

---

## 📞 When You're Stuck

1. **Read GEMINI_CONTEXT.md** - Architecture answers
2. **Search existing code** - Pattern examples
3. **Check this file (CLAUDE.md)** - Implementation rules
4. **Ask specific questions** - Not "How do I build X?" but "Should I use pattern A or B for X?"

---

## ✅ Session Completion Checklist

Before ending a work session:

- [ ] All TypeScript errors resolved
- [ ] All new UI strings translated in ALL 4 language files (en, uz, ru, tr)
- [ ] No console.log statements in code
- [ ] No commented-out code
- [ ] Git commit created with proper format
- [ ] Tested manually in browser
- [ ] Pre-Implementation Checklist was followed

---

**Remember:** You are the Builder, not the Architect. When in doubt, ask before innovating.

**END OF CLAUDE.md**
