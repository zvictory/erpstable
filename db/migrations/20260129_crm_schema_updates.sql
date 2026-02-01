-- CRM Schema Updates: Rename fields and add activities table
-- Date: 2026-01-29
-- Description: Rename leads/opportunities tables and fields to match new spec,
--              add activities table for history tracking

-- ============================================================================
-- BACKUP RECOMMENDATION
-- ============================================================================
-- Before running this migration, create a backup:
-- cp db/data.db db/data.db.backup-20260129
-- ============================================================================

-- ============================================================================
-- PART 1: UPDATE LEADS TABLE
-- ============================================================================

-- Step 1: Rename columns in leads table
ALTER TABLE leads RENAME COLUMN full_name TO contact_name;
ALTER TABLE leads RENAME COLUMN company TO company_name;
ALTER TABLE leads RENAME COLUMN assigned_to_user_id TO owner_id;
ALTER TABLE leads RENAME COLUMN converted_to_customer_id TO converted_customer_id;

-- Step 2: Add new columns to leads
ALTER TABLE leads ADD COLUMN job_title TEXT;
ALTER TABLE leads ADD COLUMN is_converted INTEGER DEFAULT 0 NOT NULL;

-- Step 3: Populate is_converted based on existing status
UPDATE leads SET is_converted = 1 WHERE status = 'CONVERTED';
UPDATE leads SET is_converted = 0 WHERE status != 'CONVERTED';

-- Step 4: Update indexes for leads
DROP INDEX IF EXISTS leads_assigned_idx;
CREATE INDEX leads_owner_idx ON leads(owner_id);

-- ============================================================================
-- PART 2: RENAME OPPORTUNITIES TABLE TO DEALS
-- ============================================================================

-- Step 1: Create new deals table with correct schema
CREATE TABLE IF NOT EXISTS deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Core
    title TEXT NOT NULL,
    customer_id INTEGER NOT NULL REFERENCES customers(id),

    -- Financial
    value INTEGER NOT NULL,
    currency_code TEXT DEFAULT 'UZS' NOT NULL,
    probability INTEGER DEFAULT 50 NOT NULL,
    expected_close_date INTEGER,

    -- Pipeline Stage
    stage TEXT DEFAULT 'DISCOVERY' NOT NULL CHECK(stage IN ('DISCOVERY', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST')),

    -- Context
    description TEXT,
    next_action TEXT,
    lost_reason TEXT,

    -- Workflow
    owner_id INTEGER REFERENCES users(id),
    lead_id INTEGER REFERENCES leads(id),

    -- Conversion
    quote_id INTEGER,
    sales_order_id INTEGER,

    closed_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Migrate data from opportunities to deals
INSERT INTO deals (
    id,
    title,
    customer_id,
    value,
    currency_code,
    probability,
    expected_close_date,
    stage,
    description,
    next_action,
    lost_reason,
    owner_id,
    lead_id,
    quote_id,
    sales_order_id,
    closed_at,
    created_at,
    updated_at
)
SELECT
    id,
    title,
    customer_id,
    estimated_value, -- renamed to value
    'UZS', -- new field
    probability,
    expected_close_date,
    CASE
        WHEN stage = 'LEAD' THEN 'DISCOVERY'
        ELSE stage
    END, -- update LEAD stage to DISCOVERY
    description,
    next_action,
    lost_reason,
    assigned_to_user_id, -- renamed to owner_id
    lead_id,
    quote_id,
    sales_order_id,
    closed_at,
    created_at,
    updated_at
FROM opportunities;

-- Step 3: Create indexes for deals
CREATE INDEX deals_customer_idx ON deals(customer_id);
CREATE INDEX deals_stage_idx ON deals(stage);

-- Step 4: Drop old opportunities table
DROP TABLE IF EXISTS opportunities;

-- Step 5: Drop old opportunity indexes
DROP INDEX IF EXISTS opp_customer_idx;
DROP INDEX IF EXISTS opp_stage_idx;

-- ============================================================================
-- PART 3: UPDATE INVOICES TABLE
-- ============================================================================

-- Rename opportunity_id to deal_id in invoices
ALTER TABLE invoices RENAME COLUMN opportunity_id TO deal_id;

-- Update index
DROP INDEX IF EXISTS inv_opportunity_idx;
CREATE INDEX inv_deal_idx ON invoices(deal_id);

-- ============================================================================
-- PART 4: CREATE ACTIVITIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Polymorphic Entity Reference
    entity_type TEXT NOT NULL CHECK(entity_type IN ('LEAD', 'DEAL', 'CUSTOMER')),
    entity_id INTEGER NOT NULL,

    -- Activity Type and Content
    type TEXT NOT NULL CHECK(type IN ('NOTE', 'CALL', 'EMAIL', 'MEETING', 'TASK')),
    subject TEXT,
    description TEXT NOT NULL,

    -- Scheduling (for tasks/meetings)
    due_date INTEGER,
    completed_at INTEGER,

    -- Metadata
    performed_by INTEGER NOT NULL REFERENCES users(id),
    performed_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,

    created_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at INTEGER NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for activities
CREATE INDEX activities_entity_idx ON activities(entity_type, entity_id);
CREATE INDEX activities_performed_by_idx ON activities(performed_by);
CREATE INDEX activities_type_idx ON activities(type);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these after migration to verify:
-- SELECT COUNT(*) as lead_count FROM leads;
-- SELECT COUNT(*) as deal_count FROM deals;
-- SELECT COUNT(*) as converted_leads FROM leads WHERE is_converted = 1;
-- SELECT * FROM sqlite_master WHERE type='table' AND name='activities';
-- SELECT * FROM sqlite_master WHERE type='index' AND tbl_name IN ('leads', 'deals', 'activities');

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
