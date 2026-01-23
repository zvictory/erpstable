# Database Contribution Guide

## 🚨 Multi-Developer Collaboration Rules

Since we are using SQLite in a team environment, we **cannot** share the binary `.db` file. Instead, we must share the **schema** and **migrations**.

### 1. Database Setup for New Developers
When you clone the repo or pull changes, you won't have the database. To set up:

```bash
# 1. Install dependencies
npm install

# 2. Push the schema to your local SQLite DB (creates tables)
npm run db:push

# 3. Seed starter data (Users, Vendors, Settings)
npm run db:seed
```

### 2. Modifying the Schema
If you need to change the database structure (add tables, fields, etc.):

1.  **Edit the schema**: Modify files in `db/schema/`.
2.  **Generate Migration**: Run the generation command to create a SQL migration file in `drizzle/`.
    ```bash
    npm run db:generate
    ```
3.  **Commit Changes**: Commit both your schema changes AND the generated `.sql` file in `drizzle/`.
    ```bash
    git add db/schema/ drizzle/
    git commit -m "feat: added phone number to vendors"
    ```

### 3. Pulling Changes
When you pull code from others that includes DB changes:

1.  **Pull standard code**:
    ```bash
    git pull origin main
    ```
2.  **Apply Migrations**: Update your local database structure.
    ```bash
    npm run db:push
    ```
    *(Note: `db:push` syncs the schema state. For strict production migrations, we'll use `migrate` commands, but for dev `db:push` is faster).*

---
**⚠️ IMPORTANT**: Never commit `*.db`, `*.sqlite`, or `.env` files.
