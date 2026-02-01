# Timestamp NaN Error - Lessons Learned

## Key Insights from the Fix

### 1. **The Silent Failure Problem**

**Insight**: Type mismatches in databases don't fail at read time—they fail at the **serialization boundary**.

```
Database Read        Drizzle Conversion        React Serialization
================     ==================        ====================
TEXT timestamp       number parsing            ✓ Serialize
"2026-01-29..."  →   NaN (failed parse)   →   ✗ Cannot serialize NaN

                     Error: "Only finite numbers (not Infinity or NaN)
                     can be passed as arguments"
```

**Lesson**: Always validate data types at system boundaries, not just at read time. The error appears far from the root cause.

---

### 2. **SQLite vs PostgreSQL Timestamp Behavior**

**Insight**: Different databases handle `CURRENT_TIMESTAMP` differently.

| Database   | `CURRENT_TIMESTAMP` | Type    | Unix Epoch Method |
|------------|-------------------|---------|-------------------|
| SQLite     | `"2026-01-29..."` | TEXT    | `(unixepoch())`   |
| PostgreSQL | `1738170118`      | INTEGER | `now()`           |
| MySQL      | `2026-01-29...`   | DATETIME| `UNIX_TIMESTAMP()`|

**Lesson**: When switching databases or using raw SQL defaults, verify the actual data type in the database, not just the schema assumption.

---

### 3. **Schema Definition Doesn't Guarantee Data Type**

**Insight**: You can't trust `integer('created_at', { mode: 'timestamp' })` if the `default()` doesn't match.

❌ **Wrong Pattern**:
```typescript
// Schema says: integer (Unix epoch)
integer('created_at', { mode: 'timestamp' })
  .default(sql`CURRENT_TIMESTAMP`)  // But defaults to TEXT format!
```

✅ **Correct Pattern**:
```typescript
// Schema says: integer (Unix epoch)
integer('created_at', { mode: 'timestamp' })
  .default(sql`(unixepoch())`)  // Defaults to INTEGER Unix epoch
```

**Lesson**: The `default()` SQL must produce the same type as the column type. Use TypeScript runtime defaults when possible.

---

### 4. **Recursive Serialization for Nested Data**

**Insight**: ORM eager-loading returns nested objects that need recursively cleaned.

```typescript
// Single level — only fixes this
inspection.createdAt  // ← NaN fixed

// But misses this:
inspection.item.createdAt  // ← Still NaN (nested object)
inspection.results[0].test.createdAt  // ← Still NaN (nested in array)
```

**Lesson**: When sanitizing ORM results, use recursive helpers that traverse the entire object graph.

---

### 5. **The Three-Phase Fix Strategy**

**Insight**: For production bugs, implement the fix in three phases:

1. **Immediate Workaround** (~15 min)
   - Unblock users without touching persistent data
   - Use serialization helpers, transformers, or adapters
   - Allows normal operation while root cause is addressed

2. **Proper Migration** (~1 hour)
   - Fix the root cause in the database
   - Create migrations with backups
   - Verify with automated scripts

3. **Prevention** (~20 min)
   - Update all schema files to prevent recurrence
   - Add migration verification tooling
   - Document the pattern for the team

**Lesson**: Don't rush to migrate data. Unblock first, migrate safely, prevent recurrence.

---

### 6. **Database Data Types Are Constraints**

**Insight**: A TEXT value in an INTEGER column is a data constraint violation that should be caught during development.

```bash
# This should be part of your test/development workflow:
sqlite3 db/data.db "
  SELECT typeof(created_at), COUNT(*)
  FROM items
  GROUP BY typeof(created_at);
"

# Expected: one type (usually 'integer')
# If mixed: data constraint violation detected
```

**Lesson**: Add type validation checks to your schema verification tests.

---

### 7. **Drizzle's Type Safety Has Limits**

**Insight**: Drizzle provides compile-time type safety but not runtime data validation.

```typescript
// Drizzle says this returns Date
const item = await db.query.items.findFirst({ ... });
const date: Date = item.createdAt;  // ✓ TypeScript OK
const num: number = item.createdAt.getTime();  // ✓ Expected to work

// But at runtime:
item.createdAt.getTime()  // ✗ Runtime error (NaN.getTime() is invalid)
```

**Lesson**: Type-safe ORMs protect schema consistency but not data integrity. Always validate data at boundaries.

---

### 8. **Migration Scripts Are Better Than Manual SQL**

**Insight**: Generated migration scripts create an audit trail and are repeatable.

Generated from template:
```typescript
// scripts/generate-timestamp-migration.ts
// → Scans actual database
// → Finds mismatches
// → Generates migration SQL
// → Documents impact
```

Better than:
```sql
-- Manually written
UPDATE items SET created_at = strftime('%s', created_at) WHERE ...
-- Might miss tables, hard to trace origin, no audit trail
```

**Lesson**: Always generate migrations from code when possible. Humans make mistakes; scripts are systematic.

---

## Code Patterns to Prevent This

### Pattern 1: Timestamp Validation Helper
```typescript
function validateTimestamps(record: any): boolean {
  for (const [key, value] of Object.entries(record)) {
    if (key.includes('Date') || key.includes('At')) {
      if (typeof value === 'number' && !isFinite(value)) {
        console.error(`Invalid timestamp ${key}: ${value}`);
        return false;
      }
    }
  }
  return true;
}
```

### Pattern 2: Type-Safe Timestamp Fields
```typescript
// Always use function defaults to ensure type correctness
const timestampFields = {
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),  // ✓ Runtime defaults
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),  // ✓ Type-safe
};
```

### Pattern 3: Schema Migration Verification
```typescript
// Always verify migrations worked
async function verifyMigration() {
  const result = await db.execute(sql`
    SELECT COUNT(*) as text_count
    FROM items
    WHERE typeof(created_at) = 'text'
  `);

  if (result > 0) {
    throw new Error(`Migration incomplete: ${result} TEXT timestamps remain`);
  }
}
```

---

## Questions This Raised

1. **Why doesn't Drizzle validate data types on read?**
   - Performance: Type validation on every query is expensive
   - Philosophy: Drizzle trusts the database schema is correct
   - Solution: Migrate data or use runtime validation

2. **Should SQLite always use Unix timestamps?**
   - Yes, for portability and to avoid locale issues
   - TEXT timestamps create type mismatches with ORMs
   - Use `(unixepoch())` for all SQLite timestamp defaults

3. **How can we catch this in development?**
   - Schema validation tests (check that defaults match column types)
   - Type checking in tests (verify no NaN values appear)
   - Database introspection (sample data types from actual DB)

4. **Should this be in CLAUDE.md?**
   - Yes, as a documented pattern for the team
   - SQLite timestamp pattern: Always use `(unixepoch())`
   - Validation: Always check typeof before serialization

---

## Changes to CLAUDE.md (Recommended)

Add to "Common Patterns Reference" section:

```markdown
### Pattern: Correct SQLite Timestamp Defaults

**For SQLite (not PostgreSQL):**
```typescript
// ✅ CORRECT - Uses INTEGER Unix epoch
integer('created_at', { mode: 'timestamp' })
  .notNull()
  .default(sql`(unixepoch())`)

// OR with runtime default (preferred)
integer('created_at', { mode: 'timestamp' })
  .notNull()
  .$defaultFn(() => new Date())

// ❌ WRONG - Generates TEXT format, causes type mismatch
integer('created_at', { mode: 'timestamp' })
  .default(sql`CURRENT_TIMESTAMP`)
```

**Why**: SQLite's `CURRENT_TIMESTAMP` returns TEXT format like
`"2026-01-29 12:34:56"`, but the column expects INTEGER Unix epoch.
This causes Drizzle to produce NaN on read, breaking React serialization.
```

---

## Timeline of This Bug

| When | What Happened |
|------|---------------|
| **Initial Dev** | Schema created with `CURRENT_TIMESTAMP` (assumed behavior was portable) |
| **Early Testing** | No data existed yet, so no TEXT timestamps in database |
| **Production** | Seed data created using SQLite defaults (TEXT format) |
| **Feature Dev** | Quality inspection module added, loaded related items (got NaN) |
| **User Discovery** | Page crash on `/ru/quality/inspections/3` with NaN error |
| **Root Cause** | DATABASE typed check revealed mixed types (TEXT vs INTEGER) |
| **Fix** | 3-phase approach: workaround → migrate → prevent |

**Lesson**: Type mismatches hide until you have a specific data access pattern that loads related records.

---

## Recommendations Going Forward

1. **Add to CI/CD**: Database schema validation test
   - Run after migrations
   - Verify all timestamp columns are INTEGER type
   - Check that no TEXT timestamps remain

2. **Update CLAUDE.md**: Document SQLite timestamp pattern
   - Link this document
   - Show the correct pattern
   - Explain why it matters

3. **Code Review Checklist**: When reviewing schema changes
   - [ ] All `integer(...mode: 'timestamp')` columns have correct defaults?
   - [ ] No `CURRENT_TIMESTAMP` on SQLite timestamp columns?
   - [ ] Are defaults consistent across all schema files?

4. **Testing**: Add timestamp type validation
   - Sample data from database
   - Verify typeof matches schema
   - Include in test setup

---

## One-Line Summary

> **Always validate that database defaults produce the column type—schema declarations and SQL defaults must align.**

---

**Status**: Documented and committed
**Reference**: Commit a5955e4b93b88102a1e5b27c610a9e198004196f
**Duration**: ~80 minutes from diagnosis to production-ready fix
