# GEMINI_CONTEXT.md
## 🏗️ Project Passport: Stable ERP Gold Standard

> **Version:** 1.0.0
> **Last Updated:** 2026-01-27
> **Status:** ACTIVE - All new development MUST follow these standards

---

## 📋 Executive Summary

**Stable ERP** is an industrial-grade Enterprise Resource Planning system for manufacturing operations, built with modern web technologies and strict architectural standards. This document is the **single source of truth** for project architecture, patterns, and constraints.

### Project Identity
- **Name:** Stable ERP (internally: Stable-erp)
- **Domain:** Manufacturing ERP (Purchasing, Inventory, Production, Sales, Finance)
- **Target Users:** Manufacturing operations managers, accountants, warehouse staff
- **Scale:** Single-tenant SQLite deployment with multi-user support

---

## 🎯 The Stable Stack (Non-Negotiable)

### Core Technologies
```yaml
Framework: Next.js 14.1 (App Router ONLY)
  - File-based routing: app/[locale]/...
  - React Server Components by default
  - No Pages Router patterns

Database: SQLite via Drizzle ORM
  - Schema: db/schema/**/*.ts
  - Migrations: Managed via drizzle-kit
  - No raw SQL queries (use Drizzle's query builder)

Data Layer: Server Actions ONLY
  - Location: src/app/actions/**/*.ts
  - 'use server' directive at file top
  - NO API routes (app/api is forbidden)
  - NO client-side data fetching (useEffect + fetch)

Styling: Tailwind CSS 3.3
  - Design System: "Industrial Clean"
  - Base: slate-50 backgrounds
  - Component Library: Shadcn/UI (installed in src/components/ui)

Localization: next-intl (CRITICAL)
  - Messages: messages/{locale}.json
  - Default Locale: ru (Russian)
  - Supported: ru, en, uz, tr

Authentication: NextAuth 5.0 (Beta)
  - Configuration: src/app/api/auth/[...nextauth]/route.ts
  - Session management via middleware
```

### Design System: "Industrial Clean"
```css
/* Color Palette */
Background: slate-50 (#f8fafc)
Surface: white (#ffffff)
Primary Text: slate-900 (#0f172a)
Secondary Text: slate-500 (#64748b)
Borders: slate-200 (#e2e8f0)
Accent: blue-600 (#2563eb) for actionable elements
Danger: red-600 (#dc2626) for destructive actions

/* Density Philosophy */
Padding: p-4 to p-6 (compact, not spacious)
Gap: gap-4 to gap-6 (efficient spacing)
Font Size: text-sm as default (high information density)
Card Height: Minimize vertical space, maximize data per screen
```

---

## 🌍 LOCALIZATION PROTOCOL (CRITICAL)

### The Golden Rule: **English Logic, Russian Content**

This is the most important architectural constraint in the entire project.

#### ✅ CORRECT Pattern

```typescript
// ✅ LOGIC: All code, variables, types in English
// File: src/app/actions/invoices.ts
'use server';

export async function getInvoiceStatus(invoiceId: string) {
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId)
  });

  // ✅ English variable names, English enum values
  const status = invoice?.paymentStatus; // 'paid' | 'unpaid' | 'partial'
  return status;
}

// ✅ UI: Russian via next-intl keys
// File: src/components/InvoiceCard.tsx
import { useTranslations } from 'next-intl';

export function InvoiceCard({ invoice }) {
  const t = useTranslations('invoice');

  // ✅ Display Russian text from translation keys
  return (
    <div>
      <h3>{t('title')}</h3>
      <span>{t(`status.${invoice.paymentStatus}`)}</span>
    </div>
  );
}
```

#### ❌ FORBIDDEN Patterns

```typescript
// ❌ NEVER: Russian in code logic
const статус = invoice?.статусОплаты; // WRONG

// ❌ NEVER: Hardcoded UI strings (English OR Russian)
<h1>Dashboard</h1> // WRONG - must be {t('dashboard.title')}
<button>Сохранить</button> // WRONG - must be {t('common.save')}

// ❌ NEVER: Mixed language in database
await db.insert(invoices).values({
  название: "Invoice 123", // WRONG - column names must be English
  summa: 1000 // WRONG
});
```

#### Localization Checklist
- [ ] All TypeScript variables, functions, types: **English**
- [ ] All database schema columns: **English** (e.g., `customerName`, not `имяКлиента`)
- [ ] All UI strings: **Russian via `t()` function**
- [ ] All comments in code: **English**
- [ ] All console.log messages: **English**
- [ ] Translation keys structure: **`namespace.key`** (e.g., `invoice.status_paid`)

---

## 📁 Project Structure

```
/Users/zafar/Documents/Stable_next/
├── app/[locale]/                    # Next.js App Router (LOCALIZED)
│   ├── page.tsx                     # Dashboard home
│   ├── finance/
│   │   ├── accounts/[code]/         # Dynamic account detail
│   │   ├── chart-of-accounts/
│   │   └── general-ledger/
│   ├── inventory/
│   │   ├── items/[id]/              # Item detail (edit mode)
│   │   ├── items/new/               # Create new item
│   │   └── reconciliation/          # Inventory reconciliation
│   ├── purchasing/
│   │   ├── orders/[id]/
│   │   └── vendors/
│   ├── sales/
│   │   ├── invoices/[id]/
│   │   └── customers/
│   └── production/
│       ├── recipes/
│       └── wizard/
│
├── src/
│   ├── app/actions/                 # SERVER ACTIONS (Data Layer)
│   │   ├── finance.ts               # GL, accounts, journal entries
│   │   ├── inventory.ts             # Items, stock, costing
│   │   ├── purchasing.ts            # POs, bills, vendors
│   │   ├── sales.ts                 # Invoices, customers, payments
│   │   └── dashboard.ts             # Dashboard stats, KPIs
│   │
│   ├── components/                  # React Components (Presentation)
│   │   ├── ui/                      # Shadcn primitives (button, dialog, etc.)
│   │   ├── finance/                 # Domain components
│   │   ├── inventory/
│   │   ├── purchasing/
│   │   ├── sales/
│   │   ├── layout/                  # Shell, Header, Sidebar
│   │   └── shared/                  # Cross-domain components
│   │
│   └── lib/                         # Utilities (Pure Functions)
│       ├── format.ts                # formatCurrency, formatDate
│       ├── constants.ts             # Enums, config values
│       └── accounting-config.ts     # GL account mappings
│
├── db/
│   ├── schema/                      # Drizzle Schema (DATABASE)
│   │   ├── index.ts                 # Schema barrel export
│   │   ├── auth.ts                  # users, sessions
│   │   ├── business.ts              # customers, vendors, contacts
│   │   ├── inventory.ts             # items, categories, UOMs, layers
│   │   ├── finance.ts               # glAccounts, journalEntries
│   │   ├── purchasing.ts            # purchaseOrders, vendorBills
│   │   ├── sales.ts                 # invoices, customerPayments
│   │   └── production.ts            # recipes, workOrders, bomLines
│   │
│   ├── seed.ts                      # Database seeding (English)
│   ├── seed-ru.ts                   # Russian localization seed
│   └── data.db                      # SQLite database file
│
├── messages/                        # i18n TRANSLATION FILES
│   ├── ru.json                      # Russian (DEFAULT)
│   ├── en.json                      # English
│   └── uz.json                      # Uzbek
│
├── scripts/                         # Maintenance scripts
│   ├── export-data.ts
│   ├── verify-inventory-balance.ts
│   └── test-system-reset.ts
│
├── GEMINI_CONTEXT.md               # THIS FILE (Architect's Bible)
└── CLAUDE.md                        # Agent execution rules
```

---

## 🚫 THE "DO NOT" LIST

### Architecture Violations (Zero Tolerance)

1. **NO API Routes**
   ```typescript
   // ❌ FORBIDDEN: app/api/invoices/route.ts
   export async function GET() { ... }

   // ✅ REQUIRED: src/app/actions/invoices.ts
   'use server';
   export async function getInvoices() { ... }
   ```

2. **NO Client-Side Data Fetching**
   ```typescript
   // ❌ FORBIDDEN: useEffect with fetch
   useEffect(() => {
     fetch('/api/data').then(...)
   }, []);

   // ✅ REQUIRED: Server Component with Server Action
   export default async function Page() {
     const data = await getDataAction();
     return <Client data={data} />;
   }
   ```

3. **NO Raw SQL Queries**
   ```typescript
   // ❌ FORBIDDEN: Direct SQL
   db.execute("SELECT * FROM invoices WHERE status = 'paid'");

   // ✅ REQUIRED: Drizzle query builder
   await db.query.invoices.findMany({
     where: eq(invoices.status, 'paid')
   });
   ```

4. **NO Hardcoded Strings in UI**
   ```typescript
   // ❌ FORBIDDEN: English or Russian hardcoded text
   <button>Save</button>
   <h1>Панель управления</h1>

   // ✅ REQUIRED: Translation keys
   <button>{t('common.save')}</button>
   <h1>{t('dashboard.title')}</h1>
   ```

5. **NO Russian in Code Logic**
   ```typescript
   // ❌ FORBIDDEN: Cyrillic in variables/types/columns
   const товары = await db.query.items.findMany();

   // ✅ REQUIRED: English identifiers
   const items = await db.query.items.findMany();
   ```

6. **NO Untyped Data**
   ```typescript
   // ❌ FORBIDDEN: any, unknown without validation
   function processData(data: any) { ... }

   // ✅ REQUIRED: Explicit types from schema
   function processData(data: Invoice) { ... }
   ```

7. **NO Mixed Patterns**
   ```typescript
   // ❌ FORBIDDEN: Client component fetching data
   'use client';
   export default function Page() {
     const [data, setData] = useState();
     useEffect(() => { ... }, []);
   }

   // ✅ REQUIRED: Server component + client child
   export default async function Page() {
     const data = await action();
     return <ClientChild data={data} />;
   }
   ```

### Code Quality Standards

- **NO console.log in production code** (use proper error handling)
- **NO commented-out code** (use git history)
- **NO TODO comments without GitHub issue reference**
- **NO magic numbers** (use named constants)
- **NO abbreviations** (`inv` → `invoice`, `cust` → `customer`)
- **NO nested ternaries** (extract to functions)
- **NO mutations** (prefer immutable operations)

---

## 🔐 Security Standards

### Input Validation (MANDATORY)
```typescript
// ✅ All Server Actions must validate input
import { z } from 'zod';

const createInvoiceSchema = z.object({
  customerId: z.string().uuid(),
  amount: z.number().positive(),
  dueDate: z.date()
});

export async function createInvoice(input: unknown) {
  const validated = createInvoiceSchema.parse(input); // Throws if invalid
  // ... proceed with validated data
}
```

### Authentication Checks
```typescript
// ✅ All protected actions must check auth
import { auth } from '@/lib/auth';

export async function deleteInvoice(id: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  // ... proceed
}
```

### SQL Injection Prevention
```typescript
// ✅ ALWAYS use parameterized queries via Drizzle
await db.query.items.findMany({
  where: eq(items.name, userInput) // Safe - parameterized
});

// ❌ NEVER concatenate SQL strings
await db.execute(`SELECT * FROM items WHERE name = '${userInput}'`); // DANGEROUS
```

---

## 📊 Data Flow Pattern

```
User Interaction (Browser)
         ↓
React Component ('use client' if interactive)
         ↓
Server Action Call (async/await)
         ↓
src/app/actions/*.ts ('use server')
         ↓
Drizzle ORM Query
         ↓
SQLite Database (db/data.db)
         ↓
Return Data (serializable JSON)
         ↓
Component Render (with t() for UI text)
```

### Example: Complete Flow

```typescript
// 1. DATABASE SCHEMA (db/schema/sales.ts)
export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull(),
  totalAmount: integer('total_amount').notNull(), // in Tiyin
  status: text('status').notNull(), // 'draft' | 'sent' | 'paid'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// 2. SERVER ACTION (src/app/actions/sales.ts)
'use server';

export async function getInvoices() {
  const results = await db.query.invoices.findMany({
    with: { customer: true },
    orderBy: desc(invoices.createdAt)
  });
  return results;
}

// 3. SERVER COMPONENT (app/[locale]/sales/invoices/page.tsx)
import { getInvoices } from '@/app/actions/sales';
import { InvoiceList } from '@/components/sales/InvoiceList';

export default async function InvoicesPage() {
  const invoices = await getInvoices(); // Direct call - no useEffect
  return <InvoiceList invoices={invoices} />;
}

// 4. CLIENT COMPONENT (src/components/sales/InvoiceList.tsx)
'use client';
import { useTranslations } from 'next-intl';

export function InvoiceList({ invoices }) {
  const t = useTranslations('invoice');

  return (
    <div>
      <h2>{t('list_title')}</h2>
      {invoices.map(inv => (
        <div key={inv.id}>
          <span>{t(`status.${inv.status}`)}</span>
        </div>
      ))}
    </div>
  );
}

// 5. TRANSLATION FILE (messages/ru.json)
{
  "invoice": {
    "list_title": "Счета на оплату",
    "status": {
      "draft": "Черновик",
      "sent": "Отправлено",
      "paid": "Оплачено"
    }
  }
}
```

---

## 🔄 Workflow: Context-First Development

### Roles
1. **Gemini 3.0 (Architect)** - YOU
   - Writes specifications
   - Designs data models
   - Reviews architecture
   - Generates GEMINI_CONTEXT.md

2. **Claude Code (Builder)**
   - Executes implementations
   - Follows CLAUDE.md rules
   - Creates commits
   - Runs tests

3. **Antigravity (Editor)**
   - Polishes UI/UX
   - Refines styling
   - Fixes minor bugs

### Development Phases
```
1. SPECIFICATION (Gemini)
   ↓ Write clear requirements
   ↓ Define data models
   ↓ Specify API contracts

2. IMPLEMENTATION (Claude Code)
   ↓ Create schema migrations
   ↓ Build Server Actions
   ↓ Implement components

3. POLISH (Antigravity)
   ↓ Refine styling
   ↓ Improve UX
   ↓ Fix edge cases
```

---

## 📈 Performance Standards

- **Server Component First:** Default to RSC, only 'use client' when necessary
- **Database Queries:** Use Drizzle's `with` for eager loading (avoid N+1)
- **Image Optimization:** Use Next.js `<Image>` component
- **Bundle Size:** Keep client JS < 100KB per route
- **Caching:** Leverage Next.js fetch cache and React cache()

---

## 🧪 Testing Standards

- **E2E Tests:** Playwright (e2e/simulation.ts)
- **Unit Tests:** Jest (for utilities and pure functions)
- **Integration Tests:** Test Server Actions with in-memory DB
- **Coverage Target:** 80% for business logic

---

## 📝 Commit Standards

```
feat: Add invoice payment recording
fix: Correct inventory layer FIFO calculation
refactor: Extract account balance logic to utility
docs: Update localization protocol
test: Add E2E test for purchase order approval
chore: Update dependencies
```

---

## 🎓 Key Principles

1. **Simplicity Over Cleverness:** Readable code beats "clever" code
2. **Type Safety:** TypeScript strict mode, no `any` escapes
3. **Separation of Concerns:** Data (actions) ≠ Presentation (components)
4. **Immutability:** Avoid mutations, use spread operators
5. **Error Handling:** Explicit error types, no silent failures
6. **Accessibility:** Semantic HTML, ARIA labels, keyboard navigation

---

## 🔗 Critical Dependencies

```json
{
  "next": "14.1.0",
  "drizzle-orm": "^0.29.3",
  "next-intl": "^4.7.0",
  "next-auth": "5.0.0-beta.15",
  "zod": "^3.22.4",
  "lucide-react": "^0.330.0"
}
```

---

## 📞 When in Doubt

1. Check this document first
2. Review existing patterns in codebase
3. Consult with architect (Gemini)
4. Never improvise core architecture

---

**END OF GEMINI_CONTEXT.md**
